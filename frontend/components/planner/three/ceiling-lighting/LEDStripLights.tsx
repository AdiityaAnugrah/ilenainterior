/**
 * LED Strip Lights Component
 * 
 * Renders hidden LED strip lights along the ceiling perimeter using SpotLight instances
 * positioned at ceiling corners, angled 45° downward toward walls.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.2, 8.5, 8.8
 */

import React, { useMemo } from 'react';
import { SpotLight } from '@react-three/drei';
import { calculateLEDStripPositions } from './calculations';
import { LED_STRIP_CONFIG } from './config';
import * as THREE from 'three';

/**
 * Props interface for LEDStripLights component
 */
export interface LEDStripLightsProps {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  color: string;
  intensity: number;
  showFixtures: boolean;
}

/**
 * LEDStripLights Component
 * 
 * Positions 4 SpotLight instances at ceiling corners with proper configuration
 * for realistic LED strip lighting effects.
 * 
 * @param props - Component props
 * @returns JSX element with LED strip lights
 */
export const LEDStripLights: React.FC<LEDStripLightsProps> = ({
  roomWidth,
  roomDepth,
  roomHeight,
  color,
  intensity,
  showFixtures,
}) => {
  // Calculate light positions at ceiling corners (Requirement 1.1)
  const positions = useMemo(() => {
    try {
      // Add null checks for room dimensions (Requirement 14.4)
      if (!roomWidth || !roomDepth || !roomHeight) {
        console.warn('[CeilingLighting] Invalid room dimensions for LED strips, using defaults');
        return calculateLEDStripPositions(5, 5, 3);
      }
      return calculateLEDStripPositions(roomWidth, roomDepth, roomHeight);
    } catch (error) {
      console.error('[CeilingLighting] Failed to calculate LED strip positions:', error);
      // Return empty array for graceful degradation (Requirement 14.1)
      return [];
    }
  }, [roomWidth, roomDepth, roomHeight]);

  // Calculate target positions for 45° downward angle (Requirement 1.2)
  const targets = useMemo(() => {
    try {
      const inset = 0.1;
      const W = roomWidth || 5;
      const D = roomDepth || 5;
      const H = roomHeight || 3;
      
      // Targets are positioned on the walls at mid-height, angled toward walls
      return [
        [-W / 2 + inset, H / 2, -D / 2], // NW -> North wall
        [W / 2 - inset, H / 2, -D / 2],  // NE -> North wall
        [-W / 2 + inset, H / 2, D / 2],  // SW -> South wall
        [W / 2 - inset, H / 2, D / 2],   // SE -> South wall
      ] as [number, number, number][];
    } catch (error) {
      console.error('[CeilingLighting] Failed to calculate LED strip targets:', error);
      // Return default targets for graceful degradation
      return [[0, 1.5, 0], [0, 1.5, 0], [0, 1.5, 0], [0, 1.5, 0]] as [number, number, number][];
    }
  }, [roomWidth, roomDepth, roomHeight]);

  // Create fixture geometry (optional, Requirement 12.1, 12.2)
  const fixtureGeometry = useMemo(() => {
    if (!showFixtures) return null;
    
    try {
      // Thin rectangular box for LED strip fixture (Requirement 14.2)
      return new THREE.BoxGeometry(LED_STRIP_CONFIG.width, 0.01, LED_STRIP_CONFIG.width);
    } catch (error) {
      console.error('[CeilingLighting] Failed to create LED strip fixture geometry:', error);
      // Return null for graceful degradation - lights will render without fixtures (Requirement 14.2)
      return null;
    }
  }, [showFixtures]);

  // Create emissive material for fixtures (Requirement 12.3, 12.4)
  const fixtureMaterial = useMemo(() => {
    if (!showFixtures) return null;
    
    try {
      // Validate color before creating material (Requirement 14.6)
      const validColor = color || '#FFF8E1';
      return new THREE.MeshStandardMaterial({
        color: validColor,
        emissive: validColor,
        emissiveIntensity: intensity > 0 ? Math.min(1.5, 0.5 + intensity) : 0,
        metalness: 0.3,
        roughness: 0.7,
      });
    } catch (error) {
      console.error('[CeilingLighting] Failed to create LED strip fixture material:', error);
      // Fallback to basic material (Requirement 14.3)
      try {
        return new THREE.MeshBasicMaterial({ color: '#FFF8E1' });
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
    console.warn('[CeilingLighting] No LED strip positions available, skipping render');
    return null;
  }

  return (
    <group name="led-strip-lights">
      {positions.map((position, index) => {
        try {
          // Validate position data (Requirement 14.8)
          if (!position || position.length !== 3) {
            console.warn(`[CeilingLighting] Invalid LED strip position at index ${index}, skipping`);
            return null;
          }

          return (
            <group key={`led-strip-${index}`} position={position}>
              {/* SpotLight with proper configuration (Requirements 1.2, 1.3, 1.4, 1.7) */}
              <SpotLight
                color={color || '#FFF8E1'}
                intensity={intensity}
                angle={LED_STRIP_CONFIG.angle} // π/6 (30° cone)
                penumbra={LED_STRIP_CONFIG.penumbra} // 0.5 (soft edges)
                distance={LED_STRIP_CONFIG.distance} // 5m
                decay={LED_STRIP_CONFIG.decay} // 2 (realistic falloff)
                castShadow={true} // Requirement 1.7
                shadow-bias={LED_STRIP_CONFIG.shadowBias} // -0.0001
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                target-position={targets[index] || [0, 1.5, 0]}
              />
              
              {/* Optional fixture geometry (Requirements 12.1, 12.2, 12.3, 12.4) */}
              {showFixtures && fixtureGeometry && fixtureMaterial && (
                <mesh geometry={fixtureGeometry} material={fixtureMaterial} />
              )}
            </group>
          );
        } catch (error) {
          // Continue with remaining lights if one fails (Requirement 14.1)
          console.error(`[CeilingLighting] Failed to render LED strip at index ${index}:`, error);
          return null;
        }
      })}
    </group>
  );
};

export default LEDStripLights;
