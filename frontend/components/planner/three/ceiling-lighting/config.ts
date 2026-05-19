/**
 * Ceiling Lighting System Configuration
 * 
 * This file contains TypeScript interfaces and default configuration constants
 * for the ceiling lighting system.
 * 
 * Requirements: 6.1, 6.2, 7.1, 13.1, 13.2
 */

/**
 * Configuration for an individual light type
 */
export interface LightConfig {
  enabled: boolean;
  color: string; // hex color format
  intensityMultiplier: number; // 0.0-2.0 range
}

/**
 * Complete configuration for the ceiling lighting system
 */
export interface CeilingLightingConfig {
  version: string; // Version for future compatibility
  
  // LED strip lighting along ceiling perimeter
  ledStrip: LightConfig;
  
  // Cove lighting with indirect illumination
  coveLight: LightConfig;
  
  // Indirect backlighting for depth effects
  backlight: LightConfig;
  
  // Soft ambient ceiling lighting
  ambient: LightConfig;
  
  // Visual options
  enableBloom: boolean;
  showFixtureGeometry: boolean;
}

/**
 * Calculated light intensities for each light type
 */
export interface LightIntensities {
  ledStrip: number;
  coveLight: number;
  backlight: number;
  ambient: number;
}

/**
 * Base intensity values for day and night modes
 */
export interface BaseIntensities {
  day: {
    ledStrip: number;
    coveLight: number;
    backlight: number;
    ambient: number;
  };
  night: {
    ledStrip: number;
    coveLight: number;
    backlight: number;
    ambient: number;
  };
}

/**
 * Default base intensity values
 * 
 * Day mode: Subtle accent lighting (total: 1.05)
 * Night mode: Primary illumination (total: 2.0 - meets Requirement 4.8)
 * 
 * Requirements: 1.5, 1.6, 2.6, 2.7, 3.5, 3.6, 4.3, 4.4, 4.8, 5.4, 5.5
 */
export const BASE_INTENSITIES: BaseIntensities = {
  day: {
    // Siang: lampu indoor harusnya minimal (matahari dominan dari outdoor).
    // Sebelumnya total 1.05 — bikin scene over-bright digabung dgn outdoor
    // ambient (0.4) + directional (0.8) + Lights.tsx ambient (0.3).
    // Sekarang total ~0.35 supaya outdoor jadi sumber dominan.
    ledStrip: 0.10,
    coveLight: 0.07,
    backlight: 0.05,
    ambient: 0.13,
  },
  night: {
    // Malam: lampu indoor jadi sumber utama. Total ~2.0 cocok.
    ledStrip: 0.7,
    coveLight: 0.55,
    backlight: 0.35,
    ambient: 0.4,
  },
};

/**
 * Default ceiling lighting configuration
 * 
 * All lights enabled with default colors and intensity multipliers
 * 
 * Requirements: 1.3, 2.3, 3.3, 4.2, 6.1, 6.2, 7.1, 13.1, 13.2
 */
export const DEFAULT_CEILING_LIGHTING_CONFIG: CeilingLightingConfig = {
  version: "1.0",
  
  ledStrip: {
    enabled: true,
    color: "#FFF8E1", // Warm white - Requirement 1.3
    intensityMultiplier: 1.0,
  },
  
  coveLight: {
    enabled: true,
    color: "#FFFAF0", // Soft warm white - Requirement 2.3
    intensityMultiplier: 1.0,
  },
  
  backlight: {
    enabled: true,
    color: "#FFF5E6", // Neutral warm - Requirement 3.3
    intensityMultiplier: 1.0,
  },
  
  ambient: {
    enabled: true,
    color: "#FFFDF7", // Very soft warm white - Requirement 4.2
    intensityMultiplier: 1.0,
  },
  
  enableBloom: false,
  showFixtureGeometry: false,
};

/**
 * Default room dimensions fallback
 * Used when roomConfig is undefined or invalid
 * 
 * Requirement: 14.4
 */
export const DEFAULT_ROOM_DIMENSIONS = {
  width: 5.0,  // meters
  depth: 5.0,  // meters
  height: 3.0, // meters
};

/**
 * Minimum room dimensions to prevent invalid calculations
 * 
 * Requirement: 14.4
 */
export const MIN_ROOM_DIMENSIONS = {
  width: 2.0,   // meters
  depth: 2.0,   // meters
  height: 2.4,  // meters
};

/**
 * LED strip configuration constants
 * 
 * Requirements: 1.2, 1.4, 1.7
 */
export const LED_STRIP_CONFIG = {
  width: 0.03,           // meters (0.02-0.05 range)
  angle: Math.PI / 6,    // 30° cone angle
  penumbra: 0.5,         // Soft edges
  distance: 5.0,         // meters
  decay: 2,              // Realistic falloff
  shadowBias: -0.0001,   // Requirement 1.7
  downwardAngle: Math.PI / 4, // 45° downward - Requirement 1.2
};

/**
 * Cove light configuration constants
 * 
 * Requirements: 2.1, 2.4, 2.5, 2.8
 */
export const COVE_LIGHT_CONFIG = {
  insetDistance: 0.2,    // meters (0.15-0.25 range) - Requirement 2.1
  distance: 3.0,         // meters (2.0-4.0 range) - Requirement 2.4
  decay: 2,              // Requirement 2.5
  spacing: 0.75,         // meters (0.5-1.0 range) - Requirement 2.8
  maxLights: 12,         // Performance limit
};

/**
 * Backlight configuration constants
 * 
 * Requirements: 3.1, 3.7, 3.8
 */
export const BACKLIGHT_CONFIG = {
  heightOffset: 0.05,    // meters above ceiling - Requirement 3.1
  castShadow: false,     // Requirement 3.7
  coveragePercent: 0.8,  // 80% coverage - Requirement 3.8
};

/**
 * Performance limits
 * 
 * Requirement: 8.1
 */
export const PERFORMANCE_LIMITS = {
  maxActiveLights: 20,   // Maximum simultaneous light sources
  maxFixturePolygons: 500, // Maximum polygons for fixture geometry
};

/**
 * Bloom effect configuration
 * 
 * Requirements: 9.2, 9.3, 9.4, 9.5, 9.6
 */
export const BLOOM_CONFIG = {
  day: {
    intensity: 0.4,      // 0.3-0.5 range - Requirement 9.6
    threshold: 0.8,      // 0.7-0.9 range - Requirement 9.3
    radius: 0.6,         // 0.4-0.8 range - Requirement 9.4
  },
  night: {
    intensity: 0.7,      // 0.6-0.8 range - Requirement 9.5
    threshold: 0.8,      // 0.7-0.9 range - Requirement 9.3
    radius: 0.6,         // 0.4-0.8 range - Requirement 9.4
  },
};
