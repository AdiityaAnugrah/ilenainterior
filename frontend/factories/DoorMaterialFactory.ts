/**
 * Door Material Factory
 * 
 * Creates realistic materials for door components including panels, frames,
 * handles, and grooves. Uses validated material properties and procedural textures.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.3, 3.4, 3.5
 */

import * as THREE from 'three';
import { MaterialPropertyValidator } from '@/utils/materialValidator';
import { ProceduralTextureGenerator } from '@/utils/proceduralTextures';
import { configureTexture } from '@/utils/textureConfig';

export interface DoorMaterialConfig {
  woodType?: 'oak' | 'walnut' | 'pine';
  woodTexture?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  textureQuality?: 'standard' | 'highQuality';
}

export class DoorMaterialFactory {
  /**
   * Static material cache to store materials by configuration hash
   * Enables material reuse across objects with same configuration
   * 
   * Requirements: 1.2, 2.2, 3.2
   */
  private static materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  /**
   * Generates cache key from material configuration
   * 
   * Requirements: 1.2, 2.2
   * 
   * @param config - Door material configuration
   * @returns Cache key string
   */
  private static getMaterialKey(config: DoorMaterialConfig): string {
    const { woodType = 'oak', textureQuality = 'standard', normalMap, roughnessMap } = config;
    
    // Generate key from configuration parameters
    // Note: woodTexture is excluded as it's either generated from woodType or provided externally
    const hasNormalMap = normalMap ? 'normal' : 'no-normal';
    const hasRoughnessMap = roughnessMap ? 'roughness' : 'no-roughness';
    
    return `panel-${woodType}-${textureQuality}-${hasNormalMap}-${hasRoughnessMap}`;
  }

  /**
   * Clears the material cache and disposes of all cached materials
   * Should be called when cleaning up or when memory needs to be freed
   * 
   * Requirements: 1.2, 2.2
   */
  static clearMaterialCache(): void {
    // Dispose of all cached materials
    this.materialCache.forEach((material) => {
      material.dispose();
      // Also dispose of textures if they exist
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();
    });
    
    // Clear the cache
    this.materialCache.clear();
  }

  /**
   * Creates material for door panels with wood texture, normal map, and roughness map
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
   * 
   * @param config - Door material configuration
   * @returns MeshStandardMaterial configured for door panels
   */
  static createPanelMaterial(config: DoorMaterialConfig = {}): THREE.MeshStandardMaterial {
    try {
      // Check if custom woodTexture is provided - if so, skip caching
      // Custom textures are unique and shouldn't be cached
      if (!config.woodTexture) {
        // Generate cache key and check if material already exists
        const cacheKey = this.getMaterialKey(config);
        const cachedMaterial = this.materialCache.get(cacheKey);
        
        if (cachedMaterial) {
          // Return cached material for reuse across objects with same config
          return cachedMaterial;
        }
      }

      const { woodType = 'oak', woodTexture, normalMap, roughnessMap, textureQuality = 'standard' } = config;

      // Generate or use provided wood texture
      let texture: THREE.Texture;
      try {
        texture = woodTexture || ProceduralTextureGenerator.generateWoodTexturePreset(woodType, textureQuality);
        
        // Configure texture with appropriate settings (mipmaps, anisotropy, etc.)
        // This ensures procedural textures also get proper configuration
        configureTexture(texture, textureQuality);
      } catch (error) {
        console.warn('Failed to load/generate wood texture for door panel, using fallback color', error);
        // Create material without texture as fallback
        return new THREE.MeshStandardMaterial({
          color: '#C4965A', // Oak color fallback
          roughness: MaterialPropertyValidator.validateRoughness(0.55),
          metalness: MaterialPropertyValidator.validateMetalness(0.05),
          side: THREE.DoubleSide, // Render both sides for visibility from inside/outside
        });
      }

      // Create material with validated properties
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: MaterialPropertyValidator.validateRoughness(0.55), // Mid-range 0.4-0.7
        metalness: MaterialPropertyValidator.validateMetalness(0.05),
        side: THREE.DoubleSide, // Render both sides for visibility from inside/outside
      });

      // Apply normal map if provided
      if (normalMap) {
        try {
          configureTexture(normalMap, textureQuality);
          material.normalMap = normalMap;
          material.normalMapType = THREE.TangentSpaceNormalMap;
        } catch (error) {
          console.warn('Failed to apply normal map to door panel, continuing without it', error);
        }
      }

      // Apply roughness map if provided
      if (roughnessMap) {
        try {
          configureTexture(roughnessMap, textureQuality);
          material.roughnessMap = roughnessMap;
        } catch (error) {
          console.warn('Failed to apply roughness map to door panel, continuing without it', error);
        }
      }

      // Cache the material if it was generated (not custom woodTexture)
      if (!config.woodTexture) {
        const cacheKey = this.getMaterialKey(config);
        this.materialCache.set(cacheKey, material);
      }

      return material;
    } catch (error) {
      console.error('Failed to create door panel material, using basic fallback', error);
      // Last resort: return a basic material with solid color
      return new THREE.MeshStandardMaterial({
        color: '#C4965A',
        roughness: 0.55,
        metalness: 0.05,
        side: THREE.DoubleSide, // Render both sides for visibility from inside/outside
      });
    }
  }

  /**
   * Creates material for door frame with painted wood appearance
   * 
   * Requirements: 3.1
   * 
   * @param config - Door material configuration
   * @returns MeshStandardMaterial configured for door frame
   */
  static createFrameMaterial(config: DoorMaterialConfig = {}): THREE.MeshStandardMaterial {
    try {
      const { woodType = 'oak', woodTexture, textureQuality = 'standard' } = config;

      // Generate or use provided wood texture
      let texture: THREE.Texture;
      try {
        texture = woodTexture || ProceduralTextureGenerator.generateWoodTexturePreset(woodType, textureQuality);
        
        // Configure texture with appropriate settings (mipmaps, anisotropy, etc.)
        // This ensures procedural textures also get proper configuration
        configureTexture(texture, textureQuality);
      } catch (error) {
        console.warn('Failed to load/generate wood texture for door frame, using fallback color', error);
        // Create material without texture as fallback
        return new THREE.MeshStandardMaterial({
          color: '#6B4C2A', // Darker painted wood tone
          roughness: MaterialPropertyValidator.validateRoughness(0.6),
          metalness: MaterialPropertyValidator.validateMetalness(0.0),
          side: THREE.DoubleSide, // Render both sides for visibility from inside/outside
        });
      }

      // Create painted wood material with validated roughness (0.5-0.7)
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        color: '#6B4C2A', // Darker painted wood tone
        roughness: MaterialPropertyValidator.validateRoughness(0.6), // Mid-range for painted wood
        metalness: MaterialPropertyValidator.validateMetalness(0.0),
        side: THREE.DoubleSide, // Render both sides for visibility from inside/outside
      });

      return material;
    } catch (error) {
      console.error('Failed to create door frame material, using basic fallback', error);
      // Last resort: return a basic material with solid color
      return new THREE.MeshStandardMaterial({
        color: '#6B4C2A',
        roughness: 0.6,
        metalness: 0.0,
        side: THREE.DoubleSide, // Render both sides for visibility from inside/outside
      });
    }
  }

  /**
   * Creates metallic material for door handle with brass/gold finish
   * 
   * Requirements: 3.3, 3.4, 3.5
   * 
   * @returns MeshStandardMaterial configured for door handle
   */
  static createHandleMaterial(): THREE.MeshStandardMaterial {
    try {
      // Create metallic brass/gold material
      const material = new THREE.MeshStandardMaterial({
        color: '#C8A84B', // Brass/gold color
        roughness: MaterialPropertyValidator.validateRoughness(0.2), // Polished metal (0.1-0.3)
        metalness: MaterialPropertyValidator.validateMetalness(0.95), // High metalness (0.9+)
      });

      return material;
    } catch (error) {
      console.error('Failed to create door handle material, using basic fallback', error);
      // Last resort: return a basic metallic material
      return new THREE.MeshStandardMaterial({
        color: '#C8A84B',
        roughness: 0.2,
        metalness: 0.95,
      });
    }
  }

  /**
   * Creates material for door grooves with darker wood tone
   * 
   * Requirements: 1.1, 1.2
   * 
   * @param baseColor - Base color for the groove (default: dark wood)
   * @returns MeshStandardMaterial configured for door grooves
   */
  static createGrooveMaterial(baseColor: string = '#5A3D20'): THREE.MeshStandardMaterial {
    try {
      // Create darker wood material for grooves
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: MaterialPropertyValidator.validateRoughness(0.8), // Higher roughness for recessed areas
        metalness: MaterialPropertyValidator.validateMetalness(0.0),
        side: THREE.DoubleSide, // Render both sides for visibility from inside/outside
      });

      return material;
    } catch (error) {
      console.error('Failed to create door groove material, using basic fallback', error);
      // Last resort: return a basic material with solid color
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.DoubleSide, // Render both sides for visibility from inside/outside
      });
    }
  }
}
