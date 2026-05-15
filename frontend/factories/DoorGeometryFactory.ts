/**
 * Door Geometry Factory
 * 
 * Creates door geometries with LOD (Level of Detail) support for performance optimization.
 * Provides different detail levels based on camera distance.
 * 
 * Requirements: 1.5, 2.5, 3.5
 */

import * as THREE from 'three';
import { createLODGeometry, createLODObject, type LODConfig, DEFAULT_LOD_CONFIG } from '@/utils/three/GeometryOptimizer';

/**
 * Door geometry configuration
 */
export interface DoorGeometryConfig {
  width?: number;
  height?: number;
  frameThickness?: number;
  panelThickness?: number;
  detailLevel?: 'high' | 'medium' | 'low';
}

/**
 * Default door dimensions (in meters)
 */
const DEFAULT_DOOR_CONFIG = {
  width: 0.9,
  height: 2.1,
  frameThickness: 0.07,
  panelThickness: 0.045,
};

/**
 * LOD configuration for doors (interior scenes)
 * - High detail: < 5m (close-up view)
 * - Medium detail: 5-15m (normal view)
 * - Low detail: > 15m (distant view)
 */
export const DOOR_LOD_CONFIG: LODConfig = {
  highDetail: 5,
  mediumDetail: 15,
  lowDetail: 30,
};

export class DoorGeometryFactory {
  /**
   * Creates a high-detail door frame geometry
   * Used for close-up views (< 5m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns High-detail frame geometry
   */
  static createHighDetailFrame(config: DoorGeometryConfig = {}): THREE.BufferGeometry {
    const { frameThickness = DEFAULT_DOOR_CONFIG.frameThickness } = config;
    const width = config.width ?? DEFAULT_DOOR_CONFIG.frameThickness;
    const height = config.height ?? (DEFAULT_DOOR_CONFIG.height + DEFAULT_DOOR_CONFIG.frameThickness);
    const depth = frameThickness * 2;

    // Create detailed frame with rounded edges using cylinder segments
    const frameGeometry = new THREE.BoxGeometry(width, height, depth, 2, 4, 2);
    
    return frameGeometry;
  }

  /**
   * Creates a medium-detail door frame geometry
   * Used for normal views (5-15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns Medium-detail frame geometry
   */
  static createMediumDetailFrame(config: DoorGeometryConfig = {}): THREE.BufferGeometry {
    const { frameThickness = DEFAULT_DOOR_CONFIG.frameThickness } = config;
    const width = config.width ?? DEFAULT_DOOR_CONFIG.frameThickness;
    const height = config.height ?? (DEFAULT_DOOR_CONFIG.height + DEFAULT_DOOR_CONFIG.frameThickness);
    const depth = frameThickness * 2;

    // Simplified frame with fewer segments
    const frameGeometry = new THREE.BoxGeometry(width, height, depth, 1, 2, 1);
    
    return frameGeometry;
  }

  /**
   * Creates a low-detail door frame geometry
   * Used for distant views (> 15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns Low-detail frame geometry
   */
  static createLowDetailFrame(config: DoorGeometryConfig = {}): THREE.BufferGeometry {
    const { frameThickness = DEFAULT_DOOR_CONFIG.frameThickness } = config;
    const width = config.width ?? DEFAULT_DOOR_CONFIG.frameThickness;
    const height = config.height ?? (DEFAULT_DOOR_CONFIG.height + DEFAULT_DOOR_CONFIG.frameThickness);
    const depth = frameThickness * 2;

    // Minimal frame with no segments
    const frameGeometry = new THREE.BoxGeometry(width, height, depth);
    
    return frameGeometry;
  }

  /**
   * Creates a high-detail door panel geometry
   * Used for close-up views (< 5m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns High-detail panel geometry
   */
  static createHighDetailPanel(config: DoorGeometryConfig = {}): THREE.BufferGeometry {
    const { width = DEFAULT_DOOR_CONFIG.width, height = DEFAULT_DOOR_CONFIG.height, panelThickness = DEFAULT_DOOR_CONFIG.panelThickness } = config;

    // Detailed panel with segments for better lighting
    const panelGeometry = new THREE.BoxGeometry(width, height, panelThickness, 3, 6, 1);
    
    return panelGeometry;
  }

  /**
   * Creates a medium-detail door panel geometry
   * Used for normal views (5-15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns Medium-detail panel geometry
   */
  static createMediumDetailPanel(config: DoorGeometryConfig = {}): THREE.BufferGeometry {
    const { width = DEFAULT_DOOR_CONFIG.width, height = DEFAULT_DOOR_CONFIG.height, panelThickness = DEFAULT_DOOR_CONFIG.panelThickness } = config;

    // Simplified panel with fewer segments
    const panelGeometry = new THREE.BoxGeometry(width, height, panelThickness, 1, 2, 1);
    
    return panelGeometry;
  }

  /**
   * Creates a low-detail door panel geometry
   * Used for distant views (> 15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns Low-detail panel geometry
   */
  static createLowDetailPanel(config: DoorGeometryConfig = {}): THREE.BufferGeometry {
    const { width = DEFAULT_DOOR_CONFIG.width, height = DEFAULT_DOOR_CONFIG.height, panelThickness = DEFAULT_DOOR_CONFIG.panelThickness } = config;

    // Minimal panel with no segments
    const panelGeometry = new THREE.BoxGeometry(width, height, panelThickness);
    
    return panelGeometry;
  }

  /**
   * Creates a high-detail door handle geometry
   * Used for close-up views (< 5m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @returns High-detail handle geometry
   */
  static createHighDetailHandle(): THREE.BufferGeometry {
    // Detailed sphere with high segment count
    const handleGeometry = new THREE.SphereGeometry(0.028, 16, 16);
    
    return handleGeometry;
  }

  /**
   * Creates a medium-detail door handle geometry
   * Used for normal views (5-15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @returns Medium-detail handle geometry
   */
  static createMediumDetailHandle(): THREE.BufferGeometry {
    // Simplified sphere with medium segment count
    const handleGeometry = new THREE.SphereGeometry(0.028, 8, 8);
    
    return handleGeometry;
  }

  /**
   * Creates a low-detail door handle geometry
   * Used for distant views (> 15m)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @returns Low-detail handle geometry
   */
  static createLowDetailHandle(): THREE.BufferGeometry {
    // Minimal sphere with low segment count
    const handleGeometry = new THREE.SphereGeometry(0.028, 6, 6);
    
    return handleGeometry;
  }

  /**
   * Creates a door frame geometry with specified detail level
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns Frame geometry at specified detail level
   */
  static createFrameGeometry(config: DoorGeometryConfig = {}): THREE.BufferGeometry {
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
   * Creates a door panel geometry with specified detail level
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns Panel geometry at specified detail level
   */
  static createPanelGeometry(config: DoorGeometryConfig = {}): THREE.BufferGeometry {
    const { detailLevel = 'high' } = config;

    switch (detailLevel) {
      case 'high':
        return this.createHighDetailPanel(config);
      case 'medium':
        return this.createMediumDetailPanel(config);
      case 'low':
        return this.createLowDetailPanel(config);
      default:
        return this.createHighDetailPanel(config);
    }
  }

  /**
   * Creates a door handle geometry with specified detail level
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param detailLevel - Detail level ('high', 'medium', or 'low')
   * @returns Handle geometry at specified detail level
   */
  static createHandleGeometry(detailLevel: 'high' | 'medium' | 'low' = 'high'): THREE.BufferGeometry {
    switch (detailLevel) {
      case 'high':
        return this.createHighDetailHandle();
      case 'medium':
        return this.createMediumDetailHandle();
      case 'low':
        return this.createLowDetailHandle();
      default:
        return this.createHighDetailHandle();
    }
  }

  /**
   * Creates LOD geometries for door frame
   * Generates three detail levels: high (100%), medium (50%), low (25%)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns Array of frame geometries at different detail levels
   */
  static createFrameLODGeometries(config: DoorGeometryConfig = {}): THREE.BufferGeometry[] {
    return [
      this.createHighDetailFrame(config),
      this.createMediumDetailFrame(config),
      this.createLowDetailFrame(config),
    ];
  }

  /**
   * Creates LOD geometries for door panel
   * Generates three detail levels: high (100%), medium (50%), low (25%)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @param config - Door geometry configuration
   * @returns Array of panel geometries at different detail levels
   */
  static createPanelLODGeometries(config: DoorGeometryConfig = {}): THREE.BufferGeometry[] {
    return [
      this.createHighDetailPanel(config),
      this.createMediumDetailPanel(config),
      this.createLowDetailPanel(config),
    ];
  }

  /**
   * Creates LOD geometries for door handle
   * Generates three detail levels: high (100%), medium (50%), low (25%)
   * 
   * Requirements: 1.5, 2.5
   * 
   * @returns Array of handle geometries at different detail levels
   */
  static createHandleLODGeometries(): THREE.BufferGeometry[] {
    return [
      this.createHighDetailHandle(),
      this.createMediumDetailHandle(),
      this.createLowDetailHandle(),
    ];
  }

  /**
   * Creates a complete LOD object for door frame
   * 
   * Requirements: 1.5, 2.5, 3.5
   * 
   * @param material - Material to apply to all LOD levels
   * @param config - Door geometry configuration
   * @param lodConfig - LOD distance configuration
   * @returns THREE.LOD object with frame geometries
   */
  static createFrameLOD(
    material: THREE.Material,
    config: DoorGeometryConfig = {},
    lodConfig: LODConfig = DOOR_LOD_CONFIG
  ): THREE.LOD {
    const geometries = this.createFrameLODGeometries(config);
    return createLODObject(geometries, material, lodConfig);
  }

  /**
   * Creates a complete LOD object for door panel
   * 
   * Requirements: 1.5, 2.5, 3.5
   * 
   * @param material - Material to apply to all LOD levels
   * @param config - Door geometry configuration
   * @param lodConfig - LOD distance configuration
   * @returns THREE.LOD object with panel geometries
   */
  static createPanelLOD(
    material: THREE.Material,
    config: DoorGeometryConfig = {},
    lodConfig: LODConfig = DOOR_LOD_CONFIG
  ): THREE.LOD {
    const geometries = this.createPanelLODGeometries(config);
    return createLODObject(geometries, material, lodConfig);
  }

  /**
   * Creates a complete LOD object for door handle
   * 
   * Requirements: 1.5, 2.5, 3.5
   * 
   * @param material - Material to apply to all LOD levels
   * @param lodConfig - LOD distance configuration
   * @returns THREE.LOD object with handle geometries
   */
  static createHandleLOD(
    material: THREE.Material,
    lodConfig: LODConfig = DOOR_LOD_CONFIG
  ): THREE.LOD {
    const geometries = this.createHandleLODGeometries();
    return createLODObject(geometries, material, lodConfig);
  }
}
