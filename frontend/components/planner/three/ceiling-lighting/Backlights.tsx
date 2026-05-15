/**
 * Backlights Component
 * 
 * Renders indirect backlighting above the ceiling for depth effects using HemisphereLight.
 * Positioned 0.05m above the ceiling plane to create an upward glow effect.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import React, { useMemo } from 'react';
import { BACKLIGHT_CONFIG } from './config';
import * as THREE from 'three';

/**
 * Props interface for Backlights component
 */
export interface BacklightsProps {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  color: string;
  intensity: number;
}

/**
 * Backlights Component
 * 
 * Positions a HemisphereLight above the ceiling plane to create indirect backlighting
 * effects that add depth and dimension to the ceiling design.
 * 
 * @param props - Component props
 * @returns JSX element with backlight
 */
export const Backlights: React.FC<BacklightsProps> = ({
  roomHeight,
  color,
  intensity,
}) => {
  // Calculate position above ceiling (Requirement 3.1, 8.8)
  const position = useMemo(() => {
    try {
      // Add null checks for room dimensions (Requirement 14.4)
      const validHeight = roomHeight || 3;
      const x = 0; // Center of room
      const y = validHeight + BACKLIGHT_CONFIG.heightOffset; // 0.05m above ceiling
      const z = 0; // Center of room
      return [x, y, z] as [number, number, number];
    } catch (error) {
      console.error('[CeilingLighting] Failed to calculate backlight position:', error);
      // Return default position for graceful degradation (Requirement 14.1)
      return [0, 3.05, 0] as [number, number, number];
    }
  }, [roomHeight]);

  // Calculate ground color (darker variant, multiply by 0.5) (Requirement 3.2, 8.8)
  const groundColor = useMemo(() => {
    try {
      // Validate color before processing (Requirement 14.6)
      const validColor = color || '#FFF5E6';
      const threeColor = new THREE.Color(validColor);
      // Multiply RGB values by 0.5 for darker variant
      threeColor.multiplyScalar(0.5);
      return `#${threeColor.getHexString()}`;
    } catch (error) {
      console.error('[CeilingLighting] Failed to calculate backlight ground color:', error);
      // Fallback to a darker default (Requirement 14.6)
      return '#7F7A73';
    }
  }, [color]);

  // Don't render if intensity is 0 (disabled)
  if (intensity <= 0) {
    return null;
  }

  // Validate position before rendering (Requirement 14.8)
  if (!position || position.length !== 3) {
    console.error('[CeilingLighting] Invalid backlight position, skipping render');
    return null;
  }

  return (
    <group name="backlights">
      {/* HemisphereLight for indirect backlighting (Requirements 3.1, 3.2, 3.3, 3.4, 3.7, 3.8) */}
      <hemisphereLight
        position={position}
        color={color || '#FFF5E6'} // skyColor - provided color (Requirement 3.3, 3.4)
        groundColor={groundColor} // darker variant (Requirement 3.2)
        intensity={intensity} // calculated intensity (Requirements 3.5, 3.6)
        // castShadow is not applicable to HemisphereLight (always false) - Requirement 3.7
      />
    </group>
  );
};

export default Backlights;
