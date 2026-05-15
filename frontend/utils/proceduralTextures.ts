/**
 * Procedural Texture Generator
 * 
 * Generates procedural textures using canvas-based rendering as fallbacks
 * when image texture loading fails.
 * 
 * Requirements: 1.1, 1.2, 7.1, 9.1, 9.2, 9.4, 1.6, 2.6, 3.6
 */

import * as THREE from 'three';
import { getTextureCache, type TextureCacheKey } from './three/TextureCache';

export interface ProceduralWoodOptions {
  baseColor: string;
  grainColor: string;
  grainDensity: number;
  size: number;
}

interface WoodTextureParams {
  baseColor: THREE.Color;
  grainColor: THREE.Color;
  grainDensity: number;
  grainWidth: number;
  noiseScale: number;
  size: number;
}

/**
 * Wood texture presets for different wood types
 */
const WOOD_PRESETS: Record<'oak' | 'walnut' | 'pine', WoodTextureParams> = {
  oak: {
    baseColor: new THREE.Color('#D4A574'),
    grainColor: new THREE.Color('#8B6F47'),
    grainDensity: 0.8,
    grainWidth: 2,
    noiseScale: 0.05,
    size: 1024,
  },
  walnut: {
    baseColor: new THREE.Color('#6B5444'),
    grainColor: new THREE.Color('#3E2C1F'),
    grainDensity: 0.9,
    grainWidth: 3,
    noiseScale: 0.04,
    size: 1024,
  },
  pine: {
    baseColor: new THREE.Color('#E8D4A8'),
    grainColor: new THREE.Color('#C4A574'),
    grainDensity: 0.6,
    grainWidth: 2,
    noiseScale: 0.06,
    size: 1024,
  },
};

export class ProceduralTextureGenerator {
  /**
   * Simple noise function for procedural generation
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Noise value between 0 and 1
   */
  private static noise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  /**
   * Perlin-like noise function for smoother patterns
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Noise value between 0 and 1
   */
  private static smoothNoise(x: number, y: number): number {
    const corners = (
      this.noise(x - 1, y - 1) +
      this.noise(x + 1, y - 1) +
      this.noise(x - 1, y + 1) +
      this.noise(x + 1, y + 1)
    ) / 16;
    const sides = (
      this.noise(x - 1, y) +
      this.noise(x + 1, y) +
      this.noise(x, y - 1) +
      this.noise(x, y + 1)
    ) / 8;
    const center = this.noise(x, y) / 4;
    return corners + sides + center;
  }

  /**
   * Multi-octave noise for more natural patterns (optimized)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param octaves - Number of noise layers
   * @returns Noise value between 0 and 1
   */
  private static fractalNoise(x: number, y: number, octaves: number = 3): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.smoothNoise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }

  /**
   * Simplified turbulence function for wood grain irregularities
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Turbulence value
   */
  private static turbulence(x: number, y: number): number {
    let value = 0;
    let size = 1;

    // Reduced iterations for performance
    for (let i = 0; i < 4; i++) {
      value += Math.abs(this.smoothNoise(x / size, y / size)) * size;
      size *= 2;
    }

    return value / 32;
  }

  /**
   * Generates a procedural wood texture with grain patterns
   * @param options - Wood texture generation options
   * @returns A Three.js CanvasTexture with wood grain pattern
   */
  static generateWoodTexture(options: ProceduralWoodOptions): THREE.CanvasTexture {
    try {
      const { baseColor, grainColor, grainDensity, size } = options;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.warn('Failed to get 2D context for canvas, falling back to solid color texture');
        return this.createFallbackTexture(baseColor, size);
      }

      // Parse colors
      const base = new THREE.Color(baseColor);
      const grain = new THREE.Color(grainColor);

      // Create image data
      const imageData = ctx.createImageData(size, size);
      const data = imageData.data;

      // Generate wood grain pattern with more natural appearance (optimized)
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;

          // Normalize coordinates
          const nx = x / size;
          const ny = y / size;

          // Create vertical wood grain direction (along Y axis)
          // Add turbulence for natural irregularities (optimized sampling)
          const turbulenceValue = this.turbulence(x * 0.3, y * 0.3) * 0.015;
          const xDistorted = nx + turbulenceValue;

          // Create wood rings using sine wave with fractal noise (reduced octaves)
          const fractalValue = this.fractalNoise(x * 0.02, y * 0.02, 3);
          const ringPattern = Math.sin((xDistorted * 25 + fractalValue * 1.5) * grainDensity);

          // Add fine grain detail along the wood direction (optimized)
          const fineGrain = this.fractalNoise(x * 0.15, y * 0.6, 2) * 0.25;
          
          // Combine patterns for more natural look
          const combinedPattern = ringPattern * 0.75 + fineGrain * 0.25;

          // Blend between base and grain colors with smoother transition
          const t = Math.pow((combinedPattern + 1) * 0.5, 0.8); // Power curve for more contrast
          const r = base.r * (1 - t) + grain.r * t;
          const g = base.g * (1 - t) + grain.g * t;
          const b = base.b * (1 - t) + grain.b * t;

          // Add subtle color variation for realism (optimized)
          const colorVariation = this.smoothNoise(x * 0.04, y * 0.04) * 0.04;

          data[idx] = Math.floor(Math.min(255, Math.max(0, (r + colorVariation) * 255)));
          data[idx + 1] = Math.floor(Math.min(255, Math.max(0, (g + colorVariation) * 255)));
          data[idx + 2] = Math.floor(Math.min(255, Math.max(0, (b + colorVariation) * 255)));
          data[idx + 3] = 255; // Alpha
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Compress canvas texture to reduce memory footprint
      // Use quality 0.85 for good balance between size and visual quality
      const compressedCanvas = this.compressCanvasTexture(canvas, 0.85);

      // Create texture from compressed canvas
      const texture = new THREE.CanvasTexture(compressedCanvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      
      // Enable mipmaps for better performance with distant objects
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter; // Trilinear filtering for smooth LOD transitions
      texture.magFilter = THREE.LinearFilter; // Linear filtering for close-up views
      
      // Set anisotropic filtering for better quality at oblique angles
      // This will be clamped to the renderer's max anisotropy
      texture.anisotropy = 4; // Moderate anisotropy for good quality/performance balance
      
      texture.needsUpdate = true;

      return texture;
    } catch (error) {
      console.warn('Failed to generate procedural wood texture, falling back to solid color', error);
      return this.createFallbackTexture(options.baseColor, options.size);
    }
  }

  /**
   * Generates a wood texture using a preset
   * @param preset - Wood type preset ('oak', 'walnut', or 'pine')
   * @param quality - Texture quality ('standard' for 512px or 'highQuality' for 1024px)
   * @returns A Three.js CanvasTexture with wood grain pattern
   */
  static generateWoodTexturePreset(
    preset: 'oak' | 'walnut' | 'pine',
    quality: 'standard' | 'highQuality' = 'standard'
  ): THREE.CanvasTexture {
    try {
      const params = WOOD_PRESETS[preset];
      
      if (!params) {
        console.warn(`Unknown wood preset: ${preset}, falling back to oak`);
        return this.generateWoodTexturePreset('oak', quality);
      }
      
      // Determine texture size based on quality setting
      // Standard: 512px (75% memory reduction), High Quality: 1024px (original)
      const size = quality === 'highQuality' ? 1024 : 512;
      
      // Generate cache key from preset name, size, and quality
      const textureCache = getTextureCache();
      const cacheKey = textureCache.generateKey({
        textureType: 'wood',
        woodType: preset,
        size: size,
        quality: quality,
      } as TextureCacheKey);
      
      // Check cache before generating
      const cachedTexture = textureCache.getCachedTexture(cacheKey);
      if (cachedTexture) {
        // Log cache hit in development mode
        if (process.env.NODE_ENV === 'development') {
          const stats = textureCache.getStats();
          console.log(`[TextureCache] Cache HIT for ${preset} wood (${size}px, ${quality})`, {
            hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
            cacheSize: stats.entryCount,
            memoryUsage: `${(stats.totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`,
          });
        }
        return cachedTexture as THREE.CanvasTexture;
      }
      
      // Cache miss - generate new texture
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TextureCache] Cache MISS for ${preset} wood (${size}px, ${quality}) - generating...`);
      }
      
      const texture = this.generateWoodTexture({
        baseColor: '#' + params.baseColor.getHexString(),
        grainColor: '#' + params.grainColor.getHexString(),
        grainDensity: params.grainDensity,
        size: size,
      });
      
      // Store in cache for reuse
      textureCache.setCachedTexture(cacheKey, texture);
      
      // Log cache statistics in development mode
      if (process.env.NODE_ENV === 'development') {
        const stats = textureCache.getStats();
        console.log(`[TextureCache] Texture cached for ${preset} wood`, {
          hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
          cacheSize: stats.entryCount,
          memoryUsage: `${(stats.totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`,
        });
      }
      
      return texture;
    } catch (error) {
      console.warn(`Failed to generate wood texture preset: ${preset}, using fallback`, error);
      return this.createFallbackTexture('#C4965A', quality === 'highQuality' ? 1024 : 512);
    }
  }

  /**
   * Compresses a canvas texture to reduce memory footprint
   * @param canvas - The canvas element to compress
   * @param quality - Compression quality (0.0 to 1.0, default 0.85)
   * @returns Compressed canvas or original if compression fails
   */
  static compressCanvasTexture(canvas: HTMLCanvasElement, quality: number = 0.85): HTMLCanvasElement {
    try {
      // Validate quality parameter
      const compressionQuality = Math.max(0, Math.min(1, quality));
      
      // Create a temporary canvas for compression
      const compressedCanvas = document.createElement('canvas');
      compressedCanvas.width = canvas.width;
      compressedCanvas.height = canvas.height;
      const ctx = compressedCanvas.getContext('2d');
      
      if (!ctx) {
        console.warn('Failed to get 2D context for compression, returning original canvas');
        return canvas;
      }
      
      // Try to compress using WebP format (better compression than JPEG for textures)
      // WebP supports both lossy and lossless compression
      try {
        const webpDataUrl = canvas.toDataURL('image/webp', compressionQuality);
        
        // Load compressed image back to canvas
        const img = new Image();
        img.src = webpDataUrl;
        
        // Note: This is synchronous for canvas data URLs in most browsers
        ctx.drawImage(img, 0, 0);
        
        // Verify compression worked by checking data URL size
        const originalSize = canvas.toDataURL('image/png').length;
        const compressedSize = webpDataUrl.length;
        
        if (process.env.NODE_ENV === 'development') {
          const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
          console.log(`[TextureCompression] WebP compression: ${reduction}% size reduction`);
        }
        
        return compressedCanvas;
      } catch (webpError) {
        // WebP not supported, fallback to JPEG compression
        console.warn('WebP compression not supported, falling back to JPEG');
        
        const jpegDataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
        const img = new Image();
        img.src = jpegDataUrl;
        ctx.drawImage(img, 0, 0);
        
        return compressedCanvas;
      }
    } catch (error) {
      console.warn('Canvas texture compression failed, returning original canvas', error);
      return canvas;
    }
  }

  /**
   * Reduces canvas resolution for mipmap generation
   * @param canvas - The source canvas
   * @param scale - Scale factor (0.5 = half size, 0.25 = quarter size)
   * @returns Reduced resolution canvas
   */
  static reduceCanvasResolution(canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
    try {
      const newWidth = Math.max(1, Math.floor(canvas.width * scale));
      const newHeight = Math.max(1, Math.floor(canvas.height * scale));
      
      const reducedCanvas = document.createElement('canvas');
      reducedCanvas.width = newWidth;
      reducedCanvas.height = newHeight;
      const ctx = reducedCanvas.getContext('2d');
      
      if (!ctx) {
        console.warn('Failed to get 2D context for resolution reduction, returning original canvas');
        return canvas;
      }
      
      // Use high-quality image smoothing for better downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw scaled-down image
      ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TextureMinification] Reduced canvas from ${canvas.width}x${canvas.height} to ${newWidth}x${newHeight}`);
      }
      
      return reducedCanvas;
    } catch (error) {
      console.warn('Canvas resolution reduction failed, returning original canvas', error);
      return canvas;
    }
  }

  /**
   * Creates a simple solid color fallback texture when procedural generation fails
   * @param color - Hex color string
   * @param size - Texture size in pixels
   * @returns A Three.js CanvasTexture with solid color
   */
  private static createFallbackTexture(color: string, size: number): THREE.CanvasTexture {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Last resort: create a minimal 1x1 texture
        const minCanvas = document.createElement('canvas');
        minCanvas.width = 1;
        minCanvas.height = 1;
        const texture = new THREE.CanvasTexture(minCanvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      }

      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size, size);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      return texture;
    } catch (error) {
      console.error('Critical: Failed to create fallback texture', error);
      // Create absolute minimal texture as last resort
      const minCanvas = document.createElement('canvas');
      minCanvas.width = 1;
      minCanvas.height = 1;
      const texture = new THREE.CanvasTexture(minCanvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  }
}
