'use client';
import React, { Suspense, useRef, useState, useCallback, useEffect, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { LazyOrbitControls, LazyEnvironment, preloadAllControls } from './three/LazyControls';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useEditorStore } from '@/store/editorStore';
import RoomMesh from './three/RoomMesh';
import FurnitureMesh from './three/FurnitureMesh';
import type { TransformMode } from './three/FurnitureMesh';
import Lights from './three/Lights';
import CeilingLightingSystem from './three/CeilingLightingSystem';
import { updateSceneLOD } from '@/utils/three/GeometryOptimizer';
import { Move, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import ControlsHint from './ControlsHint';
import { PerformanceMonitor } from '@/lib/performance/PerformanceMonitor';
import { FrustumCuller } from '@/lib/culling/FrustumCuller';
import { QualityManager, type QualityLevel } from '@/lib/quality/QualityManager';
import { RendererOptimizer } from '@/lib/three/RendererOptimizer';
import { deviceDetector } from '@/lib/performance/DeviceDetector';
import PerformanceDashboard from '@/components/debug/PerformanceDashboard';
import LowEndDeviceNotification from './LowEndDeviceNotification';
import DevConsole from '@/components/debug/DevConsole';
import LoadingScreen from './LoadingScreen';
import * as THREE from 'three';

/**
 * LODUpdater component
 * 
 * Updates all LOD objects in the scene based on camera position.
 * This should be called every frame to ensure LOD objects switch
 * detail levels appropriately as the camera moves.
 * 
 * Requirements: 1.5, 2.5, 3.5
 */
function LODUpdater() {
  const { scene, camera } = useThree();

  useFrame(() => {
    // Update all LOD objects in the scene based on camera position
    updateSceneLOD(scene, camera);
  });

  return null;
}

/**
 * GLContextDisposer
 *
 * Hard-release WebGL context saat Canvas spesifik ini unmount.
 * Browser limit ~16 active WebGL contexts; tanpa cleanup, remount via
 * canvasKey (saat quality change) atau navigasi step bikin context pile up
 * → "Too many active WebGL contexts" → context oldest hilang → model lost.
 *
 * Pakai child di dalam <Canvas> supaya gl instance ke-capture per-canvas
 * (gak ada race condition dengan ref di parent).
 */
function GLContextDisposer() {
  const { gl } = useThree();
  useEffect(() => {
    return () => {
      try {
        const ext = gl.getContext().getExtension('WEBGL_lose_context');
        ext?.loseContext();
        gl.dispose();
      } catch (err) {
        console.warn('[Canvas3D] GL cleanup error:', err);
      }
    };
  }, [gl]);
  return null;
}

/**
 * FrustumCullingUpdater component
 * 
 * Performs frustum culling on scene objects to skip rendering objects outside viewport.
 * Updates every N frames (configurable) to reduce overhead while maintaining performance.
 * Integrates with PerformanceMonitor to track culling statistics.
 * 
 * Requirements: 1.8, 1.9
 */
interface FrustumCullingUpdaterProps {
  culler: FrustumCuller;
  performanceMonitor: PerformanceMonitor;
}

function FrustumCullingUpdater({ culler, performanceMonitor }: FrustumCullingUpdaterProps) {
  const { scene, camera } = useThree();
  
  useFrame(() => {
    // Perform frustum culling (only updates every N frames based on config)
    const didCull = culler.cullScene(scene, camera);
    
    // Track culling stats in performance monitor
    if (didCull) {
      const stats = culler.getStats();
      
      // Log culling stats for monitoring
      if (stats.totalObjects > 0) {
        const efficiency = culler.getCullingEfficiency();
        
        // Log to console in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[FrustumCulling] Total: ${stats.totalObjects}, Visible: ${stats.visibleObjects}, ` +
            `Culled: ${stats.culledObjects} (${efficiency.toFixed(1)}%), Time: ${stats.cullingTime.toFixed(2)}ms`
          );
        }
      }
    }
  });
  
  return null;
}

/**
 * PerformanceTracker component
 * 
 * Tracks FPS and render stats on every render frame by calling updateFPS() and updateRenderStats() in useFrame hook.
 * This integrates PerformanceMonitor with React Three Fiber's render loop.
 * 
 * Requirements: 10.1, 10.2
 */
interface PerformanceTrackerProps {
  monitor: PerformanceMonitor;
}

function PerformanceTracker({ monitor }: PerformanceTrackerProps) {
  const { gl } = useThree();
  
  useFrame(() => {
    // Update FPS on each render frame
    monitor.updateFPS();
    
    // Update render stats from Three.js renderer
    monitor.updateRenderStats(gl);
  });
  
  return null;
}

/**
 * QualitySettingsApplier component
 * 
 * Applies quality settings from QualityManager to Three.js renderer and scene.
 * Updates shadow map resolution, pixel ratio, and other renderer settings.
 * 
 * Requirements: 12.2, 12.3, 12.4
 */
interface QualitySettingsApplierProps {
  qualityManager: QualityManager;
}

function QualitySettingsApplier({ qualityManager }: QualitySettingsApplierProps) {
  const { gl, scene } = useThree();
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>(qualityManager.getQuality());

  useEffect(() => {
    // Apply quality settings to renderer
    const applySettings = () => {
      const settings = qualityManager.getSettings();
      const quality = qualityManager.getQuality();

      // Update shadow map settings
      if (settings.shadows.enabled) {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFShadowMap;
        
        // Update shadow map resolution
        scene.traverse((object) => {
          if (
            (object instanceof THREE.DirectionalLight || 
             object instanceof THREE.SpotLight || 
             object instanceof THREE.PointLight) && 
            object.shadow
          ) {
            object.shadow.mapSize.width = settings.shadows.resolution;
            object.shadow.mapSize.height = settings.shadows.resolution;
            object.shadow.map?.dispose();
            object.shadow.map = null;
          }
        });
      } else {
        gl.shadowMap.enabled = false;
      }

      // Update pixel ratio based on quality
      let pixelRatio = window.devicePixelRatio || 1;
      if (quality === 'LOW') {
        pixelRatio = Math.min(pixelRatio, 1.0);
      } else if (quality === 'MEDIUM') {
        pixelRatio = Math.min(pixelRatio, 1.5);
      } else if (quality === 'HIGH') {
        pixelRatio = Math.min(pixelRatio, 1.5);
      } else if (quality === 'ULTRA') {
        pixelRatio = Math.min(pixelRatio, 2.0);
      }
      gl.setPixelRatio(pixelRatio);

      // Update tone mapping and color space
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
      gl.outputColorSpace = THREE.SRGBColorSpace;

      console.log(`[QualitySettingsApplier] Applied ${quality} quality settings:`, {
        shadows: settings.shadows,
        pixelRatio,
        antialiasing: settings.antialiasing,
      });

      setCurrentQuality(quality);
    };

    applySettings();

    // Listen for quality changes
    const checkQualityChange = setInterval(() => {
      const newQuality = qualityManager.getQuality();
      if (newQuality !== currentQuality) {
        console.log(`[QualitySettingsApplier] Quality changed from ${currentQuality} to ${newQuality}`);
        applySettings();
      }
    }, 1000);

    return () => {
      clearInterval(checkQualityChange);
    };
  }, [gl, scene, qualityManager, currentQuality]);

  return null;
}

interface SceneProps {
  orbitRef: React.RefObject<OrbitControlsImpl | null>;
  transformMode: TransformMode;
  onDragStart: () => void;
  onDragEnd: () => void;
  performanceMonitor: PerformanceMonitor;
  frustumCuller: FrustumCuller;
  qualityManager: QualityManager;
  rendererOptimizer: RendererOptimizer;
}

/**
 * Scene component - Memoized to prevent unnecessary re-renders
 * 
 * Re-renders only when:
 * - items array changes (furniture added/removed/updated)
 * - roomConfig changes (dimensions, floor, walls)
 * - timeOfDay changes (day/night mode)
 * - transformMode changes (translate/rotate)
 * 
 * Props like callbacks (onDragStart, onDragEnd) are memoized in parent
 * to prevent breaking memoization.
 * 
 * Requirements: 13.1, 13.2
 */
const Scene = memo(function Scene({ orbitRef, transformMode, onDragStart, onDragEnd, performanceMonitor, frustumCuller, qualityManager, rendererOptimizer }: SceneProps) {
  const { items, roomConfig, timeOfDay } = useEditorStore();
  const { scene } = useThree();

  // Apply renderer optimizations when scene changes
  useEffect(() => {
    if (scene) {
      // Optimize scene (limit shadow-casting lights and texture resolutions)
      rendererOptimizer.optimizeScene(scene);
    }
  }, [scene, rendererOptimizer, items.length]); // Re-run when items change

  return (
    <>
      <Lights />
      {/* Lazy-loaded Environment - reduces initial bundle size */}
      <LazyEnvironment preset={timeOfDay === 'night' ? 'night' : 'apartment'} />
      {/* OutdoorEnvironment now lazy-loaded within RoomMesh */}
      {/* <CeilingLightingSystem /> */}
      <RoomMesh />
      {items.map((item) => (
        <FurnitureMesh
          key={item.id}
          item={item}
          transformMode={transformMode}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
      {/* Lazy-loaded OrbitControls - reduces initial bundle size */}
      <LazyOrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={Math.max(roomConfig.width, roomConfig.depth) * 2.5}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={[0, 0.5, 0]}
      />
      {/* Update LOD objects every frame based on camera position */}
      <LODUpdater />
      {/* Track FPS on every render frame */}
      <PerformanceTracker monitor={performanceMonitor} />
      {/* Perform frustum culling to skip rendering objects outside viewport */}
      <FrustumCullingUpdater culler={frustumCuller} performanceMonitor={performanceMonitor} />
      {/* Apply quality settings to renderer and scene */}
      <QualitySettingsApplier qualityManager={qualityManager} />
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  // Return true if props are equal (skip re-render)
  // Return false if props changed (re-render)
  
  const prevStore = useEditorStore.getState();
  const nextStore = useEditorStore.getState();
  
  // Check if items array changed (reference equality is sufficient for Zustand)
  const itemsEqual = prevStore.items === nextStore.items;
  
  // Check if roomConfig changed
  const roomConfigEqual = prevStore.roomConfig === nextStore.roomConfig;
  
  // Check if timeOfDay changed
  const timeOfDayEqual = prevStore.timeOfDay === nextStore.timeOfDay;
  
  // Check if transformMode changed
  const transformModeEqual = prevProps.transformMode === nextProps.transformMode;
  
  // Skip re-render if all essential props are equal
  return itemsEqual && roomConfigEqual && timeOfDayEqual && transformModeEqual;
});

Scene.displayName = 'Scene';

/**
 * Canvas3D component - Main 3D canvas wrapper
 * 
 * Memoization strategy:
 * - Scene component is memoized to prevent unnecessary re-renders
 * - Callbacks (disableOrbit, enableOrbit) are memoized with useCallback
 * - These memoized callbacks are passed to child components to maintain their memoization
 * 
 * Props that trigger re-renders:
 * - selectedItemId: Controls transform mode visibility
 * - timeOfDay: Controls day/night rendering
 * - transformMode: Controls translate/rotate mode
 * 
 * Requirements: 13.1, 13.2, 13.8
 */
export default function Canvas3D() {
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const frustumCullerRef = useRef<FrustumCuller | null>(null);
  const qualityManagerRef = useRef<QualityManager | null>(null);
  const rendererOptimizerRef = useRef<RendererOptimizer | null>(null);

  // Cleanup WebGL context ditangani <GLContextDisposer /> di dalam <Canvas>.
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [canvasKey, setCanvasKey] = useState(0); // Key to force Canvas remount when quality changes
  const [showLowEndNotification, setShowLowEndNotification] = useState(false);
  const [isRendering, setIsRendering] = useState(true); // Loading state for 3D render
  const [loadingProgress, setLoadingProgress] = useState(0); // Loading progress 0-100
  const [loadingMessage, setLoadingMessage] = useState('Memuat tampilan 3D...'); // Loading message
  const [refsReady, setRefsReady] = useState(false); // Track if all refs are initialized
  
  // Store ref values in state to avoid accessing .current during render
  const [performanceMonitor, setPerformanceMonitor] = useState<PerformanceMonitor | null>(null);
  const [frustumCuller, setFrustumCuller] = useState<FrustumCuller | null>(null);
  const [qualityManager, setQualityManager] = useState<QualityManager | null>(null);
  const [rendererOptimizer, setRendererOptimizer] = useState<RendererOptimizer | null>(null);
  
  const { selectedItemId, timeOfDay, setTimeOfDay } = useEditorStore();
  const isNight = timeOfDay === 'night';

  // Initialize PerformanceMonitor, FrustumCuller, QualityManager, and RendererOptimizer on mount
  useEffect(() => {
    console.log('[Canvas3D] Initializing...');
    
    // Start loading progress simulation
    setLoadingProgress(10);
    setLoadingMessage('Menginisialisasi sistem...');
    
    // Create PerformanceMonitor instance
    const monitor = new PerformanceMonitor({
      enableFPSTracking: true,
      enableMemoryTracking: true,
      enableAPITracking: false, // API tracking handled elsewhere
      fpsWarningThreshold: 30,
      memoryWarningThreshold: 80,
      apiLatencyWarningThreshold: 2000,
      logInterval: 10000, // Log every 10 seconds
    });

    performanceMonitorRef.current = monitor;
    setPerformanceMonitor(monitor);
    console.log('[Canvas3D] PerformanceMonitor created');
    setLoadingProgress(20);
    setLoadingMessage('Memuat kontrol 3D...');

    // Preload heavy Three.js controls after initial render
    // This reduces initial bundle size while ensuring controls are ready when needed
    // Requirements: 9.3, 9.5, 9.10
    const preloadTimer = setTimeout(() => {
      preloadAllControls().then(() => {
        console.log('[Canvas3D] Heavy Three.js controls preloaded successfully');
        setLoadingProgress(40);
        setLoadingMessage('Mengoptimalkan performa...');
      }).catch((error) => {
        console.error('[Canvas3D] Failed to preload controls:', error);
        setLoadingProgress(40);
      });
    }, 100); // Reduced to 100ms since WizardBar already preloads on hover

    // Create FrustumCuller instance
    const culler = new FrustumCuller({
      updateInterval: 5, // Update frustum every 5 frames to reduce overhead
      enableStats: true,
      enableBoundingSphere: true, // Use bounding sphere for faster culling tests
      cullingMargin: 0.5, // Add small margin to frustum to avoid popping
    });

    frustumCullerRef.current = culler;
    setFrustumCuller(culler);
    console.log('[Canvas3D] FrustumCuller created');
    setLoadingProgress(50);
    setLoadingMessage('Menyiapkan kualitas grafis...');

    // Create QualityManager instance
    const qualityManager = new QualityManager({
      performanceMonitor: monitor,
      enableAutoAdjust: true,
      fpsThresholdLow: 30,
      fpsThresholdHigh: 55,
      adjustmentInterval: 5000, // Check every 5 seconds
    });

    qualityManagerRef.current = qualityManager;
    setQualityManager(qualityManager);
    console.log('[Canvas3D] QualityManager created');
    setLoadingProgress(60);
    setLoadingMessage('Mengoptimalkan renderer...');

    // Create RendererOptimizer instance
    const rendererOptimizer = new RendererOptimizer({
      maxShadowCastingLights: 3, // Requirement 12.4
      maxTextureResolution: 2048, // Requirement 12.10
      preferWebGL2: true, // Requirement 12.1
    });

    rendererOptimizerRef.current = rendererOptimizer;
    setRendererOptimizer(rendererOptimizer);
    console.log('[Canvas3D] RendererOptimizer created');
    setLoadingProgress(70);
    setLoadingMessage('Mendeteksi perangkat...');

    // Initialize QualityManager (auto-detect device capabilities and set quality)
    qualityManager.initialize();
    console.log('[Canvas3D] QualityManager initialized');
    setLoadingProgress(80);
    setLoadingMessage('Menyiapkan scene 3D...');

    // Mark refs as ready
    setRefsReady(true);

    // Check for low-end device and enable graceful degradation
    const deviceScore = deviceDetector.getDeviceScore();
    const performanceTier = deviceDetector.getPerformanceTier();
    const isLowEnd = deviceDetector.isLowEndDevice();

    console.log(`[Canvas3D] Device Score: ${deviceScore}/100, Tier: ${performanceTier}, Low-end: ${isLowEnd}`);

    if (isLowEnd) {
      // Check if user has previously dismissed or forced high quality
      const dismissed = localStorage.getItem('lowEndDeviceNotificationDismissed');
      const forceHighQuality = localStorage.getItem('lowEndDeviceForceHighQuality');

      if (forceHighQuality !== 'true') {
        // Enable graceful degradation mode
        qualityManager.enableGracefulDegradation();
        console.warn('[Canvas3D] Graceful degradation mode enabled for low-end device');
        console.warn('[Canvas3D] Disabled features:', qualityManager.getDisabledFeatures());

        // Show notification if not dismissed before
        if (dismissed !== 'true') {
          setShowLowEndNotification(true);
        }
      } else {
        console.log('[Canvas3D] User forced high quality on low-end device');
      }
    }

    // Start FPS tracking
    monitor.startFPSTracking();

    // Start memory tracking (checks every 5 seconds)
    monitor.startMemoryTracking();

    // Log WebGL version
    const webglVersion = rendererOptimizer.getRecommendedWebGLVersion();
    const webgl2Available = rendererOptimizer.isWebGL2Available();
    console.log(`[Canvas3D] WebGL2 available: ${webgl2Available}, using: ${webglVersion}`);

    // Expose metrics to window object for dev tools access
    if (typeof window !== 'undefined') {
      (window as any).__performanceMetrics = {
        getMetrics: () => monitor.getMetrics(),
        getFPS: () => monitor.getFPS(),
        getAverageFPS: () => monitor.getAverageFPS(),
        getMemoryUsage: () => monitor.getMemoryUsage(),
        getRenderStats: () => monitor.getRenderStats(),
        logMetrics: () => monitor.logMetrics(),
        exportMetrics: () => monitor.exportMetrics(),
      };

      (window as any).__cullingMetrics = {
        getStats: () => culler.getStats(),
        getCullingEfficiency: () => culler.getCullingEfficiency(),
        resetStats: () => culler.resetStats(),
      };

      (window as any).__qualityControls = {
        getQuality: () => qualityManager.getQuality(),
        setQuality: (level: QualityLevel) => {
          qualityManager.setManualOverride(level);
          setCanvasKey(prev => prev + 1); // Force Canvas remount to apply settings
        },
        getSettings: () => qualityManager.getSettings(),
        getDeviceCapabilities: () => qualityManager.getDeviceCapabilities(),
        removeOverride: () => {
          qualityManager.setManualOverride(null);
          setCanvasKey(prev => prev + 1);
        },
        exportInfo: () => qualityManager.exportInfo(),
      };

      (window as any).__rendererOptimizer = {
        getConfig: () => rendererOptimizer.getConfig(),
        isWebGL2Available: () => rendererOptimizer.isWebGL2Available(),
        getRecommendedWebGLVersion: () => rendererOptimizer.getRecommendedWebGLVersion(),
      };

      console.log('[Canvas3D] Performance monitoring initialized. Access metrics via window.__performanceMetrics');
      console.log('[Canvas3D] Frustum culling initialized. Access metrics via window.__cullingMetrics');
      console.log('[Canvas3D] Quality controls initialized. Access via window.__qualityControls');
      console.log('[Canvas3D] Renderer optimizer initialized. Access via window.__rendererOptimizer');
      console.log('[Canvas3D] Example: window.__qualityControls.setQuality("HIGH")');
    }

    // Cleanup on unmount
    return () => {
      clearTimeout(preloadTimer);
      
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.destroy();
        performanceMonitorRef.current = null;
      }

      if (qualityManagerRef.current) {
        qualityManagerRef.current.destroy();
        qualityManagerRef.current = null;
      }

      frustumCullerRef.current = null;
      rendererOptimizerRef.current = null;

      // Clean up window object
      if (typeof window !== 'undefined') {
        delete (window as any).__performanceMetrics;
        delete (window as any).__cullingMetrics;
        delete (window as any).__qualityControls;
        delete (window as any).__rendererOptimizer;
      }

      console.log('[Canvas3D] Performance monitoring stopped');
      console.log('[Canvas3D] Frustum culling stopped');
      console.log('[Canvas3D] Quality manager stopped');
      console.log('[Canvas3D] Renderer optimizer stopped');
    };
  }, []);

  // Handle low-end device notification actions
  const handleLowEndDismiss = useCallback(() => {
    setShowLowEndNotification(false);
  }, []);

  const handleLowEndTryAnyway = useCallback(() => {
    setShowLowEndNotification(false);
    
    // Disable graceful degradation and allow auto-adjust
    if (qualityManagerRef.current) {
      qualityManagerRef.current.disableGracefulDegradation();
      console.log('[Canvas3D] User chose to try higher quality on low-end device');
    }
    
    // Force canvas remount to apply new settings
    setCanvasKey(prev => prev + 1);
  }, []);

  // Handle quality change from panel
  const handleQualityChange = useCallback((level: QualityLevel) => {
    console.log(`[Canvas3D] Quality changed to ${level} via panel`);
    setCanvasKey(prev => prev + 1);
  }, []);

  // Memoize callbacks to prevent breaking Scene memoization
  // These callbacks are passed to child components and must remain stable
  const disableOrbit = useCallback(() => { if (orbitRef.current) orbitRef.current.enabled = false; }, []);
  const enableOrbit  = useCallback(() => { if (orbitRef.current) orbitRef.current.enabled = true;  }, []);

  const handleExport = useCallback(() => {
    const c = document.querySelector('canvas');
    if (!c) return;
    const link = document.createElement('a');
    link.href = c.toDataURL('image/png');
    link.download = 'ilena-interior-3d.png';
    link.click();
  }, []);

  // Get renderer settings based on quality
  const getRendererSettings = useCallback((): { dpr: [number, number]; antialias: boolean; powerPreference: 'high-performance' | 'default'; gl2: boolean } => {
    if (!qualityManagerRef.current || !rendererOptimizerRef.current) {
      return {
        dpr: [1, 1.5] as [number, number],
        antialias: true,
        powerPreference: 'high-performance' as const,
        gl2: true,
      };
    }

    const settings = qualityManagerRef.current.getSettings();
    const quality = qualityManagerRef.current.getQuality();
    const webgl2Available = rendererOptimizerRef.current.isWebGL2Available();

    let dpr: [number, number];
    let antialias: boolean;
    let powerPreference: 'high-performance' | 'default';

    switch (quality) {
      case 'LOW':
        dpr = [1, 1] as [number, number];
        antialias = false;
        powerPreference = 'default';
        break;
      case 'MEDIUM':
        dpr = [1, 1.5] as [number, number];
        antialias = true; // FXAA via post-processing
        powerPreference = 'high-performance';
        break;
      case 'HIGH':
        dpr = [1, 1.5] as [number, number];
        antialias = true; // MSAA 2x
        powerPreference = 'high-performance';
        break;
      case 'ULTRA':
        dpr = [1, 2] as [number, number];
        antialias = true; // MSAA 4x
        powerPreference = 'high-performance';
        break;
      default:
        dpr = [1, 1.5] as [number, number];
        antialias = true;
        powerPreference = 'high-performance';
    }

    return { dpr, antialias, powerPreference, gl2: webgl2Available };
  }, []);

  const rendererSettings = getRendererSettings();

  return (
    <div className="relative flex-1 overflow-hidden bg-stone-200">
      {/* Loading Screen with Progress */}
      {isRendering && (
        <LoadingScreen 
          progress={loadingProgress} 
          message={loadingMessage}
        />
      )}

      <Canvas
        key={canvasKey}
        shadows={{ type: THREE.PCFShadowMap }}
        frameloop="always"
        dpr={rendererSettings.dpr}
        camera={{ position: [0, 5, 8], fov: 55, near: 0.1, far: 200 }}
        gl={{ 
          preserveDrawingBuffer: true, 
          antialias: rendererSettings.antialias, 
          powerPreference: rendererSettings.powerPreference,
          // Requirement 12.1: Use WebGL2 when available for better performance
          ...(rendererSettings.gl2 ? { context: undefined } : {})
        }}
        style={{ background: isNight ? '#0D1020' : '#E8E5E0' }}
        onCreated={(state) => {
          console.log('[Canvas3D] Canvas created successfully', {
            gl: state.gl.capabilities,
            camera: state.camera.position,
            scene: state.scene.children.length
          });
          setLoadingProgress(90);
          setLoadingMessage('Hampir selesai...');
          // Set rendering complete after a short delay to ensure scene is fully loaded
          setTimeout(() => {
            setLoadingProgress(100);
            setLoadingMessage('Selesai!');
            setTimeout(() => {
              setIsRendering(false);
              console.log('[Canvas3D] Rendering complete');
            }, 300);
          }, 500);
        }}
      >
        <GLContextDisposer />
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="orange" />
          </mesh>
        }>
          {refsReady && performanceMonitor && frustumCuller && qualityManager && rendererOptimizer ? (
            <Scene
              orbitRef={orbitRef}
              transformMode={transformMode}
              onDragStart={disableOrbit}
              onDragEnd={enableOrbit}
              performanceMonitor={performanceMonitor}
              frustumCuller={frustumCuller}
              qualityManager={qualityManager}
              rendererOptimizer={rendererOptimizer}
            />
          ) : (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="red" />
            </mesh>
          )}
        </Suspense>
      </Canvas>

      {/* Mode toggle — muncul saat ada item dipilih */}
      {selectedItemId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center bg-white/90 backdrop-blur-sm rounded-xl border border-stone-200 shadow-sm p-0.5 gap-0.5">
          <button
            onClick={() => setTransformMode('translate')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              transformMode === 'translate' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            <Move size={13} /> Pindah
          </button>
          <button
            onClick={() => setTransformMode('rotate')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              transformMode === 'rotate' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            <RotateCw size={13} /> Putar
          </button>
        </div>
      )}

      {/* Hint tengah saat ada item dipilih */}
      {selectedItemId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 text-xs text-stone-500 border border-stone-200 pointer-events-none">
          {transformMode === 'translate'
            ? 'Drag panah untuk pindahkan · Klik kosong untuk deselect'
            : 'Drag lingkaran untuk putar · Klik kosong untuk deselect'}
        </div>
      )}

      <ControlsHint mode="3d" />

      {/* Dev Console - Unified Performance & Quality (sudah include Quality Settings di dalamnya) */}
      {refsReady && performanceMonitor && qualityManager && (
        <DevConsole
          performanceMonitor={performanceMonitor}
          qualityManager={qualityManager}
          onQualityChange={handleQualityChange}
        />
      )}

      {/* Day / Night toggle */}
      <button
        onClick={() => setTimeOfDay(isNight ? 'day' : 'night')}
        className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-stone-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-white transition-colors shadow-sm flex items-center gap-1.5"
        title={isNight ? 'Mode Siang' : 'Mode Malam'}
      >
        {isNight ? '☀️ Siang' : '🌙 Malam'}
      </button>

      {/* Export */}
      <button
        onClick={handleExport}
        className="absolute top-3 right-3 bg-white/90 text-stone-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-white transition-colors shadow-sm"
      >
        ↓ Export PNG
      </button>

      {/* Low-End Device Notification */}
      {refsReady && showLowEndNotification && qualityManager && (
        <LowEndDeviceNotification
          disabledFeatures={qualityManager.getDisabledFeatures()}
          onDismiss={handleLowEndDismiss}
          onTryAnyway={handleLowEndTryAnyway}
        />
      )}
    </div>
  );
}
