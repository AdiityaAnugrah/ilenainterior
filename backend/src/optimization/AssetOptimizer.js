const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * AssetOptimizer
 * 
 * Purpose: Compress dan optimize 3D models dan images
 * - Image compression (JPEG quality 85%)
 * - WebP conversion
 * - Multiple resolution variants (thumbnail, medium, full)
 * - File size estimation and reduction tracking
 * - Model optimization placeholder for future implementation
 */
class AssetOptimizer {
  constructor(config = {}) {
    this.config = {
      defaultQuality: 85,
      defaultFormat: 'webp',
      defaultFit: 'inside',
      ...config,
    };
  }

  /**
   * Optimize single image
   * @param {string} inputPath - Path to input image
   * @param {string} outputPath - Path to output image
   * @param {Object} options - Optimization options
   * @param {number} options.quality - Image quality (0-100), default 85
   * @param {string} options.format - Output format ('webp', 'jpeg', 'png'), default 'webp'
   * @param {number} options.width - Target width
   * @param {number} options.height - Target height
   * @param {string} options.fit - Fit mode ('inside', 'outside', 'cover', 'contain', 'fill'), default 'inside'
   * @returns {Promise<Object>} Optimization stats
   */
  async optimizeImage(inputPath, outputPath, options = {}) {
    try {
      const {
        quality = this.config.defaultQuality,
        format = this.config.defaultFormat,
        width,
        height,
        fit = this.config.defaultFit,
      } = options;

      // Get original file size
      const originalSize = await this.getFileSize(inputPath);

      // Create sharp instance
      let sharpInstance = sharp(inputPath);

      // Apply resize if dimensions provided
      if (width || height) {
        sharpInstance = sharpInstance.resize(width, height, { fit });
      }

      // Apply format conversion with quality
      if (format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality });
      } else if (format === 'jpeg' || format === 'jpg') {
        sharpInstance = sharpInstance.jpeg({ quality });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({ quality });
      }

      // Save to output path
      await sharpInstance.toFile(outputPath);

      // Get optimized file size
      const optimizedSize = await this.getFileSize(outputPath);

      return {
        originalSize,
        optimizedSize,
        format,
        reduction: originalSize - optimizedSize,
        reductionPercentage: ((originalSize - optimizedSize) / originalSize * 100).toFixed(2),
      };
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  /**
   * Generate multiple resolution variants of an image
   * @param {string} inputPath - Path to input image
   * @param {string} outputDir - Directory for output variants
   * @param {string} baseName - Base name for output files (without extension)
   * @returns {Promise<Array>} Array of variant results
   */
  async generateImageVariants(inputPath, outputDir, baseName) {
    try {
      // Define variants
      const variants = [
        { name: 'thumbnail', width: 200, height: 200 },
        { name: 'medium', width: 800, height: 800 },
        { name: 'full', width: 2048, height: 2048 },
      ];

      const results = [];

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Generate each variant
      for (const variant of variants) {
        const outputPath = path.join(outputDir, `${baseName}_${variant.name}.webp`);
        
        const result = await this.optimizeImage(inputPath, outputPath, {
          width: variant.width,
          height: variant.height,
          format: 'webp',
          quality: this.config.defaultQuality,
        });

        results.push({
          name: variant.name,
          width: variant.width,
          height: variant.height,
          path: outputPath,
          ...result,
        });
      }

      return results;
    } catch (error) {
      console.error('Error generating image variants:', error);
      throw new Error(`Failed to generate image variants: ${error.message}`);
    }
  }

  /**
   * Optimize 3D model (placeholder for future implementation)
   * @param {string} inputPath - Path to input model
   * @param {string} outputPath - Path to output model
   * @param {Object} options - Optimization options
   * @param {number} options.compressionLevel - Draco compression level (0-10), default 7
   * @param {number} options.quantizationBits - Quantization bits, default 14
   * @returns {Promise<Object>} Optimization stats
   */
  async optimizeModel(inputPath, outputPath, options = {}) {
    try {
      const {
        compressionLevel = 7,
        quantizationBits = 14,
      } = options;

      // Get original file size
      const originalSize = await this.getFileSize(inputPath);

      // TODO: Implement Draco compression using gltf-pipeline or similar
      // For now, this is a placeholder that just copies the file
      console.log('Model optimization not yet implemented');
      console.log(`Compression level: ${compressionLevel}, Quantization bits: ${quantizationBits}`);

      // Copy file as placeholder
      await fs.copyFile(inputPath, outputPath);

      const optimizedSize = await this.getFileSize(outputPath);

      return {
        originalSize,
        optimizedSize,
        compressionLevel,
        quantizationBits,
        reduction: 0,
        reductionPercentage: '0.00',
        note: 'Model optimization not yet implemented - file copied without compression',
      };
    } catch (error) {
      console.error('Error optimizing model:', error);
      throw new Error(`Failed to optimize model: ${error.message}`);
    }
  }

  /**
   * Get file size in bytes
   * @param {string} filePath - Path to file
   * @returns {Promise<number>} File size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      throw new Error(`Failed to get file size: ${error.message}`);
    }
  }

  /**
   * Format bytes to human-readable string
   * @param {number} bytes - Number of bytes
   * @param {number} decimals - Number of decimal places, default 2
   * @returns {string} Formatted string (e.g., "1.5 MB")
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

module.exports = AssetOptimizer;
