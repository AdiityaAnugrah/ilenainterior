/**
 * Ceiling Lighting System Calculations
 * 
 * This file contains utility functions for calculating light intensities and positions
 * for the ceiling lighting system.
 * 
 * Requirements: 1.1, 1.5, 1.6, 2.1, 2.6, 2.7, 2.8, 5.4, 5.5, 7.4, 8.1, 14.4
 */

import {
  CeilingLightingConfig,
  LightIntensities,
  BASE_INTENSITIES,
  DEFAULT_ROOM_DIMENSIONS,
  MIN_ROOM_DIMENSIONS,
  COVE_LIGHT_CONFIG,
} from './config';

/**
 * Calculate light intensities for all light types based on time of day and configuration
 * 
 * Applies base intensities for day/night modes and user-defined intensity multipliers.
 * Clamps final values to prevent negative or excessive brightness.
 * Enforces combined intensity limit of 2.0 to prevent overexposure (Requirement 4.8).
 * 
 * COMPLEX LOGIC EXPLANATION:
 * This function implements a two-stage intensity calculation:
 * 
 * Stage 1: Calculate individual light intensities
 * - Start with base intensity for current time of day (day/night)
 * - Multiply by user's custom intensity multiplier (0.0-2.0 range)
 * - Clamp to non-negative values (disabled lights = 0)
 * 
 * Stage 2: Enforce combined intensity limit (Requirement 4.8)
 * - Sum all individual intensities
 * - If total exceeds 2.0, scale ALL lights down proportionally
 * - This prevents overexposure while maintaining relative brightness ratios
 * 
 * Example: If combined intensity is 3.0 (exceeds 2.0 limit):
 * - Scale factor = 2.0 / 3.0 = 0.667
 * - All lights reduced to 66.7% of their calculated intensity
 * - Final combined intensity = exactly 2.0
 * 
 * Requirements: 1.5, 1.6, 2.6, 2.7, 4.8, 5.4, 5.5, 7.4
 * 
 * @param timeOfDay - Current time of day ('day' or 'night')
 * @param config - Ceiling lighting configuration with intensity multipliers
 * @returns Calculated intensities for each light type
 */
export function calculateLightIntensities(
  timeOfDay: 'day' | 'night' | undefined,
  config: CeilingLightingConfig
): LightIntensities {
  // Fallback to 'day' if timeOfDay is undefined (Requirement 14.5)
  const mode = timeOfDay ?? 'day';
  
  // Get base intensities for the current mode (day or night)
  // Day mode: subtle accent lighting (lower intensities)
  // Night mode: primary illumination (higher intensities)
  const baseIntensities = BASE_INTENSITIES[mode];
  
  // STAGE 1: Calculate individual light intensities
  // Formula: finalIntensity = baseIntensity × userMultiplier (if enabled, else 0)
  // Math.max(0, ...) ensures no negative values
  
  let ledStrip = config.ledStrip.enabled
    ? Math.max(0, baseIntensities.ledStrip * config.ledStrip.intensityMultiplier)
    : 0;
  
  let coveLight = config.coveLight.enabled
    ? Math.max(0, baseIntensities.coveLight * config.coveLight.intensityMultiplier)
    : 0;
  
  let backlight = config.backlight.enabled
    ? Math.max(0, baseIntensities.backlight * config.backlight.intensityMultiplier)
    : 0;
  
  let ambient = config.ambient.enabled
    ? Math.max(0, baseIntensities.ambient * config.ambient.intensityMultiplier)
    : 0;
  
  // STAGE 2: Enforce combined intensity limit (Requirement 4.8)
  // This prevents overexposure when multiple lights are at high intensity
  const combinedIntensity = ledStrip + coveLight + backlight + ambient;
  const MAX_COMBINED_INTENSITY = 2.0;
  
  if (combinedIntensity > MAX_COMBINED_INTENSITY) {
    // Calculate proportional scale factor to bring total down to limit
    // Example: combined = 3.0, limit = 2.0 → scaleFactor = 2.0/3.0 = 0.667
    const scaleFactor = MAX_COMBINED_INTENSITY / combinedIntensity;
    
    // Apply scale factor to ALL lights proportionally
    // This maintains the relative brightness ratios between light types
    ledStrip *= scaleFactor;
    coveLight *= scaleFactor;
    backlight *= scaleFactor;
    ambient *= scaleFactor;
    
    console.warn(
      `[CeilingLighting] Combined intensity (${combinedIntensity.toFixed(3)}) exceeds limit (${MAX_COMBINED_INTENSITY}). ` +
      `Scaling down by factor ${scaleFactor.toFixed(3)} to prevent overexposure.`
    );
  }
  
  return {
    ledStrip,
    coveLight,
    backlight,
    ambient,
  };
}

/**
 * Calculate LED strip light positions at ceiling corners
 * 
 * Positions 4 SpotLight instances at ceiling corners with 0.1m inset from edges
 * and 0.05m below the ceiling plane.
 * 
 * Requirements: 1.1, 14.4
 * 
 * @param roomWidth - Room width in meters (undefined uses default)
 * @param roomDepth - Room depth in meters (undefined uses default)
 * @param roomHeight - Room height in meters (undefined uses default)
 * @returns Array of 4 position vectors [x, y, z] for corner lights
 */
export function calculateLEDStripPositions(
  roomWidth: number | undefined,
  roomDepth: number | undefined,
  roomHeight: number | undefined
): [number, number, number][] {
  // Use fallback dimensions if undefined (Requirement 14.4)
  const width = roomWidth ?? DEFAULT_ROOM_DIMENSIONS.width;
  const depth = roomDepth ?? DEFAULT_ROOM_DIMENSIONS.depth;
  const height = roomHeight ?? DEFAULT_ROOM_DIMENSIONS.height;
  
  // Ensure minimum dimensions
  const W = Math.max(width, MIN_ROOM_DIMENSIONS.width);
  const D = Math.max(depth, MIN_ROOM_DIMENSIONS.depth);
  const H = Math.max(height, MIN_ROOM_DIMENSIONS.height);
  
  // Inset from edges and below ceiling
  const inset = 0.1; // meters
  const belowCeiling = 0.05; // meters
  
  // Calculate corner positions (Requirement 1.1)
  // Order: NW, NE, SW, SE
  return [
    [-W / 2 + inset, H - belowCeiling, -D / 2 + inset], // Northwest corner
    [W / 2 - inset, H - belowCeiling, -D / 2 + inset],  // Northeast corner
    [-W / 2 + inset, H - belowCeiling, D / 2 - inset],  // Southwest corner
    [W / 2 - inset, H - belowCeiling, D / 2 - inset],   // Southeast corner
  ];
}

/**
 * Calculate cove light positions distributed along ceiling perimeter
 * 
 * Distributes PointLight instances evenly along the perimeter with 0.75m spacing,
 * inset 0.2m from the edges, with a maximum of 12 lights for performance.
 * 
 * COMPLEX LOGIC EXPLANATION:
 * This function distributes lights along the room's perimeter by treating it as a
 * continuous path. It calculates a "distance along perimeter" for each light, then
 * determines which wall segment that distance falls on, and calculates the x,z
 * coordinates accordingly.
 * 
 * The perimeter is divided into 4 segments:
 * 1. North wall: distance 0 to W (moving east, left to right)
 * 2. East wall: distance W to W+D (moving south, back to front)
 * 3. South wall: distance W+D to 2W+D (moving west, right to left)
 * 4. West wall: distance 2W+D to 2W+2D (moving north, front to back)
 * 
 * Requirements: 2.1, 2.6, 2.7, 2.8, 8.1, 14.4
 * 
 * @param roomWidth - Room width in meters (undefined uses default)
 * @param roomDepth - Room depth in meters (undefined uses default)
 * @param roomHeight - Room height in meters (undefined uses default)
 * @returns Array of position vectors [x, y, z] for cove lights
 */
export function calculateCoveLightPositions(
  roomWidth: number | undefined,
  roomDepth: number | undefined,
  roomHeight: number | undefined
): [number, number, number][] {
  // Use fallback dimensions if undefined (Requirement 14.4)
  const width = roomWidth ?? DEFAULT_ROOM_DIMENSIONS.width;
  const depth = roomDepth ?? DEFAULT_ROOM_DIMENSIONS.depth;
  const height = roomHeight ?? DEFAULT_ROOM_DIMENSIONS.height;
  
  // Ensure minimum dimensions to prevent invalid calculations
  const W = Math.max(width, MIN_ROOM_DIMENSIONS.width);
  const D = Math.max(depth, MIN_ROOM_DIMENSIONS.depth);
  const H = Math.max(height, MIN_ROOM_DIMENSIONS.height);
  
  const inset = COVE_LIGHT_CONFIG.insetDistance; // 0.2m (Requirement 2.1)
  const spacing = COVE_LIGHT_CONFIG.spacing; // 0.75m (Requirement 2.8)
  const maxLights = COVE_LIGHT_CONFIG.maxLights; // 12 (Requirement 8.1)
  
  // Calculate total perimeter length (sum of all 4 walls)
  const perimeter = 2 * (W + D);
  
  // Calculate how many lights we would ideally place based on spacing
  const idealLightCount = Math.ceil(perimeter / spacing);
  
  // Cap at maximum for performance (Requirement 8.1)
  const lightCount = Math.min(maxLights, idealLightCount);
  
  // Recalculate spacing to distribute lights evenly along the actual perimeter
  // This ensures lights are evenly spaced even if we hit the max light limit
  const actualSpacing = perimeter / lightCount;
  
  const positions: [number, number, number][] = [];
  let distanceAlongPerimeter = 0;
  
  // Distribute lights along perimeter by calculating position for each light
  for (let i = 0; i < lightCount; i++) {
    // Calculate how far along the perimeter this light should be placed
    distanceAlongPerimeter = i * actualSpacing;
    
    let x: number, z: number;
    
    // Determine which wall segment this distance falls on and calculate position
    // The room is centered at origin (0, 0), so we use -W/2 to W/2 for x-axis
    // and -D/2 to D/2 for z-axis
    
    // SEGMENT 1: North wall (back wall, moving east/right)
    // Distance range: [0, W]
    if (distanceAlongPerimeter < W) {
      x = -W / 2 + distanceAlongPerimeter; // Start at left edge, move right
      z = -D / 2 + inset; // Fixed z position, inset from back wall
    }
    // SEGMENT 2: East wall (right wall, moving south/forward)
    // Distance range: [W, W+D]
    else if (distanceAlongPerimeter < W + D) {
      x = W / 2 - inset; // Fixed x position, inset from right wall
      z = -D / 2 + (distanceAlongPerimeter - W); // Start at back, move forward
    }
    // SEGMENT 3: South wall (front wall, moving west/left)
    // Distance range: [W+D, 2W+D]
    else if (distanceAlongPerimeter < 2 * W + D) {
      x = W / 2 - (distanceAlongPerimeter - W - D); // Start at right edge, move left
      z = D / 2 - inset; // Fixed z position, inset from front wall
    }
    // SEGMENT 4: West wall (left wall, moving north/backward)
    // Distance range: [2W+D, 2W+2D]
    else {
      x = -W / 2 + inset; // Fixed x position, inset from left wall
      z = D / 2 - (distanceAlongPerimeter - 2 * W - D); // Start at front, move back
    }
    
    // Position at ceiling height, slightly below the ceiling plane
    // This creates the cove lighting effect where lights are recessed
    const y = H - 0.05; // 5cm below ceiling
    
    positions.push([x, y, z]);
  }
  
  return positions;
}

/**
 * Get room dimensions with fallback to defaults
 * 
 * Helper function to safely extract room dimensions with fallback values.
 * 
 * Requirement: 14.4
 * 
 * @param roomConfig - Room configuration object (may be undefined)
 * @returns Object with width, depth, and height in meters
 */
export function getRoomDimensions(roomConfig: unknown): {
  width: number;
  depth: number;
  height: number;
} {
  const config = roomConfig as { width?: number; depth?: number; height?: number } | undefined;
  return {
    width: config?.width ?? DEFAULT_ROOM_DIMENSIONS.width,
    depth: config?.depth ?? DEFAULT_ROOM_DIMENSIONS.depth,
    height: config?.height ?? DEFAULT_ROOM_DIMENSIONS.height,
  };
}
