/**
 * Light Controller Hook
 * 
 * Custom React hook that manages light intensity calculations for the ceiling lighting system.
 * Reads timeOfDay from editorStore and calculates intensities based on configuration.
 * 
 * Requirements: 5.1, 5.2, 5.4, 5.5, 7.4, 14.5
 */

import { useEditorStore } from '../../../../store/editorStore';
import { CeilingLightingConfig, LightIntensities } from './config';
import { calculateLightIntensities } from './calculations';

/**
 * Custom hook for managing ceiling light intensities
 * 
 * Reads the current timeOfDay from editorStore and calculates light intensities
 * for all four light types (LED strips, cove lights, backlights, ambient) based
 * on the provided configuration.
 * 
 * Requirements:
 * - 5.1: Read timeOfDay from editorStore using Zustand selector
 * - 5.2: Accept CeilingLightingConfig as parameter
 * - 5.4: Calculate intensities based on day/night
 * - 5.5: Apply intensity multipliers
 * - 7.4: Return LightIntensities object
 * - 14.5: Handle undefined timeOfDay (default to 'day')
 * 
 * @param config - Ceiling lighting configuration with intensity multipliers
 * @returns Calculated intensities for each light type
 * 
 * @example
 * ```tsx
 * const config = DEFAULT_CEILING_LIGHTING_CONFIG;
 * const intensities = useLightController(config);
 * // intensities.ledStrip, intensities.coveLight, etc.
 * ```
 */
export function useLightController(
  config: CeilingLightingConfig
): LightIntensities {
  // Read timeOfDay from editorStore using Zustand selector (Requirement 5.1)
  const timeOfDay = useEditorStore((state) => state.timeOfDay);
  
  // Calculate intensities using the calculation utility (Requirements 5.4, 5.5, 7.4, 14.5)
  const intensities = calculateLightIntensities(timeOfDay, config);
  
  return intensities;
}
