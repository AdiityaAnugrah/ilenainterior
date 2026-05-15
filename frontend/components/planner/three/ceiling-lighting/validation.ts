/**
 * Ceiling Lighting System Validation Utilities
 * 
 * This file contains validation functions for ceiling lighting configuration,
 * including hex color validation, intensity clamping, and configuration validation.
 * 
 * Requirements: 6.2, 6.3, 7.1, 7.6, 14.1, 14.6, 14.7
 */

import {
  CeilingLightingConfig,
  LightConfig,
  DEFAULT_CEILING_LIGHTING_CONFIG,
} from './config';

/**
 * Validates if a string is a valid hex color in the format #RRGGBB
 * 
 * Requirement 6.2: Validate color values to ensure they are valid hex colors
 * 
 * @param color - The color string to validate
 * @returns true if the color is a valid hex color, false otherwise
 * 
 * @example
 * isValidHexColor('#FFFFFF') // true
 * isValidHexColor('#FFF8E1') // true
 * isValidHexColor('invalid') // false
 * isValidHexColor('#FFF') // false (must be 6 digits)
 * isValidHexColor('#GGGGGG') // false (invalid hex characters)
 */
export function isValidHexColor(color: unknown): boolean {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Clamps a numeric value to a specified range [min, max]
 * 
 * Requirement 7.1: Accept custom intensity multipliers between 0.0 and 2.0
 * Requirement 7.6: Clamp final intensity values to prevent negative values
 * 
 * @param value - The value to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value within [min, max]
 * 
 * @example
 * clamp(1.5, 0.0, 2.0) // 1.5
 * clamp(-0.5, 0.0, 2.0) // 0.0
 * clamp(3.0, 0.0, 2.0) // 2.0
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validates and normalizes a single light configuration
 * 
 * Requirements:
 * - 6.2: Validate color values
 * - 6.3: Use default color for invalid values
 * - 7.1: Accept intensity multipliers between 0.0 and 2.0
 * - 7.6: Clamp intensity values
 * - 14.6: Fall back to default colors for invalid values
 * - 14.7: Clamp intensity values to valid ranges
 * 
 * @param config - The light configuration to validate (may be partial or invalid)
 * @param defaultConfig - The default configuration to use for fallback values
 * @returns A validated and normalized light configuration
 * 
 * @example
 * validateLightConfig(
 *   { enabled: true, color: 'invalid', intensityMultiplier: 5.0 },
 *   { enabled: true, color: '#FFFFFF', intensityMultiplier: 1.0 }
 * )
 * // Returns: { enabled: true, color: '#FFFFFF', intensityMultiplier: 2.0 }
 */
export function validateLightConfig(
  config: unknown,
  defaultConfig: LightConfig
): LightConfig {
  const lightConfig = config as Partial<LightConfig> | undefined;
  
  // Validate enabled flag
  const enabled = typeof lightConfig?.enabled === 'boolean' 
    ? lightConfig.enabled 
    : defaultConfig.enabled;

  // Validate color - use default if invalid
  let color = defaultConfig.color;
  if (lightConfig && isValidHexColor(lightConfig.color)) {
    color = lightConfig.color as string;
  } else if (lightConfig?.color !== undefined) {
    // Log warning only if a color was provided but is invalid
    console.warn(
      `[CeilingLighting] Invalid color value "${lightConfig.color}", using default "${defaultConfig.color}"`
    );
  }

  // Validate and clamp intensity multiplier
  let intensityMultiplier = defaultConfig.intensityMultiplier;
  if (typeof lightConfig?.intensityMultiplier === 'number') {
    const originalValue = lightConfig.intensityMultiplier;
    intensityMultiplier = clamp(originalValue, 0.0, 2.0);
    
    // Log warning if value was clamped
    if (originalValue !== intensityMultiplier) {
      console.warn(
        `[CeilingLighting] Intensity multiplier ${originalValue} out of range [0.0, 2.0], clamped to ${intensityMultiplier}`
      );
    }
  }

  return {
    enabled,
    color,
    intensityMultiplier,
  };
}

/**
 * Validates and normalizes the complete ceiling lighting configuration
 * 
 * Requirements:
 * - 6.2: Validate color values to ensure they are valid hex colors
 * - 6.3: Use default color for invalid values
 * - 7.1: Accept custom intensity multipliers between 0.0 and 2.0
 * - 7.6: Clamp final intensity values to prevent negative values
 * - 14.1: Log an error and continue with remaining lights if initialization fails
 * - 14.6: Fall back to default colors if custom color values are invalid
 * - 14.7: Clamp intensity values to valid ranges if out of range
 * 
 * @param config - The configuration to validate (may be undefined, partial, or invalid)
 * @returns A fully validated and normalized ceiling lighting configuration
 * 
 * @example
 * validateCeilingLightingConfig(undefined)
 * // Returns: DEFAULT_CEILING_LIGHTING_CONFIG
 * 
 * validateCeilingLightingConfig({
 *   ledStrip: { enabled: true, color: 'invalid', intensityMultiplier: 3.0 }
 * })
 * // Returns: Config with default color and clamped intensity (2.0)
 */
export function validateCeilingLightingConfig(
  config: Partial<CeilingLightingConfig> | undefined
): CeilingLightingConfig {
  const defaultConfig = DEFAULT_CEILING_LIGHTING_CONFIG;

  // If no configuration provided, use defaults
  if (!config) {
    console.warn('[CeilingLighting] No configuration found, using defaults');
    return defaultConfig;
  }

  try {
    // Validate and merge each light type configuration
    const validated: CeilingLightingConfig = {
      version: config.version ?? defaultConfig.version,
      
      ledStrip: validateLightConfig(
        config.ledStrip,
        defaultConfig.ledStrip
      ),
      
      coveLight: validateLightConfig(
        config.coveLight,
        defaultConfig.coveLight
      ),
      
      backlight: validateLightConfig(
        config.backlight,
        defaultConfig.backlight
      ),
      
      ambient: validateLightConfig(
        config.ambient,
        defaultConfig.ambient
      ),
      
      enableBloom: typeof config.enableBloom === 'boolean'
        ? config.enableBloom
        : defaultConfig.enableBloom,
      
      showFixtureGeometry: typeof config.showFixtureGeometry === 'boolean'
        ? config.showFixtureGeometry
        : defaultConfig.showFixtureGeometry,
    };

    return validated;
  } catch (error) {
    // Requirement 14.1: Log error and continue with defaults
    console.error('[CeilingLighting] Configuration validation failed:', error);
    return defaultConfig;
  }
}
