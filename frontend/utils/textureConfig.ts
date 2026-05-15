/**
 * Texture Configuration Utility
 * 
 * Configures Three.js textures with optimal settings for quality and performance.
 * Sets wrap modes, color space, anisotropic filtering, and mipmap generation.
 * 
 * Requirements: 2.1, 3.4
 */

import * as THREE from 'three';

export type TextureQuality = 'standard' | 'highQuality';

/**
 * Configures a texture with optimal settings based on quality level
 * 
 * @param texture - The Three.js texture to configure
 * @param quality - Quality level: 'standard' (4x anisotropy) or 'highQuality' (8x anisotropy)
 * 
 * Settings applied:
 * - wrapS and wrapT: RepeatWrapping for seamless tiling
 * - colorSpace: SRGBColorSpace for correct color representation
 * - anisotropy: 4 for standard, 8 for high-quality (Req 2.1, 3.4)
 * - generateMipmaps: true for better performance and quality
 * - minFilter: LinearMipmapLinearFilter for smooth minification
 * - magFilter: LinearFilter for smooth magnification
 * 
 * Bug Condition: Textures not optimized for rendering
 * Expected Behavior: Textures configured with optimal settings
 * Preservation: Visual quality maintained
 */
export function configureTexture(
  texture: THREE.Texture,
  quality: TextureQuality = 'standard'
): void {
  try {
    // Set wrap modes to RepeatWrapping for seamless tiling
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Set color space to SRGB for correct color representation
    texture.colorSpace = THREE.SRGBColorSpace;

    // Set anisotropic filtering based on quality level (Req 2.1, 3.4)
    // Standard: 4x anisotropy for good quality with lower performance cost
    // High-quality: 8x anisotropy for maximum quality at oblique angles
    texture.anisotropy = quality === 'highQuality' ? 8 : 4;

    // Enable mipmap generation for better performance and quality
    texture.generateMipmaps = true;

    // Configure minification filter for smooth rendering at distance
    // LinearMipmapLinearFilter provides trilinear filtering for best quality
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    // Configure magnification filter for smooth close-up rendering
    texture.magFilter = THREE.LinearFilter;

    // Mark texture as needing update
    texture.needsUpdate = true;
  } catch (error) {
    console.error('Failed to configure texture properties', error);
    // Continue with default texture settings
  }
}

/**
 * Legacy function for backward compatibility
 * Configures a texture with repeat values
 * 
 * @param texture - The Three.js texture to configure
 * @param repeatX - Number of times to repeat texture horizontally (default: 1)
 * @param repeatY - Number of times to repeat texture vertically (default: 1)
 * @deprecated Use configureTexture with quality parameter instead
 */
export function configureTextureWithRepeat(
  texture: THREE.Texture,
  repeatX: number = 1,
  repeatY: number = 1
): void {
  try {
    // Set wrap modes to RepeatWrapping for seamless tiling
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Set color space to SRGB for correct color representation
    texture.colorSpace = THREE.SRGBColorSpace;

    // Set anisotropic filtering to 4 for improved quality at oblique angles
    texture.anisotropy = 4;

    // Enable mipmap generation for better performance and quality
    texture.generateMipmaps = true;

    // Set texture repeat for appropriate scaling
    // For wood textures: approximately 1 repeat per 1-2 meters
    texture.repeat.set(repeatX, repeatY);

    // Mark texture as needing update
    texture.needsUpdate = true;
  } catch (error) {
    console.error('Failed to configure texture properties', error);
    // Continue with default texture settings
  }
}

/**
 * Configures a normal map texture with appropriate settings
 * 
 * @param texture - The Three.js texture to configure as a normal map
 * @param repeatX - Number of times to repeat texture horizontally (default: 1)
 * @param repeatY - Number of times to repeat texture vertically (default: 1)
 */
export function configureNormalMap(
  texture: THREE.Texture,
  repeatX: number = 1,
  repeatY: number = 1
): void {
  try {
    // Set wrap modes to RepeatWrapping
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Normal maps should use LinearSRGBColorSpace (not SRGB)
    texture.colorSpace = THREE.LinearSRGBColorSpace;

    // Set anisotropic filtering
    texture.anisotropy = 4;

    // Enable mipmap generation
    texture.generateMipmaps = true;

    // Set texture repeat
    texture.repeat.set(repeatX, repeatY);

    // Mark texture as needing update
    texture.needsUpdate = true;
  } catch (error) {
    console.error('Failed to configure normal map texture properties', error);
  }
}

/**
 * Configures a roughness map texture with appropriate settings
 * 
 * @param texture - The Three.js texture to configure as a roughness map
 * @param repeatX - Number of times to repeat texture horizontally (default: 1)
 * @param repeatY - Number of times to repeat texture vertically (default: 1)
 */
export function configureRoughnessMap(
  texture: THREE.Texture,
  repeatX: number = 1,
  repeatY: number = 1
): void {
  try {
    // Set wrap modes to RepeatWrapping
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Roughness maps should use LinearSRGBColorSpace
    texture.colorSpace = THREE.LinearSRGBColorSpace;

    // Set anisotropic filtering
    texture.anisotropy = 4;

    // Enable mipmap generation
    texture.generateMipmaps = true;

    // Set texture repeat
    texture.repeat.set(repeatX, repeatY);

    // Mark texture as needing update
    texture.needsUpdate = true;
  } catch (error) {
    console.error('Failed to configure roughness map texture properties', error);
  }
}

/**
 * Calculates appropriate texture repeat values based on physical dimensions
 * 
 * @param widthMeters - Width of the surface in meters
 * @param heightMeters - Height of the surface in meters
 * @param texelsPerMeter - Desired texture resolution per meter (default: 1 for wood)
 * @returns Tuple of [repeatX, repeatY]
 * 
 * For wood textures, approximately 1 repeat per 1-2 meters is realistic
 */
export function calculateTextureRepeat(
  widthMeters: number,
  heightMeters: number,
  texelsPerMeter: number = 1
): [number, number] {
  const repeatX = widthMeters * texelsPerMeter;
  const repeatY = heightMeters * texelsPerMeter;
  return [repeatX, repeatY];
}

/**
 * Disposes of a texture and frees GPU memory
 * 
 * @param texture - The texture to dispose
 * 
 * Properly disposes of texture resources to prevent memory leaks.
 * Should be called when a texture is no longer needed.
 */
export function disposeTexture(texture: THREE.Texture | null | undefined): void {
  if (!texture) return;

  try {
    // Dispose of the texture to free GPU memory
    texture.dispose();
  } catch (error) {
    console.error('Failed to dispose texture', error);
  }
}

/**
 * Disposes of multiple textures
 * 
 * @param textures - Array of textures to dispose
 * 
 * Convenience function to dispose multiple textures at once.
 * Useful for cleaning up materials with multiple texture maps.
 */
export function disposeTextures(textures: (THREE.Texture | null | undefined)[]): void {
  textures.forEach(texture => disposeTexture(texture));
}

/**
 * Disposes of all textures in a material
 * 
 * @param material - The material whose textures should be disposed
 * 
 * Disposes all texture properties of a material including:
 * - map (diffuse/color map)
 * - normalMap
 * - roughnessMap
 * - metalnessMap
 * - aoMap (ambient occlusion)
 * - emissiveMap
 * - bumpMap
 * - displacementMap
 * - alphaMap
 * - lightMap
 * - envMap
 */
export function disposeMaterialTextures(material: THREE.Material): void {
  if (!material) return;

  try {
    const mat = material as any;

    // Dispose common texture maps
    disposeTexture(mat.map);
    disposeTexture(mat.normalMap);
    disposeTexture(mat.roughnessMap);
    disposeTexture(mat.metalnessMap);
    disposeTexture(mat.aoMap);
    disposeTexture(mat.emissiveMap);
    disposeTexture(mat.bumpMap);
    disposeTexture(mat.displacementMap);
    disposeTexture(mat.alphaMap);
    disposeTexture(mat.lightMap);
    disposeTexture(mat.envMap);
  } catch (error) {
    console.error('Failed to dispose material textures', error);
  }
}
