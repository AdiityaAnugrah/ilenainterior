/**
 * Window Geometry Factory
 * 
 * Creates window geometries with LOD (Level of Detail) support for performance optimization.
 * Provides different detail levels based on camera distance.
 * 
 * Requirements: 1.5, 2.5, 3.5
 */

import * as THREE from 'three';
import { createLODObject, type LODConfig, DEFAULT_LOD_CONFIG } from '@/utils/three/GeometryOptimizer';

/**
 * Window geometry configuration
 */
export interface WindowGeometryConfig {
  width?: number;
  height?: number;
  frameThickness?: number;
  glassThickness?: number;
  detailLevel?: 'high' | 'medium' | 'low';
}

/**
 * Default window dimensions (in meters)
 */
const DEFAULT_WINDOW_CONFIG = {
  width: 1.4,
  height: 1.2,
  frameThickness: 0.04,
  glassThickness: 0.004,
};

/**
 * LOD configuration for windows (interior scenes)
 * - High detail: < 5m (close-up view)
 * - Medium detail: 5-15m (normal view)
 * - Low detail: > 15m (distant view)
 */
export const WINDOW_LOD_CONFIG: LODConfig = {
  highDetail: 5,
  mediumDetail: 15,
  lowDetail: 30,
};

export class WindowGeometryFactory {
  /**
   * Creates a high-detail window frame geometry
   * Used for close-up views (< 5m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns High-detail frame geometry
   */
  static createHighDetailFrame(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { 
      width = DEFAULT_WINDOW_CONFIG.frameThickness,
      height = 1,
      frameThickness = DEFAULT_WINDOW_CONFIG.frameThickness 
    } = config;

    // Create detailed frame with segments for better lighting
    const frameGeometry = new THREE.BoxGeometry(width, height, 0.04, 2, 2, 1);
    
    return frameGeometry;
  }

  /**
   * Creates a medium-detail window frame geometry
   * Used for normal views (5-15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Medium-detail frame geometry
   */
  static createMediumDetailFrame(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { 
      width = DEFAULT_WINDOW_CONFIG.frameThickness,
      height = 1,
      frameThickness = DEFAULT_WINDOW_CONFIG.frameThickness 
    } = config;

    // Simplified frame with fewer segments
    const frameGeometry = new THREE.BoxGeometry(width, height, 0.04, 1, 1, 1);
    
    return frameGeometry;
  }

  /**
   * Creates a low-detail window frame geometry
   * Used for distant views (> 15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Low-detail frame geometry
   */
  static createLowDetailFrame(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { 
      width = DEFAULT_WINDOW_CONFIG.frameThickness,
      height = 1,
      frameThickness = DEFAULT_WINDOW_CONFIG.frameThickness 
    } = config;

    // Minimal frame with no segments
    const frameGeometry = new THREE.BoxGeometry(width, height, 0.04);
    
    return frameGeometry;
  }

  /**
   * Creates a high-detail window glass geometry
   * Used for close-up views (< 5m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns High-detail glass geometry
   */
  static createHighDetailGlass(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { width = DEFAULT_WINDOW_CONFIG.width, height = DEFAULT_WINDOW_CONFIG.height } = config;

    // Detailed glass plane with segments for better refraction
    const glassGeometry = new THREE.PlaneGeometry(width, height, 2, 2);
    
    return glassGeometry;
  }

  /**
   * Creates a medium-detail window glass geometry
   * Used for normal views (5-15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Medium-detail glass geometry
   */
  static createMediumDetailGlass(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { width = DEFAULT_WINDOW_CONFIG.width, height = DEFAULT_WINDOW_CONFIG.height } = config;

    // Simplified glass plane with fewer segments
    const glassGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
    
    return glassGeometry;
  }

  /**
   * Creates a low-detail window glass geometry
   * Used for distant views (> 15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Low-detail glass geometry
   */
  static createLowDetailGlass(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { width = DEFAULT_WINDOW_CONFIG.width, height = DEFAULT_WINDOW_CONFIG.height } = config;

    // Minimal glass plane with no segments
    const glassGeometry = new THREE.PlaneGeometry(width, height);
    
    return glassGeometry;
  }

  /**
   * Creates a high-detail window divider geometry
   * Used for close-up views (< 5m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns High-detail divider geometry
   */
  static createHighDetailDivider(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { 
      width = DEFAULT_WINDOW_CONFIG.width,
      frameThickness = DEFAULT_WINDOW_CONFIG.frameThickness 
    } = config;

    // Detailed divider with segments
    const dividerGeometry = new THREE.BoxGeometry(width, frameThickness * 0.7, 0.03, 2, 1, 1);
    
    return dividerGeometry;
  }

  /**
   * Creates a medium-detail window divider geometry
   * Used for normal views (5-15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Medium-detail divider geometry
   */
  static createMediumDetailDivider(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { 
      width = DEFAULT_WINDOW_CONFIG.width,
      frameThickness = DEFAULT_WINDOW_CONFIG.frameThickness 
    } = config;

    // Simplified divider
    const dividerGeometry = new THREE.BoxGeometry(width, frameThickness * 0.7, 0.03, 1, 1, 1);
    
    return dividerGeometry;
  }

  /**
   * Creates a low-detail window divider geometry
   * Used for distant views (> 15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Low-detail divider geometry
   */
  static createLowDetailDivider(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { 
      width = DEFAULT_WINDOW_CONFIG.width,
      frameThickness = DEFAULT_WINDOW_CONFIG.frameThickness 
    } = config;

    // Minimal divider
    const dividerGeometry = new THREE.BoxGeometry(width, frameThickness * 0.7, 0.03);
    
    return dividerGeometry;
  }

  /**
   * Creates a window frame geometry with specified detail level
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Frame geometry at specified detail level
   */
  static createFrameGeometry(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { detailLevel = 'high' } = config;

    switch (detailLevel) {
      case 'high':
        return this.createHighDetailFrame(config);
      case 'medium':
        return this.createMediumDetailFrame(config);
      case 'low':
        return this.createLowDetailFrame(config);
      default:
        return this.createHighDetailFrame(config);
    }
  }

  /**
   * Creates a window glass geometry with specified detail level
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Glass geometry at specified detail level
   */
  static createGlassGeometry(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { detailLevel = 'high' } = config;

    switch (detailLevel) {
      case 'high':
        return this.createHighDetailGlass(config);
      case 'medium':
        return this.createMediumDetailGlass(config);
      case 'low':
        return this.createLowDetailGlass(config);
      default:
        return this.createHighDetailGlass(config);
    }
  }

  /**
   * Creates a window divider geometry with specified detail level
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Divider geometry at specified detail level
   */
  static createDividerGeometry(config: WindowGeometryConfig = {}): THREE.BufferGeometry {
    const { detailLevel = 'high' } = config;

    switch (detailLevel) {
      case 'high':
        return this.createHighDetailDivider(config);
      case 'medium':
        return this.createMediumDetailDivider(config);
      case 'low':
        return this.createLowDetailDivider(config);
      default:
        return this.createHighDetailDivider(config);
    }
  }

  /**
   * Creates LOD geometries for window frame
   * Generates three detail levels: high (100%), medium (50%), low (25%)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Array of frame geometries at different detail levels
   */
  static createFrameLODGeometries(config: WindowGeometryConfig = {}): THREE.BufferGeometry[] {
    return [
      this.createHighDetailFrame(config),
      this.createMediumDetailFrame(config),
      this.createLowDetailFrame(config),
    ];
  }

  /**
   * Creates LOD geometries for window glass
   * Generates three detail levels: high (100%), medium (50%), low (25%)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Array of glass geometries at different detail levels
   */
  static createGlassLODGeometries(config: WindowGeometryConfig = {}): THREE.BufferGeometry[] {
    return [
      this.createHighDetailGlass(config),
      this.createMediumDetailGlass(config),
      this.createLowDetailGlass(config),
    ];
  }

  /**
   * Creates LOD geometries for window divider
   * Generates three detail levels: high (100%), medium (50%), low (25%)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Window geometry configuration
   * @returns Array of divider geometries at different detail levels
   */
  static createDividerLODGeometries(config: WindowGeometryConfig = {}): THREE.BufferGeometry[] {
    return [
      this.createHighDetailDivider(config),
      this.createMediumDetailDivider(config),
      this.createLowDetailDivider(config),
    ];
  }

  /**
   * Creates a complete LOD object for window frame
   * 
   * Requirements: 1.5, 2.5, 3.5
   * 
   * @param material - Material to apply to all LOD levels
   * @param config - Window geometry configuration
   * @param lodConfig - LOD distance configuration
   * @returns THREE.LOD object with frame geometries
   */
  static createFrameLOD(
    material: THREE.Material,
    config: WindowGeometryConfig = {},
    lodConfig: LODConfig = WINDOW_LOD_CONFIG
  ): THREE.LOD {
    const geometries = this.createFrameLODGeometries(config);
    return createLODObject(geometries, material, lodConfig);
  }

  /**
   * Creates a complete LOD object for window glass
   * 
   * Requirements: 1.5, 2.5, 3.5
   * 
   * @param material - Material to apply to all LOD levels
   * @param config - Window geometry configuration
   * @param lodConfig - LOD distance configuration
   * @returns THREE.LOD object with glass geometries
   */
  static createGlassLOD(
    material: THREE.Material,
    config: WindowGeometryConfig = {},
    lodConfig: LODConfig = WINDOW_LOD_CONFIG
  ): THREE.LOD {
    const geometries = this.createGlassLODGeometries(config);
    return createLODObject(geometries, material, lodConfig);
  }

  /**
   * Creates a complete LOD object for window divider
   * 
   * Requirements: 1.5, 2.5, 3.5
   * 
   * @param material - Material to apply to all LOD levels
   * @param config - Window geometry configuration
   * @param lodConfig - LOD distance configuration
   * @returns THREE.LOD object with divider geometries
   */
  static createDividerLOD(
    material: THREE.Material,
    config: WindowGeometryConfig = {},
    lodConfig: LODConfig = WINDOW_LOD_CONFIG
  ): THREE.LOD {
    const geometries = this.createDividerLODGeometries(config);
    return createLODObject(geometries, material, lodConfig);
  }

  /**
   * Creates optimized glass material for distant windows
   * Disables expensive transmission effects and uses simple transparency
   * 
   * Requirements: 1.5, 2.5, 3.5
   * 
   * @param baseMaterial - Base glass material to optimize
   * @param distance - Distance from camera
   * @returns Optimized material for the given distance
   */
  static optimizeGlassMaterialForDistance(
    baseMaterial: THREE.MeshPhysicalMaterial,
    distance: number
  ): THREE.MeshPhysicalMaterial {
    // Clone the material to avoid modifying the original
    const optimizedMaterial = baseMaterial.clone();

    // For distant windows (> 15m), disable expensive transmission effects
    if (distance > WINDOW_LOD_CONFIG.mediumDetail) {
      optimizedMaterial.transmission = 0; // Disable transmission
      optimizedMaterial.ior = 1.0; // Reset IOR
      
      // Reduce environment map intensity for distant windows
      if (optimizedMaterial.envMapIntensity) {
        optimizedMaterial.envMapIntensity = Math.max(0.5, optimizedMaterial.envMapIntensity * 0.5);
      }
    } else if (distance > WINDOW_LOD_CONFIG.highDetail) {
      // For medium distance (5-15m), reduce transmission slightly
      if (optimizedMaterial.transmission) {
        optimizedMaterial.transmission = Math.max(0.5, optimizedMaterial.transmission * 0.7);
      }
      
      // Reduce environment map intensity slightly
      if (optimizedMaterial.envMapIntensity) {
        optimizedMaterial.envMapIntensity = Math.max(1.0, optimizedMaterial.envMapIntensity * 0.8);
      }
    }

    optimizedMaterial.needsUpdate = true;
    return optimizedMaterial;
  }
}
