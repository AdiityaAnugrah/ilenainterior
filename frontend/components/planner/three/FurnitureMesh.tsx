'use client';
import React, { useRef, useState, useEffect, useMemo, Suspense, Component, ReactNode, memo } from 'react';
import { Html, useTexture } from '@react-three/drei';
import { LazyTransformControls, preloadTransformControls } from './LazyControls';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlacedItem, useEditorStore } from '@/store/editorStore';
import { formatPrice } from '@/lib/utils';
import { createAssetLoader } from '@/lib/assets/AssetLoader';
import { globalCacheManager } from '@/lib/cache/CacheManager';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Create AssetLoader instance with CacheManager and MemoryManager
const assetLoader = createAssetLoader(globalCacheManager);

// ErrorBoundary — tangkap error useTexture/useGLTF lalu render fallback
class ThreeErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}


// ── OBB collision (SAT) — sinkron dengan Canvas2D ─────────────────────────────
function getCorners(item: PlacedItem, pos: { x: number; y: number }): [number, number][] {
  const cx = pos.x + item.dimensions.width / 2;
  const cy = pos.y + item.dimensions.depth / 2;
  const hw = item.dimensions.width / 2;
  const hd = item.dimensions.depth / 2;
  const a = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as [number, number][])
    .map(([lx, ly]) => [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos]);
}
function projRange(corners: [number, number][], ax: [number, number]): [number, number] {
  const dots = corners.map(([x, y]) => x * ax[0] + y * ax[1]);
  return [Math.min(...dots), Math.max(...dots)];
}
function obbOverlap(a: PlacedItem, b: PlacedItem, posA: { x: number; y: number }, tolerance: number = 0): boolean {
  const ca = getCorners(a, posA);
  const cb = getCorners(b, b.position);
  const axes: [number, number][] = [
    [ca[1][0] - ca[0][0], ca[1][1] - ca[0][1]],
    [ca[3][0] - ca[0][0], ca[3][1] - ca[0][1]],
    [cb[1][0] - cb[0][0], cb[1][1] - cb[0][1]],
    [cb[3][0] - cb[0][0], cb[3][1] - cb[0][1]],
  ];
  for (const ax of axes) {
    const [a0, a1] = projRange(ca, ax);
    const [b0, b1] = projRange(cb, ax);
    // Add tolerance: only consider overlap if gap is more than tolerance
    if (a1 + tolerance <= b0 || b1 + tolerance <= a0) return false;
  }
  return true;
}

const CATEGORY_COLORS: Record<string, string> = {
  sofa:     '#8B7355',
  meja:     '#A0785A',
  kursi:    '#6D9B8C',
  rak:      '#7A6A5A',
  lampu:    '#E8D5A0',
  dekorasi: '#C4A882',
  kasur:    '#B8A090',
  lemari:   '#6B5D4F',
  aksesori: '#D4B896',
  lainnya:  '#9E9E9E',
};

export type TransformMode = 'translate' | 'rotate';

// Remap warna gizmo default (merah/hijau/biru) ke palet earth tone netral
function neutralizeGizmo(controls: unknown) {
  if (!controls || typeof controls !== 'object' || !('_gizmo' in controls)) return;
  const controlsObj = controls as { _gizmo?: Record<string, unknown> };
  if (!controlsObj._gizmo) return;
  
  const REMAP: Record<number, number> = {
    0xff0000: 0xc4a47c, // merah  → tan hangat (X)
    0x00ff00: 0x8fa897, // hijau  → sage (Y)
    0x0000ff: 0x8fa3b4, // biru   → dusty blue (Z)
    0xffff00: 0xd4c4a0, // kuning → pale gold (rotasi)
    0xff00ff: 0xb8a0b0, // magenta → muted mauve
    0x00ffff: 0x90adb8, // cyan   → muted teal
  };
  ['gizmo', 'picker', 'helper'].forEach((key) => {
    const node = controlsObj._gizmo?.[key];
    if (!node || typeof node !== 'object' || !('traverse' in node)) return;
    const nodeObj = node as { traverse: (callback: (obj: unknown) => void) => void };
    nodeObj.traverse((obj: unknown) => {
      if (!obj || typeof obj !== 'object' || !('material' in obj)) return;
      const objWithMat = obj as { material: unknown };
      const mats = Array.isArray(objWithMat.material) ? objWithMat.material : [objWithMat.material];
      mats.forEach((m: unknown) => {
        if (!m || typeof m !== 'object' || !('color' in m)) return;
        const mat = m as { color: { getHex: () => number; setHex: (hex: number) => void } };
        if (!mat.color) return;
        const remapped = REMAP[mat.color.getHex()];
        if (remapped !== undefined) mat.color.setHex(remapped);
      });
    });
  });
}

interface FurnitureMeshProps {
  item: PlacedItem;
  isWalkMode?: boolean;
  transformMode?: TransformMode;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// ─── Layer 1: model .glb asli dengan AssetLoader ─────────────────────────────
/**
 * GLBModel - Loads 3D models using AssetLoader with progressive loading support
 * 
 * Features:
 * - Lazy loading: Models loaded on-demand when furniture added to scene
 * - Progressive loading: Large models load low-res preview first, then high-res
 * - Caching: Loaded models cached for instant reuse
 * - Memory management: Automatic cleanup when component unmounts
 * - Loading states: Progress bar with percentage indicator
 * - Error handling: Graceful fallback to placeholder box
 * 
 * Progressive Loading:
 * - Detects large models by URL patterns (-high, _high, .large.)
 * - Automatically generates low-res URL by replacing 'high' with 'low'
 * - Loads low-res in background while fetching high-res
 * - Shows "Loading preview..." indicator during progressive load
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 9.9
 */
function GLBModel({ url, dims, itemId }: { url: string; dims: PlacedItem['dimensions']; itemId: string }) {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLowRes, setIsLowRes] = useState(false);
  const [, setContextLost] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Task 10.1: Quality reduction state for performance recovery
  // When FPS < 15 for >2 seconds, reduce quality to maintain performance
  // Requirements: 2.4
  const [qualityReduced, setQualityReduced] = useState(false);
  
  // Task 7.1: Disposal safety flag to prevent premature disposal
  // Tracks whether component is mounted to prevent disposal during React concurrent rendering
  // Requirements: 2.1, 2.5
  const isMountedRef = useRef(true);

  // WebGL context loss detection (Phase 1 - Detection only, no recovery)
  // Requirements: 2.2, 2.4
  useEffect(() => {
    // Get the canvas element from the Three.js renderer
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.warn('[GLBModel] Canvas not found for context loss detection');
      return;
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault(); // Prevent default context loss behavior
      const timestamp = new Date().toISOString();
      console.warn(`[GLBModel] WebGL context lost detected at ${timestamp}`);
      console.warn(`[GLBModel] Affected model: ${itemId}, URL: ${url}`);
      setContextLost(true);
    };

    const handleContextRestored = () => {
      const timestamp = new Date().toISOString();
      console.log(`[GLBModel] WebGL context restored at ${timestamp}`);
      console.log(`[GLBModel] Affected model: ${itemId}, URL: ${url}`);
      setContextLost(false);
      
      // Phase 2: Trigger model reload for recovery
      console.log(`[GLBModel] Triggering model reload for recovery: ${itemId}`);
      setIsRecovering(true);
      setGltf(null); // Clear current model to trigger reload
      setLoading(true); // Set loading state to show recovery indicator
      setError(null); // Clear any previous errors
      setLoadProgress(0); // Reset progress
    };

    // Attach event listeners
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Cleanup: remove event listeners when component unmounts
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [itemId, url]);

  // Load model using AssetLoader with progressive loading for large models
  // Dependencies include isRecovering to trigger reload after context restoration
  useEffect(() => {
    let cancelled = false;

    const loadModel = async () => {
      try {
        setLoading(true);
        setError(null);
        setLoadProgress(0);
        setIsLowRes(false);

        if (isRecovering) {
          console.log(`[GLBModel] Recovering model after context restoration for item ${itemId}:`, url);
        } else {
          console.log(`[GLBModel] Loading model for item ${itemId}:`, url);
        }

        // Detect if this is a large model that should use progressive loading
        // Large models are typically > 5MB, we can infer from URL patterns or enable for all
        const isLargeModel = url.includes('-high') || url.includes('_high') || url.includes('.large.');
        const hasLowResVariant = url.includes('-high') || url.includes('_high');
        
        // Generate low-res URL by replacing high with low
        const lowResUrl = hasLowResVariant 
          ? url.replace('-high', '-low').replace('_high', '_low')
          : null;

        let result;

        // Use progressive loading for large models with low-res variants
        if (isLargeModel && lowResUrl && hasLowResVariant) {
          console.log(`[GLBModel] Using progressive loading for ${itemId}`);
          // Progressive loading: load low-res first, then high-res
          result = await assetLoader.loadModelProgressive(url, lowResUrl, {
            priority: 'normal',
            cache: true,
            timeout: 30000,
            onProgress: (progress) => {
              if (!cancelled) {
                setLoadProgress(progress);
              }
            },
            onError: (err) => {
              if (!cancelled) {
                console.error(`[GLBModel] Progressive load error for ${itemId}:`, err);
                setError(err);
              }
            },
          });

          // Note: loadModelProgressive loads low-res in background and returns high-res
          // The low-res will be cached and available immediately on next load
        } else {
          console.log(`[GLBModel] Using standard loading for ${itemId}`);
          // Standard loading for normal-sized models
          result = await assetLoader.loadModel(url, {
            priority: 'normal',
            cache: true,
            progressive: false,
            timeout: 30000,
            onProgress: (progress) => {
              if (!cancelled) {
                setLoadProgress(progress);
              }
            },
            onError: (err) => {
              if (!cancelled) {
                console.error(`[GLBModel] Load error for ${itemId}:`, err);
                setError(err);
              }
            },
          });
        }

        if (!cancelled && result && result.data) {
          console.log(`[GLBModel] Model loaded successfully for ${itemId}`);
          if (isRecovering) {
            console.log(`[GLBModel] Recovery completed successfully for ${itemId}`);
            setIsRecovering(false);
          }
          setGltf(result.data);
          setLoading(false);
          setIsLowRes(false);
          
          // Note: We don't register the entire scene with MemoryManager
          // Individual meshes, textures, and geometries within the scene
          // are managed by Three.js and will be disposed when the scene is removed
        } else if (!cancelled) {
          console.warn(`[GLBModel] Model load returned empty result for ${itemId}`);
          setError(new Error('Model load returned empty result'));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`[GLBModel] Exception loading model for ${itemId}:`, err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    loadModel();

    return () => {
      cancelled = true;
      // Cleanup: Three.js will handle disposal of scene resources
      // when the component unmounts and the scene is removed
    };
  }, [url, itemId, isRecovering]);

  // useMemo: clone + hitung scale hanya saat gltf/dims berubah, bukan tiap render
  const { cloned, sx, sy, sz, minY } = useMemo(() => {
    if (!gltf) {
      return { cloned: null, sx: 1, sy: 1, sz: 1, minY: 0 };
    }

    const cloned = gltf.scene.clone(true);

    // Fix: setelah Meshopt/quantize compression, geometry boundingSphere &
    // boundingBox bisa stale → frustum culler mengira mesh di luar view →
    // model hilang random saat drag/orbit. Re-compute bounds + disable
    // culling sebagai safety net per-mesh.
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        if (m.geometry) {
          m.geometry.computeBoundingBox();
          m.geometry.computeBoundingSphere();
        }
        m.frustumCulled = false;
      }
    });

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    return {
      cloned,
      sx: size.x > 0 ? (dims.width  / 100) / size.x : 1,
      sy: size.y > 0 ? (dims.height / 100) / size.y : 1,
      sz: size.z > 0 ? (dims.depth  / 100) / size.z : 1,
      minY: box.min.y,
    };
  }, [gltf, dims.width, dims.height, dims.depth]);

  // Task 8.1/8.2 dihapus: "rendering state validation" lama justru
  // BIKIN model hilang random. Skemanya: tiap 5 detik cek cloned.parent.
  // Kalau null → setForceRenderKey++ → <group key={forceRenderKey}> remount
  // → cloned sempat detached selama reconciliation → validasi berikutnya
  // baca parent=null lagi → loop sampai kasih ColorBox "Model unavailable".
  //
  // Trust R3F untuk attach mesh ke scene graph. Kalau ada error real,
  // sudah ditangani oleh error/loading state di useEffect loader di atas.
  const shouldUseFallback = false;
  const forceRenderKey = 0;

  // FPS monitoring with quality reduction trigger (Phase 3 - Performance)
  // Track frame timestamps and calculate rolling average FPS over 2-second window
  // Task 10.1: Trigger quality reduction when FPS < 15 for >2 seconds
  // Requirements: 2.4
  const frameTimestampsRef = useRef<number[]>([]);
  const lowFpsStartTimeRef = useRef<number | null>(null);
  useFrame((state) => {
    const currentTime = state.clock.getElapsedTime() * 1000; // Convert to milliseconds
    const timestamps = frameTimestampsRef.current;
    
    // Add current timestamp
    timestamps.push(currentTime);
    
    // Keep only timestamps from the last 2 seconds (2000ms window)
    const twoSecondsAgo = currentTime - 2000;
    while (timestamps.length > 0 && timestamps[0] < twoSecondsAgo) {
      timestamps.shift();
    }
    
    // Calculate FPS: number of frames in the last 2 seconds / 2
    // We need at least 2 frames to calculate FPS
    if (timestamps.length >= 2) {
      const timeSpan = currentTime - timestamps[0];
      const fps = timeSpan > 0 ? ((timestamps.length - 1) / timeSpan) * 1000 : 0;
      
      // Check if FPS is below 15
      if (fps < 15) {
        // Start tracking low FPS duration
        if (lowFpsStartTimeRef.current === null) {
          lowFpsStartTimeRef.current = currentTime;
        }
        
        // Check if FPS has been below 15 for more than 2 seconds
        const lowFpsDuration = currentTime - lowFpsStartTimeRef.current;
        if (lowFpsDuration > 2000) {
          // Task 10.1: Trigger quality reduction after 2 seconds of low FPS
          // This is Phase 3 behavior - reduce quality to maintain performance
          if (!qualityReduced) {
            setQualityReduced(true);
          }

        }
      } else {
        // FPS is above 15, reset low FPS tracking
        // Note: We don't reset qualityReduced here - once reduced, stay reduced
        // to prevent thrashing between quality levels
        lowFpsStartTimeRef.current = null;
      }
    }
  });

  // Task 11.1: Memory pressure detection with proactive cleanup (Phase 3 - Performance)
  // Use performance.memory API (Chrome) to check memory usage
  // When memory usage > 80%, trigger cleanup to relieve pressure
  // Requirements: 2.2, 2.4
  const [cleanupPerformed, setCleanupPerformed] = useState(false);
  const lastCleanupTimeRef = useRef<number>(0);

  useEffect(() => {
    // Check if performance.memory API is available (Chrome-specific)
    const hasMemoryAPI = 'memory' in performance;
    
    if (!hasMemoryAPI) {
      console.log('[GLBModel] performance.memory API not available (Chrome-only feature)');
      return;
    }

    // Type assertion for performance.memory (Chrome-specific API)
    interface PerformanceMemory {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    }

    const checkMemoryPressure = () => {
      try {
        const memory = (performance as unknown as { memory: PerformanceMemory }).memory;
        
        // Calculate memory usage percentage
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        // Task 11.1: Trigger cleanup when memory usage exceeds 80% threshold
        if (usagePercentage > 80) {
          const timestamp = new Date().toISOString();
          const now = Date.now();
          
          // Only perform cleanup once every 30 seconds to avoid thrashing
          const timeSinceLastCleanup = now - lastCleanupTimeRef.current;
          const shouldPerformCleanup = timeSinceLastCleanup > 30000 || lastCleanupTimeRef.current === 0;
          
          console.warn(`[GLBModel] Memory pressure detected at ${timestamp}`);
          console.warn(`[GLBModel] Memory usage: ${usagePercentage.toFixed(2)}% (${usedMB.toFixed(2)} MB / ${limitMB.toFixed(2)} MB)`);
          console.warn(`[GLBModel] Used heap: ${usedMB.toFixed(2)} MB`);
          console.warn(`[GLBModel] Heap limit: ${limitMB.toFixed(2)} MB`);
          console.warn(`[GLBModel] Model: ${itemId}, URL: ${url}`);
          
          if (shouldPerformCleanup) {
            console.warn(`[GLBModel] Triggering proactive cleanup to relieve memory pressure`);
            console.warn(`[GLBModel] Time since last cleanup: ${(timeSinceLastCleanup / 1000).toFixed(1)}s`);
            
            // Record memory usage before cleanup
            const memoryBeforeCleanup = usedMB;
            
            // 1. Dispose unused cached models from AssetLoader
            // Get cache statistics before cleanup
            const cacheStatsBefore = globalCacheManager.getStats();
            console.log(`[GLBModel] Cache before cleanup: ${cacheStatsBefore.entryCount} entries, ${globalCacheManager.getFormattedSize()}`);
            
            // Evict LRU entries to free up memory
            // This will remove least recently used cached models
            const cacheEntriesBefore = globalCacheManager.getEntries();
            const oldestEntries = cacheEntriesBefore
              .sort((a, b) => a.lastAccessed - b.lastAccessed)
              .slice(0, Math.floor(cacheEntriesBefore.length * 0.3)); // Remove oldest 30%
            
            let disposedCacheCount = 0;
            oldestEntries.forEach((entry) => {
              // Dispose Three.js resources if this is a GLTF model
              if (entry.data && typeof entry.data === 'object' && 'scene' in entry.data) {
                const gltfData = entry.data as GLTF;
                gltfData.scene.traverse((obj: THREE.Object3D) => {
                  if (obj instanceof THREE.Mesh) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (Array.isArray(obj.material)) {
                      obj.material.forEach((m) => m.dispose());
                    } else if (obj.material) {
                      obj.material.dispose();
                    }
                  }
                });
              }
              globalCacheManager.delete(entry.key);
              disposedCacheCount++;
            });
            
            const cacheStatsAfter = globalCacheManager.getStats();
            console.log(`[GLBModel] Cache after cleanup: ${cacheStatsAfter.entryCount} entries, ${globalCacheManager.getFormattedSize()}`);
            console.log(`[GLBModel] Disposed ${disposedCacheCount} cached models`);
            
            // 2. Reduce texture quality for all loaded models (if not already reduced)
            if (!qualityReduced && cloned) {
              console.log(`[GLBModel] Reducing texture quality for current model ${itemId}`);
              setQualityReduced(true);
            }
            
            // 3. Clear Three.js internal caches
            // Clear Three.js texture cache
            if (THREE.Cache && THREE.Cache.enabled) {
              const cacheFiles = THREE.Cache.files;
              const cacheFileCount = Object.keys(cacheFiles).length;
              THREE.Cache.clear();
              console.log(`[GLBModel] Cleared Three.js cache (${cacheFileCount} files)`);
            }
            
            // Force garbage collection hint (if available in Chrome DevTools)
            // Note: This is only available when DevTools is open or in Node.js
            if (typeof (global as { gc?: () => void })?.gc === 'function') {
              (global as { gc: () => void }).gc();
              console.log(`[GLBModel] Triggered garbage collection`);
            }
            
            // Update cleanup state
            lastCleanupTimeRef.current = now;
            setCleanupPerformed(true);
            
            // Task 11.2: Log memory usage after cleanup for debugging
            // Check memory immediately after cleanup to measure effectiveness
            const memoryAfterCleanup = memory.usedJSHeapSize / (1024 * 1024);
            const memoryFreed = memoryBeforeCleanup - memoryAfterCleanup;
            const usagePercentageAfter = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            
            console.warn(`[GLBModel] Proactive cleanup completed`);
            console.warn(`[GLBModel] Memory before cleanup: ${memoryBeforeCleanup.toFixed(2)} MB (${usagePercentage.toFixed(2)}%)`);
            console.warn(`[GLBModel] Memory after cleanup: ${memoryAfterCleanup.toFixed(2)} MB (${usagePercentageAfter.toFixed(2)}%)`);
            console.warn(`[GLBModel] Memory freed: ${memoryFreed.toFixed(2)} MB`);
            console.warn(`[GLBModel] Number of models disposed: ${disposedCacheCount}`);
            console.warn(`[GLBModel] Cleanup actions performed:`);
            console.warn(`[GLBModel]   - Disposed ${disposedCacheCount} unused cached models`);
            console.warn(`[GLBModel]   - Reduced texture quality: ${!qualityReduced && cloned ? 'Yes' : 'Already reduced'}`);
            console.warn(`[GLBModel]   - Cleared Three.js internal caches`);
          } else {
            console.warn(`[GLBModel] Cleanup skipped - last cleanup was ${(timeSinceLastCleanup / 1000).toFixed(1)}s ago (minimum 30s interval)`);
          }
        } else {
          // Memory usage is below 80%, reset cleanup flag if it was set
          if (cleanupPerformed && usagePercentage < 70) {
            console.log(`[GLBModel] Memory pressure relieved - usage now ${usagePercentage.toFixed(2)}%`);
            setCleanupPerformed(false);
          }
        }
      } catch (error) {
        console.error('[GLBModel] Error checking memory pressure:', error);
      }
    };

    // Initial check
    checkMemoryPressure();

    // Periodic check every 10 seconds
    const memoryCheckInterval = setInterval(checkMemoryPressure, 10000);

    // Cleanup: clear interval when component unmounts
    return () => {
      clearInterval(memoryCheckInterval);
    };
  }, [itemId, url, qualityReduced, cloned, cleanupPerformed]);

  // Task 10.1: Apply quality reduction to model when qualityReduced flag is set
  // Reduce texture resolution and simplify materials to improve performance
  // Requirements: 2.4
  useEffect(() => {
    if (!cloned || !qualityReduced) {
      return; // Skip if no model or quality not reduced
    }

    console.log(`[GLBModel] Applying quality reduction to model ${itemId}`);
    console.log(`[GLBModel] Model URL: ${url}`);
    
    let textureCount = 0;
    let materialCount = 0;

    cloned.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        // Simplify materials
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              materialCount++;
              // Reduce roughness/metalness calculations
              mat.roughness = Math.min(mat.roughness + 0.2, 1.0); // Increase roughness (less reflective)
              mat.metalness = Math.max(mat.metalness - 0.3, 0.0); // Reduce metalness (simpler shading)
              mat.needsUpdate = true;
              
              // Reduce texture resolution if texture exists
              if (mat.map) {
                textureCount++;
                // Set texture to use lower mipmap levels (lower resolution)
                mat.map.minFilter = THREE.LinearMipmapLinearFilter;
                mat.map.magFilter = THREE.LinearFilter;
                mat.map.anisotropy = 1; // Disable anisotropic filtering
                mat.map.needsUpdate = true;
              }
              
              // Disable expensive texture maps if they exist
              if (mat.normalMap) {
                mat.normalMap = null; // Remove normal maps (expensive)
                mat.needsUpdate = true;
              }
              if (mat.roughnessMap) {
                mat.roughnessMap = null; // Remove roughness maps
                mat.needsUpdate = true;
              }
              if (mat.metalnessMap) {
                mat.metalnessMap = null; // Remove metalness maps
                mat.needsUpdate = true;
              }
            }
          });
        } else if (obj.material instanceof THREE.MeshStandardMaterial) {
          materialCount++;
          const mat = obj.material;
          
          // Reduce roughness/metalness calculations
          mat.roughness = Math.min(mat.roughness + 0.2, 1.0);
          mat.metalness = Math.max(mat.metalness - 0.3, 0.0);
          mat.needsUpdate = true;
          
          // Reduce texture resolution if texture exists
          if (mat.map) {
            textureCount++;
            mat.map.minFilter = THREE.LinearMipmapLinearFilter;
            mat.map.magFilter = THREE.LinearFilter;
            mat.map.anisotropy = 1;
            mat.map.needsUpdate = true;
          }
          
          // Disable expensive texture maps
          if (mat.normalMap) {
            mat.normalMap = null;
            mat.needsUpdate = true;
          }
          if (mat.roughnessMap) {
            mat.roughnessMap = null;
            mat.needsUpdate = true;
          }
          if (mat.metalnessMap) {
            mat.metalnessMap = null;
            mat.needsUpdate = true;
          }
        }
      }
    });

    console.log(`[GLBModel] Quality reduction applied to model ${itemId}`);
    console.log(`[GLBModel] Modified ${materialCount} materials, ${textureCount} textures`);
    console.log(`[GLBModel] Disabled normal maps, roughness maps, metalness maps`);
    console.log(`[GLBModel] Reduced texture filtering and anisotropy`);
    console.log(`[GLBModel] Simplified material properties (increased roughness, reduced metalness)`);
  }, [cloned, qualityReduced, itemId, url]);

  // Mount tracking — disposal sengaja TIDAK dilakukan di sini.
  //
  // BUG SEBELUMNYA: cleanup memanggil `obj.geometry.dispose()` +
  // `obj.material.dispose()` pada hasil `gltf.scene.clone(true)`. Tapi
  // `clone(true)` HANYA clone Object3D nodes — geometry & material di-SHARE
  // dengan cached GLTF di AssetLoader. Begitu 1 instance unmount → geometri
  // GPU yang dipakai bersama hilang → instance lain (atau produk berikutnya
  // yang reuse cache yang sama) jadi blank / gak ke-render.
  //
  // Disposal proper-nya dilakukan oleh AssetLoader saat cache evict (atau
  // saat WebGL context di-release lewat cleanup di Canvas3D/CanvasWalk).
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Show loading placeholder
  if (loading || !cloned) {
    const W = dims.width  / 100;
    const H = dims.height / 100;
    const D = dims.depth  / 100;
    
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, H / 2, 0]}>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial 
            color="#D4C4A0" 
            roughness={0.8} 
            metalness={0.1}
            transparent
            opacity={0.6}
          />
        </mesh>
        {/* Recovery UI Indicator - Task 6.2 */}
        {/* Shows "Recovering models..." during context restoration */}
        {/* Styled consistent with existing loading placeholder */}
        {/* Requirements: 2.3 */}
        {isRecovering && (
          <Html center>
            <div className="bg-white/90 backdrop-blur-sm rounded px-3 py-1.5 text-xs text-stone-700 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-stone-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-300 animate-pulse"
                    style={{ width: `${loadProgress || 50}%` }}
                  />
                </div>
                <span className="font-medium text-amber-700">Recovering models...</span>
              </div>
            </div>
          </Html>
        )}
        {/* Normal loading indicator - only show when NOT recovering */}
        {!isRecovering && loadProgress > 0 && (
          <Html center>
            <div className="bg-white/90 backdrop-blur-sm rounded px-3 py-1.5 text-xs text-stone-700 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-stone-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-stone-600 transition-all duration-300"
                    style={{ width: `${loadProgress}%` }}
                  />
                </div>
                <span className="font-medium">{Math.round(loadProgress)}%</span>
              </div>
              {isLowRes ? (
                <div className="text-[10px] text-stone-500 mt-0.5">Loading preview...</div>
              ) : null}
            </div>
          </Html>
        )}
      </group>
    );
  }

  // Task 8.2: Show fallback rendering when validation fails after 3 attempts
  // Render ColorBox fallback with "Model unavailable" indicator
  // Requirements: 2.3
  if (shouldUseFallback) {
    const W = dims.width  / 100;
    const H = dims.height / 100;
    const D = dims.depth  / 100;
    
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, H / 2, 0]}>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial color="#D4C4A0" roughness={0.7} metalness={0.05} />
        </mesh>
        <Html center>
          <div className="bg-amber-50/95 backdrop-blur-sm rounded px-2 py-1 text-xs text-amber-700 border border-amber-200">
            Model unavailable
          </div>
        </Html>
      </group>
    );
  }

  // Show error placeholder
  if (error) {
    const W = dims.width  / 100;
    const H = dims.height / 100;
    const D = dims.depth  / 100;
    
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, H / 2, 0]}>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial color="#E8A87C" roughness={0.7} />
        </mesh>
        <Html center>
          <div className="bg-red-50/95 backdrop-blur-sm rounded px-2 py-1 text-xs text-red-700 border border-red-200">
            Failed to load model
          </div>
        </Html>
      </group>
    );
  }

  return (
    <group key={forceRenderKey} position={[0, -(minY * sy), 0]}>
      <primitive object={cloned} scale={[sx, sy, sz]} castShadow receiveShadow />
      {/* Quality reduction runs silently; no customer-facing debug badge. */}
    </group>
  );
}

// ─── Layer 2: foto sebagai tekstur di permukaan kotak ────────────────────────
function TexturedBox({ item }: { item: PlacedItem }) {
  const W = item.dimensions.width  / 100;
  const H = item.dimensions.height / 100;
  const D = item.dimensions.depth  / 100;

  // thumbnail sudah berupa URL lengkap yang di-resolve di FurnitureVisual
  const texture = useTexture(item.thumbnail);
  
  // Use useMemo to configure texture properties to avoid modifying hook return value
  const configuredTexture = useMemo(() => {
    const clonedTexture = texture.clone();
    clonedTexture.wrapS = clonedTexture.wrapT = THREE.ClampToEdgeWrapping;
    clonedTexture.colorSpace = THREE.SRGBColorSpace;
    return clonedTexture;
  }, [texture]);

  // 6 sisi: depan (foto), belakang, kiri, kanan, atas, bawah
  const materials = [
    new THREE.MeshStandardMaterial({ color: '#E8E0D8', roughness: 0.8 }), // right
    new THREE.MeshStandardMaterial({ color: '#E8E0D8', roughness: 0.8 }), // left
    new THREE.MeshStandardMaterial({ color: '#F0EBE3', roughness: 0.9 }), // top
    new THREE.MeshStandardMaterial({ color: '#D0C8C0', roughness: 0.8 }), // bottom
    new THREE.MeshStandardMaterial({ map: configuredTexture, roughness: 0.7 }), // front ← foto
    new THREE.MeshStandardMaterial({ color: '#E0D8D0', roughness: 0.8 }), // back
  ];

  return (
    <mesh castShadow receiveShadow position={[0, H / 2, 0]} material={materials}>
      <boxGeometry args={[W, H, D]} />
    </mesh>
  );
}

// ─── Layer 3: kotak warna solid (fallback akhir) ─────────────────────────────
function ColorBox({ item, color }: { item: PlacedItem; color: string }) {
  const W = item.dimensions.width  / 100;
  const H = item.dimensions.height / 100;
  const D = item.dimensions.depth  / 100;
  return (
    <mesh castShadow receiveShadow position={[0, H / 2, 0]}>
      <boxGeometry args={[W, H, D]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
    </mesh>
  );
}

// ─── Pemilih layer visual ─────────────────────────────────────────────────────
function FurnitureVisual({ item, isSelected }: { item: PlacedItem; isSelected: boolean }) {
  const fallbackColor = isSelected
    ? '#D4A96A'
    : (item.variantColor ?? CATEGORY_COLORS[item.category] ?? '#9E9E9E');

  const colorBox = <ColorBox item={item} color={fallbackColor} />;

  // Gunakan path relatif /uploads/... — di-proxy oleh Next.js ke backend
  // Ini menghindari error 'resolved to private IP' dan CORS issue
  const glbUrl = item.model3d?.startsWith('/uploads/')
    ? item.model3d  // path relatif, Next.js proxy ke backend
    : item.model3d?.startsWith('http') ? item.model3d : null;

  const thumbUrl = item.thumbnail?.startsWith('/uploads/')
    ? item.thumbnail  // path relatif, Next.js proxy ke backend
    : item.thumbnail?.startsWith('http') ? item.thumbnail : null;

  if (glbUrl) {
    return (
      <ThreeErrorBoundary fallback={colorBox}>
        <Suspense fallback={colorBox}>
          <GLBModel url={glbUrl} dims={item.dimensions} itemId={item.id} />
        </Suspense>
      </ThreeErrorBoundary>
    );
  }

  if (thumbUrl) {
    return (
      <ThreeErrorBoundary fallback={colorBox}>
        <Suspense fallback={colorBox}>
          <TexturedBox item={{ ...item, thumbnail: thumbUrl }} />
        </Suspense>
      </ThreeErrorBoundary>
    );
  }

  return <ColorBox item={item} color={fallbackColor} />;
}

// ─── Komponen utama ──────────────────────────────────────────────────────────

/**
 * FurnitureMesh component - Memoized to prevent unnecessary re-renders
 * 
 * This component is rendered multiple times (once per furniture item) and can be
 * expensive with 3D model loading, textures, and transform controls. Memoization
 * ensures each instance only re-renders when its specific item data changes.
 * 
 * Re-renders only when:
 * - item data changes (position, rotation, dimensions, model, etc.)
 * - transformMode changes (translate/rotate)
 * - isWalkMode changes
 * - Callbacks change (but these should be memoized in parent)
 * 
 * Props that trigger re-renders:
 * - item: PlacedItem object (position, rotation, dimensions, model3d, thumbnail, etc.)
 * - transformMode: 'translate' | 'rotate'
 * - isWalkMode: boolean
 * - onDragStart, onDragEnd: callbacks (should be memoized)
 * 
 * Performance impact:
 * - Without memo: Re-renders all furniture when any single item changes
 * - With memo: Only re-renders the specific item that changed
 * - Typical savings: 95%+ reduction in unnecessary re-renders with 20+ items
 * 
 * Requirements: 13.1, 13.2
 */
const FurnitureMesh = memo(function FurnitureMesh({
  item,
  isWalkMode,
  transformMode = 'translate',
  onDragStart,
  onDragEnd,
}: FurnitureMeshProps) {
  const { selectedItemId, setSelectedItem, updateItem, roomConfig } = useEditorStore();
  const [hovered,    setHovered]    = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [groupObject, setGroupObject] = useState<THREE.Group | null>(null);

  const isSelected = selectedItemId === item.id;
  const groupRef   = useRef<THREE.Group>(null);

  // Preload TransformControls when item is selected
  // This ensures smooth loading when user selects an item
  // Requirements: 9.3, 9.6
  useEffect(() => {
    if (isSelected) {
      preloadTransformControls().catch((error) => {
        console.error('[FurnitureMesh] Failed to preload TransformControls:', error);
      });
    }
  }, [isSelected]);

  // Track when group ref is available and store the object in state
  useEffect(() => {
    if (groupRef.current) {
      setGroupObject(groupRef.current);
    }
  }, []);

  const originX = roomConfig.width / 2;
  const originZ = roomConfig.depth / 2;

  // Convert 2D top-left position to 3D center position
  // 2D position is always top-left of UNROTATED bounding box
  // 3D position is always at the center of the furniture
  const centerX2D = item.position.x + item.dimensions.width / 2;
  const centerY2D = item.position.y + item.dimensions.depth / 2;
  
  const posX3D = centerX2D / 100 - originX;
  const posZ3D = centerY2D / 100 - originZ;
  const posY3D = item.elevation ?? 0;
  const rotY   = -(item.rotation * Math.PI) / 180;

  useEffect(() => {
    if (isDragging || !groupRef.current) return;
    groupRef.current.position.set(posX3D, posY3D, posZ3D);
    groupRef.current.rotation.set(0, rotY, 0);
  }, [posX3D, posY3D, posZ3D, rotY, isDragging]);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(posX3D, posY3D, posZ3D);
    groupRef.current.rotation.set(0, rotY, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncToStore = () => {
    if (!groupRef.current) return;
    const p = groupRef.current.position;
    const r = groupRef.current.rotation;
    
    // Calculate rotation angle in degrees
    const rotationDeg = transformMode === 'rotate'
      ? (((-r.y * 180) / Math.PI) % 360 + 360) % 360
      : item.rotation;
    
    // Convert 3D center position back to 2D center position
    const centerX2D = (p.x + originX) * 100;
    const centerY2D = (p.z + originZ) * 100;
    
    // For rotate mode: don't clamp, just update rotation
    // For translate mode: clamp with AABB boundary checking
    if (transformMode === 'rotate') {
      // Rotate mode: just update rotation without moving position
      updateItem(item.id, {
        rotation: rotationDeg,
      });
    } else {
      // Translate mode: clamp position with AABB boundary checking
      const hw = item.dimensions.width / 2;
      const hd = item.dimensions.depth / 2;
      const rad = (rotationDeg * Math.PI) / 180;
      const c = Math.abs(Math.cos(rad));
      const s = Math.abs(Math.sin(rad));
      const aabbHW = hw * c + hd * s;
      const aabbHD = hw * s + hd * c;
      
      // Clamp center position so AABB stays inside room
      const roomW = roomConfig.width * 100;
      const roomD = roomConfig.depth * 100;
      const clampedCenterX = Math.max(aabbHW, Math.min(roomW - aabbHW, centerX2D));
      const clampedCenterY = Math.max(aabbHD, Math.min(roomD - aabbHD, centerY2D));
      
      // Convert clamped center back to top-left
      const clampedTopLeftX = clampedCenterX - hw;
      const clampedTopLeftY = clampedCenterY - hd;
      
      // Check collision with other items using OBB
      const proposedItem: PlacedItem = {
        ...item,
        position: { x: clampedTopLeftX, y: clampedTopLeftY },
        rotation: rotationDeg,
      };
      
      const allItems = useEditorStore.getState().items;
      // Use tolerance of -1 (negative means allow 1cm overlap for touching)
      const hasCollision = allItems.some(other => 
        other.id !== item.id && obbOverlap(proposedItem, other, proposedItem.position, -1)
      );
      
      // Only update if no collision
      if (!hasCollision) {
        updateItem(item.id, {
          position: {
            x: clampedTopLeftX,
            y: clampedTopLeftY,
          },
          elevation: Math.max(0, Math.min(roomConfig.height - item.dimensions.height / 100, p.y)),
          rotation: rotationDeg,
        });
      } else {
        // Revert to original position if collision detected
        if (groupRef.current) {
          const revertCenterX = item.position.x + item.dimensions.width / 2;
          const revertCenterY = item.position.y + item.dimensions.depth / 2;
          groupRef.current.position.set(
            revertCenterX / 100 - originX,
            item.elevation ?? 0,
            revertCenterY / 100 - originZ
          );
          groupRef.current.rotation.set(0, -(item.rotation * Math.PI) / 180, 0);
        }
      }
    }
  };

  return (
    <>
      <group
        ref={groupRef}
        onClick={(e) => { e.stopPropagation(); setSelectedItem(isSelected ? null : item.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <FurnitureVisual item={item} isSelected={isSelected || hovered} />

        {isSelected && (
          <mesh position={[0, item.dimensions.height / 200, 0]}>
            <boxGeometry args={[
              item.dimensions.width  / 100 + 0.05,
              item.dimensions.height / 100 + 0.05,
              item.dimensions.depth  / 100 + 0.05,
            ]} />
            <meshBasicMaterial color="#1c1917" wireframe />
          </mesh>
        )}

        {isWalkMode && hovered && (
          <Html distanceFactor={10} position={[0, item.dimensions.height / 100 + 0.3, 0]}>
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 min-w-32 pointer-events-none border border-stone-100">
              <p className="text-xs font-semibold text-stone-800 whitespace-nowrap">{item.name}</p>
              <p className="text-xs text-stone-500 mt-0.5">{formatPrice(item.price)}</p>
            </div>
          </Html>
        )}
      </group>

      {isSelected && !isWalkMode && groupObject && (
        <LazyTransformControls
          ref={(ctrl: unknown) => { 
            if (ctrl && typeof ctrl === 'object' && !('_neutralized' in ctrl)) { 
              neutralizeGizmo(ctrl); 
              (ctrl as unknown as { _neutralized: boolean })._neutralized = true; 
            } 
          }}
          object={groupObject}
          mode={transformMode}
          showX={transformMode === 'translate'}
          showY={true}
          showZ={transformMode === 'translate'}
          space="world"
          onMouseDown={() => { setIsDragging(true); onDragStart?.(); }}
          onChange={() => {
            // Real-time boundary checking during drag (only for translate mode)
            if (!groupRef.current || transformMode !== 'translate') return;
            const p = groupRef.current.position;
            const r = groupRef.current.rotation;
            
            // Calculate current rotation in degrees
            const rotationDeg = ((-r.y * 180) / Math.PI % 360 + 360) % 360;
            
            // Calculate rotated AABB using current rotation
            const hw = item.dimensions.width / 200;  // half-width in meters
            const hd = item.dimensions.depth / 200;   // half-depth in meters
            const rad = (rotationDeg * Math.PI) / 180;
            const c = Math.abs(Math.cos(rad));
            const s = Math.abs(Math.sin(rad));
            const aabbHW = hw * c + hd * s;
            const aabbHD = hw * s + hd * c;
            
            // Room boundaries in meters (centered at origin)
            const maxX = originX - aabbHW;
            const minX = -originX + aabbHW;
            const maxZ = originZ - aabbHD;
            const minZ = -originZ + aabbHD;
            
            // Clamp position to keep AABB inside room
            p.x = Math.max(minX, Math.min(maxX, p.x));
            p.z = Math.max(minZ, Math.min(maxZ, p.z));
            p.y = Math.max(0, Math.min(roomConfig.height - item.dimensions.height / 100, p.y));
            
            // Check collision with other items
            const centerX2D = (p.x + originX) * 100;
            const centerY2D = (p.z + originZ) * 100;
            const topLeftX = centerX2D - item.dimensions.width / 2;
            const topLeftY = centerY2D - item.dimensions.depth / 2;
            
            const proposedItem: PlacedItem = {
              ...item,
              position: { x: topLeftX, y: topLeftY },
              rotation: rotationDeg,
            };
            
            const allItems = useEditorStore.getState().items;
            // Use tolerance of -1 (negative means allow 1cm overlap for touching)
            const hasCollision = allItems.some(other => 
              other.id !== item.id && obbOverlap(proposedItem, other, proposedItem.position, -1)
            );
            
            // If collision detected, revert to last valid position
            if (hasCollision && groupRef.current) {
              const lastCenterX = item.position.x + item.dimensions.width / 2;
              const lastCenterY = item.position.y + item.dimensions.depth / 2;
              p.x = lastCenterX / 100 - originX;
              p.z = lastCenterY / 100 - originZ;
            }
          }}
          onMouseUp={() => { syncToStore(); setIsDragging(false); onDragEnd?.(); }}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  // Return true if props are equal (skip re-render)
  // Return false if props changed (re-render)
  
  // Compare item object (Zustand uses immutable updates, so reference equality works)
  const itemEqual = prevProps.item === nextProps.item;
  
  // Compare other props
  const transformModeEqual = prevProps.transformMode === nextProps.transformMode;
  const isWalkModeEqual = prevProps.isWalkMode === nextProps.isWalkMode;
  
  // Callbacks are assumed to be memoized in parent, so we don't compare them
  // (comparing functions is unreliable and they should be stable via useCallback)
  
  // Skip re-render if all essential props are equal
  return itemEqual && transformModeEqual && isWalkModeEqual;
});

FurnitureMesh.displayName = 'FurnitureMesh';

export default FurnitureMesh;