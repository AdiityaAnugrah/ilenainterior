/**
 * Material Property Validator
 * 
 * Validates and clamps material properties to valid ranges for Three.js materials.
 * Logs warnings when invalid values are provided.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

export class MaterialPropertyValidator {
  /**
   * Clamps a value to a given range [min, max]
   * @param value - The value to clamp
   * @param min - Minimum allowed value
   * @param max - Maximum allowed value
   * @returns The clamped value
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Validates and clamps roughness values to [0, 1]
   * Logs a warning if the value is out of range
   * @param value - The roughness value to validate
   * @returns The clamped roughness value
   */
  static validateRoughness(value: number): number {
    if (value < 0 || value > 1) {
      console.warn(
        `Invalid roughness value: ${value}. Roughness must be in range [0, 1]. Clamping to valid range.`
      );
    }
    return this.clamp(value, 0, 1);
  }

  /**
   * Validates and clamps metalness values to [0, 1]
   * Logs a warning if the value is out of range
   * @param value - The metalness value to validate
   * @returns The clamped metalness value
   */
  static validateMetalness(value: number): number {
    if (value < 0 || value > 1) {
      console.warn(
        `Invalid metalness value: ${value}. Metalness must be in range [0, 1]. Clamping to valid range.`
      );
    }
    return this.clamp(value, 0, 1);
  }

  /**
   * Validates and clamps opacity values to [0, 1]
   * Logs a warning if the value is out of range
   * @param value - The opacity value to validate
   * @returns The clamped opacity value
   */
  static validateOpacity(value: number): number {
    if (value < 0 || value > 1) {
      console.warn(
        `Invalid opacity value: ${value}. Opacity must be in range [0, 1]. Clamping to valid range.`
      );
    }
    return this.clamp(value, 0, 1);
  }

  /**
   * Validates and clamps IOR (Index of Refraction) values to [1.0, 2.5]
   * Logs a warning if the value is out of range
   * @param value - The IOR value to validate
   * @returns The clamped IOR value
   */
  static validateIOR(value: number): number {
    if (value < 1.0 || value > 2.5) {
      console.warn(
        `Invalid IOR value: ${value}. IOR must be in range [1.0, 2.5]. Clamping to valid range.`
      );
    }
    return this.clamp(value, 1.0, 2.5);
  }
}
