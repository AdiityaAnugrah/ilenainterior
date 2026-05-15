/**
 * AmbientCeilingLight Component
 * 
 * Provides soft ambient illumination simulating light reflected from the ceiling.
 * Uses HemisphereLight with white sky color and ceiling-colored ground for realistic ambient lighting.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import React, { useMemo } from 'react';

/**
 * Props interface for AmbientCeilingLight component
 */
export interface AmbientCeilingLightProps {
  ceilingColor: string;
  color: string;
  intensity: number;
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
}

/**
 * AmbientCeilingLight Component
 * 
 * Positions a HemisphereLight at the room center at ceiling height to provide
 * soft ambient illumination that simulates light reflected from the ceiling.
 * 
 * @param props - Component props
 * @returns JSX element with ambient ceiling light
 */
export const AmbientCeilingLight: React.FC<AmbientCeilingLightProps> = ({
  ceilingColor,
  color,
  intensity,
  roomHeight,
}) => {
  // Calculate position at room center at ceiling height (Requirement 4.1, 4.5, 8.8)
  const position = useMemo(() => {
    try {
      // Add null checks for room dimensions (Requirement 14.4)
      const validHeight = roomHeight || 3;
      const x = 0; // Center of room
      const y = validHeight; // At ceiling height
      const z = 0; // Center of room
      return [x, y, z] as [number, number, number];
    } catch (error) {
      console.error('[CeilingLighting] Failed to calculate ambient light position:', error);
      // Return default position for graceful degradation (Requirement 14.1)
      return [0, 3, 0] as [number, number, number];
    }
  }, [roomHeight]);

  // Validate colors with useMemo (Requirement 8.8)
  const validatedColors = useMemo(() => {
    return {
      ceilingColor: ceilingColor || '#FAFAF9',
      color: color || '#FFFDF7',
    };
  }, [ceilingColor, color]);

  // Don't render if intensity is 0 (disabled)
  if (intensity <= 0) {
    return null;
  }

  // Validate position before rendering (Requirement 14.8)
  if (!position || position.length !== 3) {
    console.error('[CeilingLighting] Invalid ambient light position, skipping render');
    return null;
  }

  return (
    <group name="ambient-ceiling-light">
      {/* HemisphereLight for ambient ceiling illumination (Requirements 4.1, 4.2, 4.5, 4.6, 4.7) */}
      <hemisphereLight
        position={position}
        color="#FFFFFF" // skyColor - white (Requirement 4.5)
        groundColor={validatedColors.ceilingColor} // groundColor - ceiling color (Requirement 4.5)
        intensity={intensity} // calculated intensity (Requirements 4.3, 4.4)
        // castShadow is not applicable to HemisphereLight (always false) - Requirement 4.6
      />
    </group>
  );
};

export default AmbientCeilingLight;
