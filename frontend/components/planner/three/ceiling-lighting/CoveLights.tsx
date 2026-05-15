/**
 * Cove Lights Component
 * 
 * Renders cove lighting with indirect illumination using PointLight instances
 * distributed evenly along the ceiling perimeter, inset from the edges.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 8.2, 8.5, 8.8
 */

import React, { useMemo } from 'react';
import { calculateCoveLightPositions } from './calculations';
import { COVE_LIGHT_CONFIG } from './config';
import * as THREE from 'three';

/**
 * Props interface for CoveLights component
 */
export interface CoveLightsProps {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  color: string;
  intensity: number;
  showFixtures: boolean;
}

/**
 * CoveLights Component
 * 
 * Distributes PointLight instances evenly along the ceiling perimeter with proper
 * configuration for realistic cove lighting effects with indirect illumination.
 * 
 * @param props - Component props
 * @returns JSX element with cove lights
 */
export const CoveLights: React.FC<CoveLightsProps> = ({
  roomWidth,
  roomDepth,
  roomHeight,
  color,
  intensity,
  showFixtures,
}) => {
  // Calculate light positions along ceiling perimeter (Requirements 2.1, 2.8, 8.1)
  const positions = useMemo(() => {
    try {
      // Add null checks for room dimensions (Requirement 14.4)
      if (!roomWidth || !roomDepth || !roomHeight) {
        console.warn('[CeilingLighting] Invalid room dimensions for cove lights, using defaults');
        return calculateCoveLightPositions(5, 5, 3);
      }
      return calculateCoveLightPositions(roomWidth, roomDepth, roomHeight);
    } catch (error) {
      console.error('[CeilingLighting] Failed to calculate cove light positions:', error);
      // Return empty array for graceful degradation (Requirement 14.1)
      return [];
    }
  }, [roomWidth, roomDepth, roomHeight]);

  // Create fixture geometry (optional, Requirement 12.5)
  const fixtureGeometry = useMemo(() => {
    if (!showFixtures) return null;
    
    try {
      // Small box to represent recessed channel fixture (Requirement 14.2)
      return new THREE.BoxGeometry(0.08, 0.02, 0.08);
    } catch (error) {
      console.error('[CeilingLighting] Failed to create cove light fixture geometry:', error);
      // Return null for graceful degradation - lights will render without fixtures (Requirement 14.2)
      return null;
    }
  }, [showFixtures]);

  // Create emissive material for fixtures (Requirement 12.5)
  const fixtureMaterial = useMemo(() => {
    if (!showFixtures) return null;
    
    try {
      // Validate color before creating material (Requirement 14.6)
      const validColor = color || '#FFFAF0';
      return new THREE.MeshStandardMaterial({
        color: validColor,
        emissive: validColor,
        emissiveIntensity: intensity > 0 ? Math.min(1.5, 0.5 + intensity) : 0,
        metalness: 0.2,
        roughness: 0.8,
      });
    } catch (error) {
      console.error('[CeilingLighting] Failed to create cove light fixture material:', error);
      // Fallback to basic material (Requirement 14.3)
      try {
        return new THREE.MeshBasicMaterial({ color: '#FFFAF0' });
      } catch (fallbackError) {
        console.error('[CeilingLighting] Fallback material creation failed:', fallbackError);
        return null;
      }
    }
  }, [showFixtures, color, intensity]);

  // Don't render if intensity is 0 (disabled)
  if (intensity <= 0) {
    return null;
  }

  // Don't render if positions calculation failed (Requirement 14.1)
  if (!positions || positions.length === 0) {
    console.warn('[CeilingLighting] No cove light positions available, skipping render');
    return null;
  }

  return (
    <group name="cove-lights">
      {positions.map((position, index) => {
        try {
          // Validate position data (Requirement 14.8)
          if (!position || position.length !== 3) {
            console.warn(`[CeilingLighting] Invalid cove light position at index ${index}, skipping`);
            return null;
          }

          return (
            <group key={`cove-light-${index}`} position={position}>
              {/* PointLight with proper configuration (Requirements 2.2, 2.3, 2.4, 2.5) */}
              <pointLight
                color={color || '#FFFAF0'}
                intensity={intensity}
                distance={COVE_LIGHT_CONFIG.distance} // 3m (2.0-4.0 range) - Requirement 2.4
                decay={COVE_LIGHT_CONFIG.decay} // 2 (realistic falloff) - Requirement 2.5
                castShadow={true} // Requirement 8.2
                shadow-bias={-0.0001}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              
              {/* Optional fixture geometry (Requirements 12.5, 12.6, 12.7) */}
              {showFixtures && fixtureGeometry && fixtureMaterial && (
                <mesh geometry={fixtureGeometry} material={fixtureMaterial} />
              )}
            </group>
          );
        } catch (error) {
          // Continue with remaining lights if one fails (Requirement 14.1)
          console.error(`[CeilingLighting] Failed to render cove light at index ${index}:`, error);
          return null;
        }
      })}
    </group>
  );
};

export default CoveLights;
