/**
 * CeilingLightingSystem Component
 * 
 * Main orchestration component for the ceiling lighting system.
 * Manages all ceiling-based light sources including LED strips, cove lights,
 * backlights, and ambient lighting. Integrates with editorStore for room
 * configuration and time of day state.
 * 
 * Requirements: 5.1, 5.2, 8.7, 10.1, 10.2, 10.3, 10.4, 10.7, 13.4, 14.1, 14.4, 14.5
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useEditorStore } from '../../../store/editorStore';
import { LEDStripLights } from './ceiling-lighting/LEDStripLights';
import { CoveLights } from './ceiling-lighting/CoveLights';
import { Backlights } from './ceiling-lighting/Backlights';
import { AmbientCeilingLight } from './ceiling-lighting/AmbientCeilingLight';
import { useLightController } from './ceiling-lighting/useLightController';
import { validateCeilingLightingConfig } from './ceiling-lighting/validation';
import {
  CeilingLightingConfig,
  DEFAULT_ROOM_DIMENSIONS,
  MIN_ROOM_DIMENSIONS,
} from './ceiling-lighting/config';

/**
 * Performance monitoring configuration (Requirement 8.7)
 */
const PERFORMANCE_CONFIG = {
  targetFPS: 30,                    // Minimum acceptable FPS
  frameCountForAverage: 60,         // Log average every 60 frames
  enableMonitoring: true,           // Enable/disable performance monitoring
};

/**
 * Props interface for CeilingLightingSystem component
 */
export interface CeilingLightingSystemProps {
  // Optional overrides for testing or customization
  enableBloom?: boolean;
  enableFixtureGeometry?: boolean;
  customConfig?: Partial<CeilingLightingConfig>;
}

/**
 * CeilingLightingSystem Component
 * 
 * Orchestrates all ceiling lighting components and manages configuration.
 * Reads room dimensions and time of day from editorStore, validates configuration,
 * calculates light intensities, and renders all child light components.
 * 
 * @param props - Component props
 * @returns JSX element with all ceiling lights
 */
export const CeilingLightingSystem: React.FC<CeilingLightingSystemProps> = ({
  enableBloom,
  enableFixtureGeometry,
  customConfig,
}) => {
  // Read roomConfig from editorStore (Requirements 10.1, 10.2, 10.3)
  const roomConfig = useEditorStore((state) => state.roomConfig);

  // Performance monitoring refs (Requirement 8.7)
  const frameCountRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastLogTimeRef = useRef(0);

  // Initialize lastLogTimeRef on mount
  useEffect(() => {
    lastLogTimeRef.current = performance.now();
  }, []);

  // Extract and validate room dimensions with fallbacks (Requirement 14.4, 8.8)
  const roomDimensions = useMemo(() => {
    try {
      const width = roomConfig?.width ?? DEFAULT_ROOM_DIMENSIONS.width;
      const depth = roomConfig?.depth ?? DEFAULT_ROOM_DIMENSIONS.depth;
      const height = roomConfig?.height ?? DEFAULT_ROOM_DIMENSIONS.height;

      // Ensure minimum dimensions to prevent invalid calculations
      return {
        width: Math.max(width, MIN_ROOM_DIMENSIONS.width),
        depth: Math.max(depth, MIN_ROOM_DIMENSIONS.depth),
        height: Math.max(height, MIN_ROOM_DIMENSIONS.height),
      };
    } catch (error) {
      console.error('[CeilingLighting] Failed to read room dimensions:', error);
      return DEFAULT_ROOM_DIMENSIONS;
    }
  }, [roomConfig]);

  // Get ceiling color with fallback (Requirement 10.1, 8.8)
  const ceilingColor = useMemo(() => {
    return roomConfig?.ceilingColor ?? '#FAFAF9';
  }, [roomConfig]);

  // Load and validate configuration (Requirements 13.4, 14.1, 8.8)
  const validatedConfig = useMemo(() => {
    try {
      // Merge custom config with stored config from roomConfig
      const storedConfig = roomConfig?.ceilingLighting;
      const mergedConfig = {
        ...storedConfig,
        ...customConfig,
      };

      // Override bloom and fixture geometry if provided as props
      if (enableBloom !== undefined) {
        mergedConfig.enableBloom = enableBloom;
      }
      if (enableFixtureGeometry !== undefined) {
        mergedConfig.showFixtureGeometry = enableFixtureGeometry;
      }

      // Validate and return configuration
      return validateCeilingLightingConfig(mergedConfig);
    } catch (error) {
      console.error('[CeilingLighting] Configuration loading failed:', error);
      return validateCeilingLightingConfig(undefined);
    }
  }, [roomConfig, customConfig, enableBloom, enableFixtureGeometry]);

  // Use light controller hook to calculate intensities (Requirements 5.1, 5.2)
  const intensities = useLightController(validatedConfig);

  // Determine if fixture geometry should be shown (Requirement 8.8)
  const showFixtures = useMemo(() => {
    return validatedConfig.showFixtureGeometry;
  }, [validatedConfig.showFixtureGeometry]);

  // Performance monitoring using useFrame (Requirement 8.7)
  useFrame((state, delta) => {
    if (!PERFORMANCE_CONFIG.enableMonitoring) return;

    // Increment frame count
    frameCountRef.current += 1;

    // Calculate frame time in milliseconds
    const frameTimeMs = delta * 1000;
    frameTimesRef.current.push(frameTimeMs);

    // Keep performance metrics internal; avoid customer/browser console noise.
    if (frameCountRef.current % PERFORMANCE_CONFIG.frameCountForAverage === 0) {
      frameTimesRef.current = [];
      lastLogTimeRef.current = performance.now();
    }
  });

  // Render all light components (Requirement 10.7)
  return (
    <group name="ceiling-lighting-system">
      {/* LED Strip Lights - Requirements 1.1-1.7 */}
      {validatedConfig.ledStrip.enabled && (
        <>
          {(() => {
            try {
              return (
                <LEDStripLights
                  roomWidth={roomDimensions.width}
                  roomDepth={roomDimensions.depth}
                  roomHeight={roomDimensions.height}
                  color={validatedConfig.ledStrip.color}
                  intensity={intensities.ledStrip}
                  showFixtures={showFixtures}
                />
              );
            } catch (error) {
              // Continue with remaining lights if LED strips fail (Requirement 14.1)
              console.error('[CeilingLighting] Failed to render LED strip lights:', error);
              return null;
            }
          })()}
        </>
      )}

      {/* Cove Lights - Requirements 2.1-2.8 */}
      {validatedConfig.coveLight.enabled && (
        <>
          {(() => {
            try {
              return (
                <CoveLights
                  roomWidth={roomDimensions.width}
                  roomDepth={roomDimensions.depth}
                  roomHeight={roomDimensions.height}
                  color={validatedConfig.coveLight.color}
                  intensity={intensities.coveLight}
                  showFixtures={showFixtures}
                />
              );
            } catch (error) {
              // Continue with remaining lights if cove lights fail (Requirement 14.1)
              console.error('[CeilingLighting] Failed to render cove lights:', error);
              return null;
            }
          })()}
        </>
      )}

      {/* Backlights - Requirements 3.1-3.8 */}
      {validatedConfig.backlight.enabled && (
        <>
          {(() => {
            try {
              return (
                <Backlights
                  roomWidth={roomDimensions.width}
                  roomDepth={roomDimensions.depth}
                  roomHeight={roomDimensions.height}
                  color={validatedConfig.backlight.color}
                  intensity={intensities.backlight}
                />
              );
            } catch (error) {
              // Continue with remaining lights if backlights fail (Requirement 14.1)
              console.error('[CeilingLighting] Failed to render backlights:', error);
              return null;
            }
          })()}
        </>
      )}

      {/* Ambient Ceiling Light - Requirements 4.1-4.7 */}
      {validatedConfig.ambient.enabled && (
        <>
          {(() => {
            try {
              return (
                <AmbientCeilingLight
                  roomWidth={roomDimensions.width}
                  roomDepth={roomDimensions.depth}
                  roomHeight={roomDimensions.height}
                  ceilingColor={ceilingColor}
                  color={validatedConfig.ambient.color}
                  intensity={intensities.ambient}
                />
              );
            } catch (error) {
              // Continue with remaining lights if ambient light fails (Requirement 14.1)
              console.error('[CeilingLighting] Failed to render ambient ceiling light:', error);
              return null;
            }
          })()}
        </>
      )}
    </group>
  );
};

export default CeilingLightingSystem;
