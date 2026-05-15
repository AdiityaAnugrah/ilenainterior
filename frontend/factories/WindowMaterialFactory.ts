/**
 * Window Material Factory
 * 
 * Creates realistic materials for window components including glass with transmission,
 * refraction, and time-of-day responsive properties, plus painted wood frames.
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 3.2, 4.1, 4.2, 4.3
 */

import * as THREE from 'three';
import { MaterialPropertyValidator } from '@/utils/materialValidator';

export interface WindowMaterialConfig {
  glassStyle?: 'clear' | 'frosted';
  timeOfDay: 'day' | 'night';
  environmentMap?: THREE.Texture;
}

export class WindowMaterialFactory {
  /**
   * Static material cache to store glass materials by style and time of day
   * Enables material reuse across window instances with matching configurations
   * 
   * Requirements: 1.2, 2.2, 3.2
   */
  private static glassMaterialCache: Map<string, THREE.MeshPhysicalMaterial> = new Map();

  /**
   * Static material cache to store frame materials
   * Enables material reuse across window instances
   * 
   * Requirements: 1.2, 2.2, 3.2
   */
  private static frameMaterialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  /**
   * Generates cache key for glass material from configuration
   * 
   * Requirements: 1.2, 2.2
   * 
   * @param config - Window material configuration
   * @returns Cache key string
   */
  private static getGlassMaterialKey(config: WindowMaterialConfig): string {
    const { glassStyle = 'clear', timeOfDay } = config;
    // Note: environmentMap is excluded from cache key as it's applied after material creation
    return `glass-${glassStyle}-${timeOfDay}`;
  }

  /**
   * Generates cache key for frame material
   * 
   * Requirements: 1.2, 2.2
   * 
   * @returns Cache key string
   */
  private static getFrameMaterialKey(): string {
    return 'frame-painted-wood';
  }

  /**
   * Clears the material caches and disposes of all cached materials
   * Should be called when cleaning up or when memory needs to be freed
   * 
   * Requirements: 1.2, 2.2
   */
  static clearMaterialCache(): void {
    // Dispose of all cached glass materials
    this.glassMaterialCache.forEach((material) => {
      material.dispose();
      // Note: environmentMap is not disposed as it may be shared across materials
    });
    
    // Dispose of all cached frame materials
    this.frameMaterialCache.forEach((material) => {
      material.dispose();
    });
    
    // Clear both caches
    this.glassMaterialCache.clear();
    this.frameMaterialCache.clear();
  }

  /**
   * Creates realistic glass material with transmission, refraction, and time-of-day properties
   * 
   * Uses MeshPhysicalMaterial for advanced glass rendering with:
   * - IOR set to 1.5 for realistic glass refraction
   * - Transmission for light passing through glass
   * - Time-based transparency (0.18-0.25 day, 0.50-0.65 night)
   * - Time-based metalness (0.5-0.8 range, higher at night)
   * - Smooth glass appearance (roughness 0.0-0.1)
   * 
   * Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3
   * 
   * @param config - Window material configuration
   * @returns MeshPhysicalMaterial configured for glass
   */
  static createGlassMaterial(config: WindowMaterialConfig): THREE.MeshPhysicalMaterial {
    try {
      const { glassStyle = 'clear', timeOfDay, environmentMap } = config;
      
      // Generate cache key and check if material already exists
      const cacheKey = this.getGlassMaterialKey(config);
      const cachedMaterial = this.glassMaterialCache.get(cacheKey);
      
      if (cachedMaterial) {
        // Apply environment map to cached material if provided
        // Environment map can vary per instance, so it's applied after cache lookup
        if (environmentMap && cachedMaterial.envMap !== environmentMap) {
          try {
            cachedMaterial.envMap = environmentMap;
            cachedMaterial.needsUpdate = true;
          } catch (error) {
            console.warn('Failed to apply environment map to cached glass material, continuing without it', error);
          }
        }
        
        // Return cached material for reuse across windows with same config
        return cachedMaterial;
      }
      
      const isNight = timeOfDay === 'night';
      
      // Time-based transparency: 0.18-0.25 day, 0.50-0.65 night
      const opacity = isNight 
        ? MaterialPropertyValidator.validateOpacity(0.575) // Mid-range for night (0.50-0.65)
        : MaterialPropertyValidator.validateOpacity(0.215); // Mid-range for day (0.18-0.25)
      
      // Time-based metalness: higher at night (0.1-0.2 increase)
      const metalness = isNight
        ? MaterialPropertyValidator.validateMetalness(0.7) // Higher at night (0.5-0.8 range)
        : MaterialPropertyValidator.validateMetalness(0.55); // Lower during day (0.5-0.8 range)
      
      // Smooth glass roughness (0.0-0.1)
      const roughness = glassStyle === 'frosted'
        ? MaterialPropertyValidator.validateRoughness(0.08) // Slightly higher for frosted
        : MaterialPropertyValidator.validateRoughness(0.02); // Very smooth for clear glass
      
      // Glass tint color based on time of day
      const color = isNight ? '#0A1428' : '#A8CCEC';
      
      // Create physical material with transmission
      const material = new THREE.MeshPhysicalMaterial({
        color,
        transparent: true,
        opacity,
        roughness,
        metalness,
        transmission: 1.0, // Enable light transmission through glass
        ior: MaterialPropertyValidator.validateIOR(1.5), // Realistic glass refraction
        envMapIntensity: 2.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      
      // Apply environment map if provided
      if (environmentMap) {
        try {
          material.envMap = environmentMap;
        } catch (error) {
          console.warn('Failed to apply environment map to glass material, continuing without it', error);
        }
      }
      
      // Cache the material for reuse
      this.glassMaterialCache.set(cacheKey, material);
      
      return material;
    } catch (error) {
      console.error('Failed to create glass material, using basic fallback', error);
      // Last resort: return a basic transparent material
      const isNight = config.timeOfDay === 'night';
      return new THREE.MeshPhysicalMaterial({
        color: isNight ? '#0A1428' : '#A8CCEC',
        transparent: true,
        opacity: isNight ? 0.575 : 0.215,
        roughness: 0.02,
        metalness: isNight ? 0.7 : 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    }
  }

  /**
   * Creates painted wood material for window frame
   * 
   * Requirements: 3.2
   * 
   * @returns MeshStandardMaterial configured for window frame
   */
  static createFrameMaterial(): THREE.MeshStandardMaterial {
    try {
      // Generate cache key and check if material already exists
      const cacheKey = this.getFrameMaterialKey();
      const cachedMaterial = this.frameMaterialCache.get(cacheKey);
      
      if (cachedMaterial) {
        // Return cached material for reuse across windows
        return cachedMaterial;
      }
      
      // Create painted wood material with roughness 0.4-0.6
      const material = new THREE.MeshStandardMaterial({
        color: '#E8E4DE', // Light painted wood color
        roughness: MaterialPropertyValidator.validateRoughness(0.5), // Mid-range for painted wood (0.4-0.6)
        metalness: MaterialPropertyValidator.validateMetalness(0.0),
      });

      // Cache the material for reuse
      this.frameMaterialCache.set(cacheKey, material);

      return material;
    } catch (error) {
      console.error('Failed to create window frame material, using basic fallback', error);
      // Last resort: return a basic material with solid color
      return new THREE.MeshStandardMaterial({
        color: '#E8E4DE',
        roughness: 0.5,
        metalness: 0.0,
      });
    }
  }

  /**
   * Updates glass material properties for time of day changes
   * 
   * Adjusts transparency, metalness, color, and environment map intensity based on day/night cycle.
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
   * 
   * @param material - The glass material to update
   * @param timeOfDay - Current time of day ('day' or 'night')
   */
  static updateForTimeOfDay(
    material: THREE.MeshPhysicalMaterial,
    timeOfDay: 'day' | 'night'
  ): void {
    try {
      const isNight = timeOfDay === 'night';
      
      // Update transparency
      material.opacity = isNight
        ? MaterialPropertyValidator.validateOpacity(0.575) // Night: 0.50-0.65
        : MaterialPropertyValidator.validateOpacity(0.215); // Day: 0.18-0.25
      
      // Update metalness (higher at night by 0.1-0.2)
      material.metalness = isNight
        ? MaterialPropertyValidator.validateMetalness(0.7)
        : MaterialPropertyValidator.validateMetalness(0.55);
      
      // Update color tint
      material.color.set(isNight ? '#0A1428' : '#A8CCEC');
      
      // Adjust environment map intensity based on lighting conditions (Requirement 4.4)
      // Lower intensity at night to match reduced ambient lighting
      material.envMapIntensity = isNight ? 1.2 : 2.5;
      
      // Reduce emissive intensity of reflective surfaces at night (Requirement 4.6)
      // Glass can have subtle emissive properties that should be reduced at night
      if (material.emissive) {
        material.emissiveIntensity = isNight ? 0.05 : 0.1;
      }
      
      // Mark material for update
      material.needsUpdate = true;
    } catch (error) {
      console.warn('Failed to update glass material for time of day, material may not reflect current lighting', error);
      // Continue without updating - material will retain previous state
    }
  }
}
