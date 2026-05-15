/**
 * RendererOptimizer - Three.js renderer optimization utilities
 * 
 * Provides utilities for optimizing Three.js renderer settings including:
 * - Shadow-casting lights limitation
 * - Texture resolution limiting
 * - WebGL context configuration
 * 
 * Requirements: 12.1, 12.4, 12.10
 */

import * as THREE from 'three';

export interface RendererOptimizerConfig {
  maxShadowCastingLights: number;
  maxTextureResolution: number;
  preferWebGL2: boolean;
}

const DEFAULT_CONFIG: RendererOptimizerConfig = {
  maxShadowCastingLights: 3,
  maxTextureResolution: 2048,
  preferWebGL2: true,
};

export class RendererOptimizer {
  private config: RendererOptimizerConfig;

  constructor(config?: Partial<RendererOptimizerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Limit shadow-casting lights in scene to maximum count
   * 
   * Requirement 12.4: THE Renderer SHALL limit maksimal 3 shadow-casting lights dalam scene
   * 
   * @param scene - Three.js scene
   * @param maxLights - Maximum number of shadow-casting lights (default: 3)
   */
  limitShadowCastingLights(scene: THREE.Scene, maxLights?: number): void {
    const limit = maxLights ?? this.config.maxShadowCastingLights;
    const shadowCastingLights: THREE.Light[] = [];

    // Collect all shadow-casting lights
    scene.traverse((object) => {
      if (
        (object instanceof THREE.DirectionalLight ||
          object instanceof THREE.SpotLight ||
          object instanceof THREE.PointLight) &&
        object.castShadow
      ) {
        shadowCastingLights.push(object);
      }
    });

    // If we have more than the limit, disable shadows on the excess lights
    if (shadowCastingLights.length > limit) {
      console.warn(
        `[RendererOptimizer] Found ${shadowCastingLights.length} shadow-casting lights, limiting to ${limit}`
      );

      // Sort by intensity (keep the brightest lights)
      shadowCastingLights.sort((a, b) => b.intensity - a.intensity);

      // Disable shadows on lights beyond the limit
      for (let i = limit; i < shadowCastingLights.length; i++) {
        shadowCastingLights[i].castShadow = false;
        console.log(
          `[RendererOptimizer] Disabled shadows on light ${i + 1} (intensity: ${shadowCastingLights[i].intensity})`
        );
      }
    } else {
      console.log(
        `[RendererOptimizer] Shadow-casting lights: ${shadowCastingLights.length}/${limit}`
      );
    }
  }

  /**
   * Limit texture resolution to maximum size
   * 
   * Requirement 12.10: THE Renderer SHALL limit texture resolution maksimal 2048x2048
   * untuk prevent excessive memory usage
   * 
   * @param texture - Three.js texture
   * @param maxResolution - Maximum resolution (default: 2048)
   */
  limitTextureResolution(
    texture: THREE.Texture,
    maxResolution?: number
  ): THREE.Texture {
    const limit = maxResolution ?? this.config.maxTextureResolution;

    // Check if texture has an image
    if (!texture.image) {
      return texture;
    }

    const image = texture.image as HTMLImageElement | HTMLCanvasElement;
    const width = image.width || 0;
    const height = image.height || 0;

    // If texture is within limits, return as-is
    if (width <= limit && height <= limit) {
      return texture;
    }

    console.warn(
      `[RendererOptimizer] Texture exceeds limit (${width}x${height}), resizing to max ${limit}x${limit}`
    );

    // Create a canvas to resize the texture
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('[RendererOptimizer] Failed to get canvas context');
      return texture;
    }

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (width > height) {
      if (width > limit) {
        newWidth = limit;
        newHeight = Math.floor((height * limit) / width);
      }
    } else {
      if (height > limit) {
        newHeight = limit;
        newWidth = Math.floor((width * limit) / height);
      }
    }

    // Resize the image
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.drawImage(image, 0, 0, newWidth, newHeight);

    // Create new texture from resized canvas
    const resizedTexture = new THREE.CanvasTexture(canvas);
    resizedTexture.needsUpdate = true;

    // Copy texture properties
    resizedTexture.wrapS = texture.wrapS;
    resizedTexture.wrapT = texture.wrapT;
    resizedTexture.magFilter = texture.magFilter;
    resizedTexture.minFilter = texture.minFilter;
    resizedTexture.anisotropy = texture.anisotropy;
    resizedTexture.format = texture.format;
    resizedTexture.colorSpace = texture.colorSpace;

    console.log(
      `[RendererOptimizer] Resized texture from ${width}x${height} to ${newWidth}x${newHeight}`
    );

    return resizedTexture;
  }

  /**
   * Limit all textures in a scene to maximum resolution
   * 
   * @param scene - Three.js scene
   * @param maxResolution - Maximum resolution (default: 2048)
   */
  limitSceneTextures(scene: THREE.Scene, maxResolution?: number): void {
    const limit = maxResolution ?? this.config.maxTextureResolution;
    let textureCount = 0;
    let resizedCount = 0;

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material;

        if (Array.isArray(material)) {
          // Handle multi-material
          material.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
              if (mat.map) {
                textureCount++;
                const image = mat.map.image as HTMLImageElement | undefined;
                const originalSize = image?.width || 0;
                mat.map = this.limitTextureResolution(mat.map, limit);
                const newImage = mat.map.image as HTMLImageElement | undefined;
                const newSize = newImage?.width || 0;
                if (newSize < originalSize) resizedCount++;
              }
            }
          });
        } else if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
          if (material.map) {
            textureCount++;
            const image = material.map.image as HTMLImageElement | undefined;
            const originalSize = image?.width || 0;
            material.map = this.limitTextureResolution(material.map, limit);
            const newImage = material.map.image as HTMLImageElement | undefined;
            const newSize = newImage?.width || 0;
            if (newSize < originalSize) resizedCount++;
          }
        }
      }
    });

    console.log(
      `[RendererOptimizer] Checked ${textureCount} textures, resized ${resizedCount} textures to max ${limit}x${limit}`
    );
  }

  /**
   * Get WebGL context attributes for optimal performance
   * 
   * Requirement 12.1: THE Renderer SHALL menggunakan WebGL2 WHEN available untuk better performance
   * 
   * @returns WebGL context attributes
   */
  getWebGLContextAttributes(): WebGLContextAttributes {
    return {
      alpha: false, // Disable alpha for better performance
      antialias: true, // Will be overridden by quality settings
      depth: true,
      stencil: false, // Disable stencil buffer if not needed
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false,
    };
  }

  /**
   * Check if WebGL2 is available
   * 
   * @returns true if WebGL2 is supported
   */
  isWebGL2Available(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return gl !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get recommended WebGL version
   * 
   * @returns 'webgl2' if available and preferred, otherwise 'webgl'
   */
  getRecommendedWebGLVersion(): 'webgl2' | 'webgl' {
    if (this.config.preferWebGL2 && this.isWebGL2Available()) {
      return 'webgl2';
    }
    return 'webgl';
  }

  /**
   * Apply all optimizations to a scene
   * 
   * @param scene - Three.js scene
   */
  optimizeScene(scene: THREE.Scene): void {
    console.log('[RendererOptimizer] Optimizing scene...');

    // Limit shadow-casting lights
    this.limitShadowCastingLights(scene);

    // Limit texture resolutions
    this.limitSceneTextures(scene);

    console.log('[RendererOptimizer] Scene optimization complete');
  }

  /**
   * Get configuration
   */
  getConfig(): RendererOptimizerConfig {
    return { ...this.config };
  }
}

// ==================== Singleton Instance ====================

let globalRendererOptimizer: RendererOptimizer | null = null;

/**
 * Get global RendererOptimizer instance
 */
export function getGlobalRendererOptimizer(
  config?: Partial<RendererOptimizerConfig>
): RendererOptimizer {
  if (!globalRendererOptimizer) {
    globalRendererOptimizer = new RendererOptimizer(config);
  }
  return globalRendererOptimizer;
}

/**
 * Reset global RendererOptimizer instance
 */
export function resetGlobalRendererOptimizer(): void {
  globalRendererOptimizer = null;
}
