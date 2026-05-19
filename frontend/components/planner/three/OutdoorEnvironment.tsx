'use client';
import { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '@/store/editorStore';

// ── Type Definitions ──────────────────────────────────────────────────────────

/**
 * Props for the main OutdoorEnvironment component
 */
export interface OutdoorEnvironmentProps {
  // Color overrides (optional)
  dayYardColor?: string;
  nightYardColor?: string;
  daySkyColor?: string;
  nightSkyColor?: string;
  
  // Size multipliers (optional)
  yardWidthMultiplier?: number;
  yardDepthMultiplier?: number;
  
  // Lighting intensity overrides (optional)
  dayLightIntensity?: number;
  nightLightIntensity?: number;
}

/**
 * Color configuration for a single theme mode
 */
export interface ColorConfig {
  yard: string;       // Hex color for yard ground
  sky: string;        // Hex color for sky dome
  light: string;      // Hex color for outdoor lighting
  celestial?: string; // Hex color for sun/moon (optional)
}

/**
 * Theme-specific color configurations
 */
export interface ThemeColors {
  day: ColorConfig;
  night: ColorConfig;
}

/**
 * Props for the YardMesh internal component
 */
interface YardMeshProps {
  width: number;
  depth: number;
  color: string;
  roomCenterX: number;
  roomCenterZ: number;
}

/**
 * Props for the SkyDome internal component
 */
interface SkyDomeProps {
  color: string;
  radius: number;
}

/**
 * Props for the CelestialBody internal component
 */
interface CelestialBodyProps {
  type: 'sun' | 'moon';
  position: [number, number, number];
  color: string;
  emissiveIntensity: number;
}

/**
 * Props for the OutdoorLighting internal component
 */
interface OutdoorLightingProps {
  ambientIntensity: number;
  directionalIntensity: number;
  lightColor: string;
}

// ── Default Constants ─────────────────────────────────────────────────────────

/**
 * Default color values for day and night modes
 * Based on Requirements 3 and 4
 */
const DEFAULT_COLORS: ThemeColors = {
  day: {
    yard: '#4A7C3B',      // Forest Green
    sky: '#87CEEB',       // Sky Blue
    light: '#FFF8F0',     // Warm White
    celestial: '#FFFACD', // Lemon Chiffon (sun)
  },
  night: {
    yard: '#1A2F1A',      // Dark Forest Green
    sky: '#0D1020',       // Dark Navy
    light: '#4060A0',     // Cool Blue
    celestial: '#E0E0FF', // Pale Lavender (moon)
  },
};

/**
 * Default multipliers for yard dimensions
 * Requirement 10.2: Default values 3x room size for wider terrace appearance
 */
const DEFAULT_MULTIPLIERS = {
  yardWidth: 3,
  yardDepth: 3,
};

/**
 * Default lighting intensity values
 * Requirements 9.1, 9.2, 9.3, 9.4
 */
const DEFAULT_LIGHTING = {
  // Siang sebelumnya 0.4 ambient + 0.8 directional terlalu kuat saat
  // digabung dgn indoor ambient (Lights.tsx) + CeilingLightingSystem.
  // Sekarang diset jadi sumber dominan tapi tidak over-bright.
  dayAmbient: 0.25,
  nightAmbient: 0.08,
  dayDirectional: 0.6,
  nightDirectional: 0.15,
};

/**
 * Geometry configuration constants
 * Requirements 7.5, 7.6
 */
const GEOMETRY_CONFIG = {
  yardSegments: [10, 10] as [number, number],     // PlaneGeometry segments
  skySegments: [32, 32] as [number, number],      // SphereGeometry segments (full quality)
  skySegmentsReduced: [16, 16] as [number, number], // Reduced segments for performance fallback
  skyRadius: 500,                                  // Sky dome radius (Requirement 2.1)
  yardRoughness: 0.8,                             // Yard material roughness (Requirement 1.3)
  yardMetalness: 0.0,                             // Yard material metalness
};

/**
 * Performance monitoring configuration
 * Requirements 7.4, 7.7, 7.8
 */
const PERFORMANCE_CONFIG = {
  targetFPS: 30,                                   // Minimum acceptable FPS
  frameCountForAverage: 60,                        // Log average every 60 frames
  lowFPSThresholdSeconds: 3,                       // Detect low FPS for 3 consecutive seconds
  lowFPSThresholdFrames: 180,                      // 3 seconds at 60fps = 180 frames
};

/**
 * Celestial body configuration
 * Requirements 3.3, 4.3, 4.4
 */
const CELESTIAL_CONFIG = {
  sun: {
    position: [0, 300, -400] as [number, number, number],
    radius: 8,
    emissiveIntensity: 1.0,
  },
  moon: {
    position: [50, 250, -350] as [number, number, number],
    radius: 6,
    emissiveIntensity: 0.2,
  },
};

/**
 * Directional light configuration
 * Requirements 9.3, 9.4, 9.6, 9.7
 */
const DIRECTIONAL_LIGHT_CONFIG = {
  position: [20, 50, -30] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
  shadowMapSize: [2048, 2048] as [number, number],
  shadowCameraNear: 0.5,
  shadowCameraFar: 100,
  shadowCameraBounds: 30, // left/right/top/bottom
  shadowBias: -0.0001,
};

/**
 * Window and positioning fallback configuration
 * Requirements 6.4, 6.5, 6.7, 6.8
 */
const WINDOW_CONFIG = {
  defaultDistance: 10,           // Default distance if north wall position cannot be determined (Requirement 6.8)
  minDistance: 5,                // Minimum yard distance from window (Requirement 6.5)
  maxDistance: 20,               // Maximum yard distance from window (Requirement 6.5)
  frameThickness: 0.04,          // Window frame thickness for overlap detection (Requirement 6.4)
};

// ── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Calculate total polygon count for a geometry
 * @param geometry Three.js geometry instance
 * @returns Number of triangles in the geometry
 */
function getPolygonCount(geometry: THREE.BufferGeometry): number {
  const index = geometry.index;
  const position = geometry.attributes.position;
  
  if (index) {
    // Indexed geometry: count / 3 gives triangle count
    return index.count / 3;
  } else if (position) {
    // Non-indexed geometry: position count / 3 gives triangle count
    return position.count / 3;
  }
  
  return 0;
}

/**
 * Validate total polygon count for all outdoor elements
 * Requirement 7.1: Total polygon count must not exceed 5000 triangles
 * @param yardGeometry Yard plane geometry
 * @param skyGeometry Sky dome geometry
 * @param sunGeometry Sun sphere geometry
 * @param moonGeometry Moon sphere geometry
 * @returns Object with validation result and polygon counts
 */
function validatePolygonBudget(
  yardGeometry: THREE.BufferGeometry,
  skyGeometry: THREE.BufferGeometry,
  sunGeometry: THREE.BufferGeometry,
  moonGeometry: THREE.BufferGeometry
): { isValid: boolean; totalCount: number; breakdown: Record<string, number> } {
  const yardCount = getPolygonCount(yardGeometry);
  const skyCount = getPolygonCount(skyGeometry);
  const sunCount = getPolygonCount(sunGeometry);
  const moonCount = getPolygonCount(moonGeometry);
  
  const totalCount = yardCount + skyCount + sunCount + moonCount;
  const maxAllowed = 5000;
  
  const breakdown = {
    yard: yardCount,
    sky: skyCount,
    sun: sunCount,
    moon: moonCount,
    total: totalCount,
    maxAllowed: maxAllowed,
  };
  
  const isValid = totalCount <= maxAllowed;
  
  if (!isValid) {
    console.error(
      `[OutdoorEnvironment] Polygon budget exceeded! Total: ${totalCount} triangles (max: ${maxAllowed})`,
      breakdown
    );
  } else {
    console.log(
      `[OutdoorEnvironment] Polygon budget validation passed: ${totalCount}/${maxAllowed} triangles`,
      breakdown
    );
  }
  
  return { isValid, totalCount, breakdown };
}

/**
 * Calculate window properties based on room configuration
 * Used for positioning validation and overlap detection
 * Requirements 6.4, 6.5, 6.7, 6.8
 * @param roomWidth Room width in meters
 * @param roomDepth Room depth in meters
 * @param roomHeight Room height in meters
 * @param windowOffsetX Window horizontal offset in centimeters
 * @returns Window properties including position, dimensions, and bounding box
 */
function calculateWindowProperties(
  roomWidth: number,
  roomDepth: number,
  roomHeight: number,
  windowOffsetX: number = 0
): {
  exists: boolean;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number };
  boundingBox: { min: THREE.Vector3; max: THREE.Vector3 };
} {
  // Window is on the north wall (negative Z)
  const northWallZ = -roomDepth / 2;
  
  // Window dimensions (same calculation as in RoomMesh)
  const winW = Math.min(1.4, roomWidth * 0.35);
  const winH = Math.min(1.2, roomHeight * 0.42);
  const winY = roomHeight * 0.3;
  
  // Window offset (convert from cm to meters)
  const winX = windowOffsetX / 100;
  
  // Window center position
  const position = {
    x: winX,
    y: winY + winH / 2,
    z: northWallZ,
  };
  
  // Window bounding box (including frame thickness)
  const frameT = WINDOW_CONFIG.frameThickness;
  const boundingBox = {
    min: new THREE.Vector3(
      winX - winW / 2 - frameT,
      winY - frameT,
      northWallZ - frameT
    ),
    max: new THREE.Vector3(
      winX + winW / 2 + frameT,
      winY + winH + frameT,
      northWallZ + frameT
    ),
  };
  
  return {
    exists: true,
    position,
    dimensions: { width: winW, height: winH },
    boundingBox,
  };
}

/**
 * Calculate window view percentages for yard and sky visibility
 * Requirements 1.6, 2.4, 6.6
 * @param windowProps Window properties
 * @param yardCenterZ Yard center Z coordinate
 * @param yardWidth Yard width
 * @param yardDepth Yard depth
 * @param roomCenterX Room center X coordinate
 * @param roomCenterY Room center Y coordinate (typically height/2)
 * @param roomCenterZ Room center Z coordinate
 * @returns Window view analysis with yard and sky percentages
 */
function calculateWindowViewPercentages(
  windowProps: ReturnType<typeof calculateWindowProperties>,
  yardCenterZ: number,
  yardWidth: number,
  yardDepth: number,
  roomCenterX: number,
  roomCenterY: number,
  roomCenterZ: number
): {
  yardPercentage: number;
  skyPercentage: number;
  isYardVisible: boolean;
  isSkyVisible: boolean;
  meetsRequirements: boolean;
} {
  // Calculate viewing ray from room center through window center
  const viewOrigin = new THREE.Vector3(roomCenterX, roomCenterY, roomCenterZ);
  
  // Window dimensions
  const windowWidth = windowProps.dimensions.width;
  const windowHeight = windowProps.dimensions.height;
  
  // Calculate window half dimensions for sampling
  const windowHalfHeight = windowHeight / 2;
  
  // Sample points across the window to determine what's visible
  const samplesX = 10;
  const samplesY = 10;
  const totalSamples = samplesX * samplesY;
  
  let yardVisibleSamples = 0;
  let skyVisibleSamples = 0;
  
  // For each sample point on the window, cast a ray and determine what it hits
  for (let x = 0; x < samplesX; x++) {
    for (let y = 0; y < samplesY; y++) {
      // Calculate sample point position on window
      const sampleX = windowProps.position.x + 
        (x / (samplesX - 1) - 0.5) * windowWidth;
      const sampleY = windowProps.position.y - windowHalfHeight + 
        (y / (samplesY - 1)) * windowHeight;
      const sampleZ = windowProps.position.z;
      
      // Ray from room center through this sample point
      const samplePoint = new THREE.Vector3(sampleX, sampleY, sampleZ);
      const rayDirection = new THREE.Vector3()
        .subVectors(samplePoint, viewOrigin)
        .normalize();
      
      // Check if ray intersects with yard plane (y = 0)
      // Ray equation: P = origin + t * direction
      // For y = 0: origin.y + t * direction.y = 0
      // t = -origin.y / direction.y
      
      if (rayDirection.y !== 0) {
        const t = -viewOrigin.y / rayDirection.y;
        
        if (t > 0) {
          // Ray intersects ground plane at positive distance
          const intersectX = viewOrigin.x + t * rayDirection.x;
          const intersectZ = viewOrigin.z + t * rayDirection.z;
          
          // Check if intersection is within yard bounds
          const yardHalfWidth = yardWidth / 2;
          const yardHalfDepth = yardDepth / 2;
          
          const isInYard = 
            intersectX >= (roomCenterX - yardHalfWidth) &&
            intersectX <= (roomCenterX + yardHalfWidth) &&
            intersectZ >= (yardCenterZ - yardHalfDepth) &&
            intersectZ <= (yardCenterZ + yardHalfDepth);
          
          if (isInYard) {
            yardVisibleSamples++;
            continue; // This sample sees yard, not sky
          }
        }
      }
      
      // If we didn't hit the yard, we see the sky
      // (assuming sky dome is large enough to be visible in all directions)
      skyVisibleSamples++;
    }
  }
  
  // Calculate percentages
  const yardPercentage = (yardVisibleSamples / totalSamples) * 100;
  const skyPercentage = (skyVisibleSamples / totalSamples) * 100;
  
  // Requirements 1.6 and 2.4
  const meetsYardRequirement = yardPercentage >= 60;
  const meetsSkyRequirement = skyPercentage >= 40;
  
  return {
    yardPercentage,
    skyPercentage,
    isYardVisible: yardVisibleSamples > 0,
    isSkyVisible: skyVisibleSamples > 0,
    meetsRequirements: meetsYardRequirement && meetsSkyRequirement,
  };
}

/**
 * Validate yard positioning relative to window
 * Requirements 6.4, 6.5, 6.6, 6.7, 6.8, 1.6, 2.4
 * @param yardCenterZ Yard center Z coordinate
 * @param yardWidth Yard width
 * @param yardDepth Yard depth
 * @param windowProps Window properties
 * @param roomCenterX Room center X coordinate
 * @param roomCenterY Room center Y coordinate
 * @param roomCenterZ Room center Z coordinate
 * @returns Validation result with warnings
 */
function validateYardPositioning(
  yardCenterZ: number,
  yardWidth: number,
  yardDepth: number,
  windowProps: ReturnType<typeof calculateWindowProperties>,
  roomCenterX: number,
  roomCenterY: number,
  roomCenterZ: number
): {
  isValid: boolean;
  warnings: string[];
  adjustedDistance: number;
  viewAnalysis: ReturnType<typeof calculateWindowViewPercentages>;
} {
  const warnings: string[] = [];
  let isValid = true;
  
  // Requirement 6.7: Log warning if WindowGlass component is not present
  if (!windowProps.exists) {
    warnings.push('[OutdoorEnvironment] WindowGlass component is not present. Outdoor environment will still render.');
    // Validation warning kept internal to avoid console noise.
  }
  
  // Calculate distance from yard center to window center
  const distance = Math.abs(yardCenterZ - windowProps.position.z);
  
  // Requirement 6.5: Ensure yard distance from window is between 5 and 20 units
  if (distance < WINDOW_CONFIG.minDistance) {
    warnings.push(
      `[OutdoorEnvironment] Yard distance from window (${distance.toFixed(2)}m) is less than minimum (${WINDOW_CONFIG.minDistance}m). ` +
      `This may cause visual overlap.`
    );
    // Validation warning kept internal to avoid console noise.
    isValid = false;
  } else if (distance > WINDOW_CONFIG.maxDistance) {
    warnings.push(
      `[OutdoorEnvironment] Yard distance from window (${distance.toFixed(2)}m) exceeds maximum (${WINDOW_CONFIG.maxDistance}m). ` +
      `Yard may not be visible through window.`
    );
    // Validation warning kept internal to avoid console noise.
    isValid = false;
  }
  
  // Requirement 6.4: Verify yard does not overlap with window frame bounding box
  // Yard is a plane at y=0, so we only check X and Z overlap
  // For simplicity, we check if yard center is within window bounds (which would be problematic)
  const yardOverlapsWindow = 
    yardCenterZ >= windowProps.boundingBox.min.z &&
    yardCenterZ <= windowProps.boundingBox.max.z;
  
  if (yardOverlapsWindow) {
    warnings.push(
      `[OutdoorEnvironment] Yard position (z=${yardCenterZ.toFixed(2)}) overlaps with window frame bounding box. ` +
      `This may cause z-fighting or visual artifacts.`
    );
    // Validation warning kept internal to avoid console noise.
    isValid = false;
  }
  
  // Requirements 1.6, 2.4, 6.6: Calculate window view percentages
  const viewAnalysis = calculateWindowViewPercentages(
    windowProps,
    yardCenterZ,
    yardWidth,
    yardDepth,
    roomCenterX,
    roomCenterY,
    roomCenterZ
  );
  
  // Requirement 6.6: Verify both yard and sky are visible from room center
  if (!viewAnalysis.isYardVisible || !viewAnalysis.isSkyVisible) {
    warnings.push(
      `[OutdoorEnvironment] Window view validation failed. ` +
      `Yard visible: ${viewAnalysis.isYardVisible}, Sky visible: ${viewAnalysis.isSkyVisible}. ` +
      `Both elements should be visible through the window from room center.`
    );
    // Validation warning kept internal to avoid console noise.
    isValid = false;
  }
  
  // Requirement 1.6: Yard should occupy at least 60% of window view
  if (viewAnalysis.yardPercentage < 60) {
    warnings.push(
      `[OutdoorEnvironment] Yard occupies ${viewAnalysis.yardPercentage.toFixed(1)}% of window view, ` +
      `which is less than the required 60%. Consider adjusting yard position or size.`
    );
    // Validation warning kept internal to avoid console noise.
    isValid = false;
  }
  
  // Requirement 2.4: Sky should occupy at least 40% of window view
  if (viewAnalysis.skyPercentage < 40) {
    warnings.push(
      `[OutdoorEnvironment] Sky occupies ${viewAnalysis.skyPercentage.toFixed(1)}% of window view, ` +
      `which is less than the required 40%. Consider adjusting yard position or size.`
    );
    // Validation warning kept internal to avoid console noise.
    isValid = false;
  }
  
  // Log success if all validations pass
  if (isValid) {
    console.log(
      `[OutdoorEnvironment] Window view validation passed. ` +
      `Yard: ${viewAnalysis.yardPercentage.toFixed(1)}% (≥60% required), ` +
      `Sky: ${viewAnalysis.skyPercentage.toFixed(1)}% (≥40% required), ` +
      `Distance: ${distance.toFixed(2)}m (5-20m required)`
    );
  }
  
  return {
    isValid,
    warnings,
    adjustedDistance: distance,
    viewAnalysis,
  };
}

// ── Internal Components ───────────────────────────────────────────────────────

/**
 * YardMesh component - Renders the outdoor ground plane with grass texture
 * Requirements 1.1, 1.2, 1.3, 1.5, 1.7, 1.8, 7.2
 */
function YardMesh({ width, depth, color, roomCenterX, roomCenterZ }: YardMeshProps) {
  // Create geometry once with useMemo for performance (Requirement 7.5)
  // Requirement 1.8: Add error handling for geometry creation
  const geometry = useMemo(() => {
    try {
      return new THREE.PlaneGeometry(
        width,
        depth,
        GEOMETRY_CONFIG.yardSegments[0],
        GEOMETRY_CONFIG.yardSegments[1]
      );
    } catch (error) {
      const errorMsg = `Failed to create yard geometry: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[YardMesh]', errorMsg, error);
      return null;
    }
  }, [width, depth]);

  // Create paving/terrace texture using canvas (procedural texture)
  const pavingTexture = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.warn('[YardMesh] Failed to get canvas context for paving texture');
        return null;
      }

      // Seeded random function for deterministic results
      let seed = 12345;
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      // Base color for paving stones (light gray/beige for day, darker for night)
      const baseColor = new THREE.Color(color);
      // Override with terrace-appropriate colors
      const teracceColor = baseColor.getHSL({h: 0, s: 0, l: 0}).l > 0.3 
        ? new THREE.Color('#D4C4B0') // Light beige for day
        : new THREE.Color('#8B7E6E'); // Darker beige for night
      
      // Fill background
      ctx.fillStyle = `rgb(${teracceColor.r * 255}, ${teracceColor.g * 255}, ${teracceColor.b * 255})`;
      ctx.fillRect(0, 0, 512, 512);

      // Draw paving stone tiles (like ceramic or stone tiles)
      const tileSize = 64; // Size of each tile
      const groutSize = 2; // Size of grout lines between tiles
      
      for (let x = 0; x < 512; x += tileSize) {
        for (let y = 0; y < 512; y += tileSize) {
          // Add slight color variation to each tile
          const variation = 0.9 + seededRandom() * 0.2;
          const tileColor = teracceColor.clone().multiplyScalar(variation);
          
          ctx.fillStyle = `rgb(${tileColor.r * 255}, ${tileColor.g * 255}, ${tileColor.b * 255})`;
          ctx.fillRect(x + groutSize, y + groutSize, tileSize - groutSize * 2, tileSize - groutSize * 2);
          
          // Add subtle texture to tile (small speckles)
          for (let i = 0; i < 20; i++) {
            const speckleX = x + groutSize + seededRandom() * (tileSize - groutSize * 2);
            const speckleY = y + groutSize + seededRandom() * (tileSize - groutSize * 2);
            const speckleSize = 1 + seededRandom() * 2;
            
            const speckleVariation = 0.85 + seededRandom() * 0.3;
            const speckleColor = tileColor.clone().multiplyScalar(speckleVariation);
            
            ctx.fillStyle = `rgba(${speckleColor.r * 255}, ${speckleColor.g * 255}, ${speckleColor.b * 255}, 0.5)`;
            ctx.fillRect(speckleX, speckleY, speckleSize, speckleSize);
          }
        }
      }

      // Draw grout lines (darker lines between tiles)
      const groutColor = teracceColor.clone().multiplyScalar(0.6);
      ctx.strokeStyle = `rgb(${groutColor.r * 255}, ${groutColor.g * 255}, ${groutColor.b * 255})`;
      ctx.lineWidth = groutSize;
      
      // Vertical lines
      for (let x = 0; x <= 512; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y <= 512; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(width / 2, depth / 2); // Repeat texture based on yard size
      
      return texture;
    } catch (error) {
      console.error('[YardMesh] Failed to create paving texture:', error);
      return null;
    }
  }, [color, width, depth]);

  // Create material ONCE without color dependency (Requirement 7.2)
  // Single MeshStandardMaterial instance across all theme changes
  // Requirement 1.8: Add error handling for material creation
  const material = useMemo(() => {
    try {
      return new THREE.MeshStandardMaterial({
        color: '#FFFFFF', // Use white to let texture show through
        map: pavingTexture,
        roughness: 0.9, // Higher roughness for matte terrace look
        metalness: 0.0,
      });
    } catch (error) {
      const errorMsg = `Failed to create yard material: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[YardMesh]', errorMsg, error);
      return null;
    }
  }, [pavingTexture]); // Recreate when texture changes

  // Requirement 1.8: If initialization fails, don't render the mesh
  // Component continues rendering other elements
  if (!geometry || !material) {
    return null;
  }

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[roomCenterX, -0.05, roomCenterZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    />
  );
}

/**
 * SkyDome component - Renders the sky hemisphere
 * Requirements 2.1, 2.2, 2.6, 3.7, 4.7, 7.3, 7.8
 */
function SkyDome({ color, radius, useReducedQuality = false }: SkyDomeProps & { useReducedQuality?: boolean }) {
  const skyRef = useRef<THREE.Mesh>(null);

  // Create hemisphere geometry with dynamic quality (Requirement 2.1, 7.6, 7.8)
  // Requirements 3.7, 4.7: Add error handling for geometry creation
  const geometry = useMemo(() => {
    try {
      const segments = useReducedQuality 
        ? GEOMETRY_CONFIG.skySegmentsReduced 
        : GEOMETRY_CONFIG.skySegments;
      
      return new THREE.SphereGeometry(
        radius,
        segments[0],
        segments[1],
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
      );
    } catch (error) {
      const errorMsg = `Failed to create sky dome geometry: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[SkyDome]', errorMsg, error);
      return null;
    }
  }, [radius, useReducedQuality]);

  // Create material ONCE without color dependency (Requirement 7.3)
  // Single MeshBasicMaterial instance across all theme changes
  // Note: color is intentionally NOT in dependency array to ensure single material instance
  // Color updates are handled via useEffect below
  // Requirements 3.7, 4.7: Add error handling for material creation
  const material = useMemo(() => {
    try {
      return new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      });
    } catch (error) {
      const errorMsg = `Failed to create sky dome material: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[SkyDome]', errorMsg, error);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - created only once, color updated via useEffect

  // Update material color when color prop changes (without recreating material)
  useEffect(() => {
    if (!material) return;
    
    try {
      material.color.set(color);
    } catch (error) {
      console.error('[SkyDome] Failed to update material color:', error);
    }
  }, [color, material]);

  // Camera tracking - sky dome follows camera position (Requirement 2.2)
  useFrame(({ camera }) => {
    if (skyRef.current) {
      skyRef.current.position.copy(camera.position);
    }
  });

  // Requirements 3.7, 4.7, 4.8: If initialization fails, don't render the mesh
  // Component continues rendering other elements
  if (!geometry || !material) {
    return null;
  }

  return (
    <mesh
      ref={skyRef}
      geometry={geometry}
      material={material}
      position={[0, 0, 0]}
      renderOrder={-1}
    />
  );
}

/**
 * CelestialBody component - Renders sun or moon
 * Requirements 3.3, 4.3, 4.4
 */
function CelestialBody({ type, position, color }: Omit<CelestialBodyProps, 'emissiveIntensity'>) {
  const config = type === 'sun' ? CELESTIAL_CONFIG.sun : CELESTIAL_CONFIG.moon;
  
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(config.radius, 16, 16);
  }, [config.radius]);

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: color,
    });
    // MeshBasicMaterial doesn't support emissive in R3F, so we just use bright color
    return mat;
  }, [color]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
    />
  );
}

/**
 * Helper function to create celestial body geometries for validation
 * Used to calculate polygon counts before rendering
 */
function createCelestialGeometries() {
  return {
    sun: new THREE.SphereGeometry(CELESTIAL_CONFIG.sun.radius, 16, 16),
    moon: new THREE.SphereGeometry(CELESTIAL_CONFIG.moon.radius, 16, 16),
  };
}

/**
 * OutdoorLighting component - Renders ambient and directional lights
 * Requirements 9.1, 9.2, 9.3, 9.4, 9.6, 9.7
 */
function OutdoorLighting({
  ambientIntensity,
  directionalIntensity,
  lightColor,
}: OutdoorLightingProps) {
  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={ambientIntensity} color={lightColor} />
      
      {/* Directional light with shadows */}
      <directionalLight
        position={DIRECTIONAL_LIGHT_CONFIG.position}
        intensity={directionalIntensity}
        color={lightColor}
        castShadow
        shadow-mapSize-width={DIRECTIONAL_LIGHT_CONFIG.shadowMapSize[0]}
        shadow-mapSize-height={DIRECTIONAL_LIGHT_CONFIG.shadowMapSize[1]}
        shadow-camera-near={DIRECTIONAL_LIGHT_CONFIG.shadowCameraNear}
        shadow-camera-far={DIRECTIONAL_LIGHT_CONFIG.shadowCameraFar}
        shadow-camera-left={-DIRECTIONAL_LIGHT_CONFIG.shadowCameraBounds}
        shadow-camera-right={DIRECTIONAL_LIGHT_CONFIG.shadowCameraBounds}
        shadow-camera-top={DIRECTIONAL_LIGHT_CONFIG.shadowCameraBounds}
        shadow-camera-bottom={-DIRECTIONAL_LIGHT_CONFIG.shadowCameraBounds}
        shadow-bias={DIRECTIONAL_LIGHT_CONFIG.shadowBias}
      />
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * OutdoorEnvironment - Main component that renders the outdoor yard and sky
 * Integrates with editorStore for timeOfDay and roomConfig
 * Requirements 10.5, 10.6
 */
export default function OutdoorEnvironment({
  dayYardColor,
  nightYardColor,
  daySkyColor,
  nightSkyColor,
  yardWidthMultiplier = DEFAULT_MULTIPLIERS.yardWidth,
  yardDepthMultiplier = DEFAULT_MULTIPLIERS.yardDepth,
  dayLightIntensity,
  nightLightIntensity,
}: OutdoorEnvironmentProps = {}) {
  // Subscribe to editorStore for timeOfDay and roomConfig (Requirement 10.5)
  const timeOfDayRaw = useEditorStore((s) => s.timeOfDay);
  const roomConfig = useEditorStore((s) => s.roomConfig);

  // Requirement 3.8, 5.11: Validate timeOfDay value and default to 'day' if undefined/null
  const timeOfDay = useMemo(() => {
    if (timeOfDayRaw === 'day' || timeOfDayRaw === 'night') {
      return timeOfDayRaw;
    }
    
    // Invalid or undefined timeOfDay - default to 'day' silently.
    return 'day' as const;
  }, [timeOfDayRaw]);

  // Refs for tracking theme transitions (Requirement 5.10)
  const previousTimeOfDayRef = useRef<'day' | 'night'>(timeOfDay);
  const transitionStartTimeRef = useRef<number | null>(null);

  // Performance monitoring state (Requirements 7.4, 7.7, 7.8)
  const [useReducedQuality, setUseReducedQuality] = useState(false);
  const frameTimesRef = useRef<number[]>([]);
  const lowFpsCountRef = useRef(0);
  const frameCountRef = useRef(0);

  // Detect timeOfDay changes and track transition timing (Requirement 5.9, 5.10)
  useEffect(() => {
    if (timeOfDay !== previousTimeOfDayRef.current) {
      // Theme change detected
      const startTime = performance.now();
      transitionStartTimeRef.current = startTime;

      // Set a timeout to validate transition completion within 100ms (Requirement 5.10)
      const timeoutId = setTimeout(() => {
        // Theme transition completed; no customer/browser console logging needed.
      }, 100);

      // Update previous timeOfDay after logging
      previousTimeOfDayRef.current = timeOfDay;

      return () => clearTimeout(timeoutId);
    }
  }, [timeOfDay]);

  // Performance monitoring using useFrame (Requirements 7.4, 7.7, 7.8)
  useFrame((state, delta) => {
    // Increment frame count
    frameCountRef.current += 1;

    // Store frame time (delta is in seconds, convert to ms)
    const frameTimeMs = delta * 1000;
    frameTimesRef.current.push(frameTimeMs);

    // Calculate FPS from delta (Requirement 7.4)
    const currentFPS = 1 / delta;

    // Check if FPS is below 30 (Requirement 7.7)
    if (currentFPS < PERFORMANCE_CONFIG.targetFPS) {
      lowFpsCountRef.current += 1;

      // If low FPS persists for more than 3 consecutive seconds (Requirement 7.8)
      if (lowFpsCountRef.current >= PERFORMANCE_CONFIG.lowFPSThresholdFrames) {
        if (!useReducedQuality) {
          setUseReducedQuality(true);
        }
        // Reset counter after applying fallback
        lowFpsCountRef.current = 0;
      }
    } else {
      // Reset low FPS counter if performance is acceptable
      lowFpsCountRef.current = 0;
    }

    // Log average frame time every 60 frames (Requirement 7.7)
    if (frameCountRef.current >= PERFORMANCE_CONFIG.frameCountForAverage) {
      const averageFrameTime = 
        frameTimesRef.current.reduce((sum, time) => sum + time, 0) / 
        frameTimesRef.current.length;
      
      const averageFPS = 1000 / averageFrameTime;

      console.log(
        `[OutdoorEnvironment] Performance stats (last ${PERFORMANCE_CONFIG.frameCountForAverage} frames): ` +
        `Average frame time: ${averageFrameTime.toFixed(2)}ms, ` +
        `Average FPS: ${averageFPS.toFixed(2)}, ` +
        `Quality mode: ${useReducedQuality ? 'reduced (16x16)' : 'full (32x32)'}`
      );

      // Reset counters and frame times array
      frameCountRef.current = 0;
      frameTimesRef.current = [];
    }
  });

  // Determine current theme colors with error handling (Requirement 10.4, 5.11)
  const currentColors = useMemo(() => {
    const isDay = timeOfDay === 'day';
    return {
      yard: isDay
        ? (dayYardColor ?? DEFAULT_COLORS.day.yard)
        : (nightYardColor ?? DEFAULT_COLORS.night.yard),
      sky: isDay
        ? (daySkyColor ?? DEFAULT_COLORS.day.sky)
        : (nightSkyColor ?? DEFAULT_COLORS.night.sky),
      light: isDay
        ? DEFAULT_COLORS.day.light
        : DEFAULT_COLORS.night.light,
      celestial: isDay
        ? DEFAULT_COLORS.day.celestial!
        : DEFAULT_COLORS.night.celestial!,
    };
  }, [timeOfDay, dayYardColor, nightYardColor, daySkyColor, nightSkyColor]);

  // Calculate yard dimensions based on room size and multipliers (Requirement 1.2)
  // Requirement 5.11: Validate roomConfig dimensions and use fallback if invalid
  // Requirements 6.4, 6.5, 6.7, 6.8: Window positioning and fallback logic
  const yardDimensions = useMemo(() => {
    let roomWidth = roomConfig.width;
    let roomDepth = roomConfig.depth;
    let roomHeight = roomConfig.height;
    
    // Validate room dimensions - must be positive numbers
    const isWidthValid = typeof roomWidth === 'number' && roomWidth > 0 && isFinite(roomWidth);
    const isDepthValid = typeof roomDepth === 'number' && roomDepth > 0 && isFinite(roomDepth);
    const isHeightValid = typeof roomHeight === 'number' && roomHeight > 0 && isFinite(roomHeight);
    
    // Use fallback dimensions if invalid (Requirement 5.11)
    if (!isWidthValid || !isDepthValid || !isHeightValid) {
      roomWidth = isWidthValid ? roomWidth : 5;
      roomDepth = isDepthValid ? roomDepth : 4;
      roomHeight = isHeightValid ? roomHeight : 2.7;
    }
    
    // Calculate window properties for positioning validation
    // Requirement 6.8: If north wall position cannot be determined, use default distance
    let windowProps;
    try {
      windowProps = calculateWindowProperties(
        roomWidth,
        roomDepth,
        roomHeight,
        roomConfig.windowOffsetX ?? 0
      );
    } catch {
      // Requirement 6.8: Use default distance if window position cannot be determined
      windowProps = {
        exists: false,
        position: { x: 0, y: 0, z: -WINDOW_CONFIG.defaultDistance },
        dimensions: { width: 0, height: 0 },
        boundingBox: {
          min: new THREE.Vector3(0, 0, 0),
          max: new THREE.Vector3(0, 0, 0),
        },
      };
    }
    
    // WindowGlass absence is non-fatal; keep it silent in customer/browser console.
    
    // Calculate yard center position
    // Position terrace at room center so building sits in the middle
    const yardCenterZ = 0; // Center of building
    
    // Room center Y for view calculations (typically at eye level)
    const roomCenterY = roomHeight / 2;
    
    // Requirement 6.5: Validate yard distance from window is between 5 and 20 units
    // Requirement 6.4: Verify yard does not overlap with window frame bounding box
    // Requirements 1.6, 2.4, 6.6: Validate window view percentages
    const validation = validateYardPositioning(
      yardCenterZ,
      roomWidth * yardWidthMultiplier,
      roomDepth * yardDepthMultiplier,
      windowProps,
      0, // roomCenterX
      roomCenterY,
      0  // roomCenterZ
    );
    
    // Validation results are kept internal to avoid customer/browser console noise.
    
    return {
      width: roomWidth * yardWidthMultiplier,
      depth: roomDepth * yardDepthMultiplier,
      centerX: 0, // Center of room so building is in center of terrace
      centerZ: yardCenterZ,
      windowProps,
      validation,
    };
  }, [
    roomConfig.width, 
    roomConfig.depth, 
    roomConfig.height,
    roomConfig.windowOffsetX,
    yardWidthMultiplier, 
    yardDepthMultiplier
  ]);

  // Determine lighting intensities with error handling (Requirements 9.1, 9.2, 9.3, 9.4, 5.11)
  const lightingIntensities = useMemo(() => {
    const isDay = timeOfDay === 'day';
    return {
      ambient: isDay ? DEFAULT_LIGHTING.dayAmbient : DEFAULT_LIGHTING.nightAmbient,
      directional: isDay
        ? (dayLightIntensity ?? DEFAULT_LIGHTING.dayDirectional)
        : (nightLightIntensity ?? DEFAULT_LIGHTING.nightDirectional),
    };
  }, [timeOfDay, dayLightIntensity, nightLightIntensity]);

  // Determine celestial body configuration with error handling
  const celestialConfig = useMemo(() => {
    const isDay = timeOfDay === 'day';
    return {
      type: isDay ? 'sun' : 'moon',
      position: isDay ? CELESTIAL_CONFIG.sun.position : CELESTIAL_CONFIG.moon.position,
      color: currentColors.celestial,
      emissiveIntensity: isDay
        ? CELESTIAL_CONFIG.sun.emissiveIntensity
        : CELESTIAL_CONFIG.moon.emissiveIntensity,
    };
  }, [timeOfDay, currentColors.celestial]);

  // Determine environment preset with error handling (Requirements 3.4, 4.5, 5.3, 5.7)
  const environmentPreset = useMemo(() => {
    const isDay = timeOfDay === 'day';
    return isDay ? 'apartment' : 'night';
  }, [timeOfDay]);

  // Validate polygon budget on mount and when dimensions change (Requirement 7.1)
  useEffect(() => {
    try {
      // Create temporary geometries for validation
      const yardGeometry = new THREE.PlaneGeometry(
        yardDimensions.width,
        yardDimensions.depth,
        GEOMETRY_CONFIG.yardSegments[0],
        GEOMETRY_CONFIG.yardSegments[1]
      );
      
      const skyGeometry = new THREE.SphereGeometry(
        GEOMETRY_CONFIG.skyRadius,
        GEOMETRY_CONFIG.skySegments[0],
        GEOMETRY_CONFIG.skySegments[1],
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
      );
      
      const celestialGeometries = createCelestialGeometries();
      
      // Validate total polygon count
      validatePolygonBudget(
        yardGeometry,
        skyGeometry,
        celestialGeometries.sun,
        celestialGeometries.moon
      );
      
      // Clean up temporary geometries
      yardGeometry.dispose();
      skyGeometry.dispose();
      celestialGeometries.sun.dispose();
      celestialGeometries.moon.dispose();
    } catch (error) {
      console.error('[OutdoorEnvironment] Failed to validate polygon budget:', error);
    }
  }, [yardDimensions.width, yardDimensions.depth]);

  return (
    <group name="outdoor-environment">
      {/* Environment preset for lighting atmosphere (Requirements 3.4, 4.5, 5.3, 5.7) */}
      <Environment preset={environmentPreset as 'apartment' | 'night'} />

      {/* Yard ground plane */}
      <YardMesh
        width={yardDimensions.width}
        depth={yardDimensions.depth}
        color={currentColors.yard}
        roomCenterX={yardDimensions.centerX}
        roomCenterZ={yardDimensions.centerZ}
      />

      {/* Sky dome */}
      <SkyDome
        color={currentColors.sky}
        radius={GEOMETRY_CONFIG.skyRadius}
        useReducedQuality={useReducedQuality}
      />

      {/* Sun or Moon */}
      <CelestialBody
        type={celestialConfig.type as 'sun' | 'moon'}
        position={celestialConfig.position}
        color={celestialConfig.color}
      />

      {/* Outdoor lighting */}
      <OutdoorLighting
        ambientIntensity={lightingIntensities.ambient}
        directionalIntensity={lightingIntensities.directional}
        lightColor={currentColors.light}
      />
    </group>
  );
}
