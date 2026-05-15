# AssetOptimizer

## Overview

AssetOptimizer is a utility class for compressing and optimizing images and 3D models for the ILENA INTERIOR application.

## Features

- ✅ Image compression (JPEG quality 85%)
- ✅ WebP format conversion
- ✅ Multiple resolution variants generation (thumbnail, medium, full)
- ✅ File size estimation and reduction tracking
- ✅ Human-readable byte formatting
- 🔄 3D model optimization (placeholder for future Draco compression)

## Installation

The required dependency `sharp` is already installed in package.json:

```json
"sharp": "^0.34.5"
```

## Usage

### Basic Image Optimization

```javascript
const AssetOptimizer = require('./optimization/AssetOptimizer');

const optimizer = new AssetOptimizer();

// Optimize single image
const result = await optimizer.optimizeImage(
  'input.jpg',
  'output.webp',
  {
    quality: 85,
    format: 'webp',
    width: 800,
    height: 800,
    fit: 'inside'
  }
);

console.log('Original:', optimizer.formatBytes(result.originalSize));
console.log('Optimized:', optimizer.formatBytes(result.optimizedSize));
console.log('Reduction:', result.reductionPercentage + '%');
```

### Generate Multiple Variants

```javascript
// Generate thumbnail, medium, and full size variants
const variants = await optimizer.generateImageVariants(
  'uploads/images/product.jpg',
  'uploads/images/variants',
  'product-123'
);

// Results in:
// - product-123_thumbnail.webp (200x200)
// - product-123_medium.webp (800x800)
// - product-123_full.webp (2048x2048)

variants.forEach(variant => {
  console.log(`${variant.name}: ${optimizer.formatBytes(variant.optimizedSize)}`);
});
```

### Integration with Upload Middleware

```javascript
const multer = require('multer');
const AssetOptimizer = require('./optimization/AssetOptimizer');

const optimizer = new AssetOptimizer();

// After file upload
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = inputPath.replace(/\.[^.]+$/, '.webp');
    
    // Optimize uploaded image
    const result = await optimizer.optimizeImage(inputPath, outputPath, {
      quality: 85,
      format: 'webp'
    });
    
    // Generate variants
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputDir = path.dirname(inputPath);
    const variants = await optimizer.generateImageVariants(
      inputPath,
      outputDir,
      baseName
    );
    
    res.json({
      success: true,
      optimized: outputPath,
      variants: variants.map(v => v.path),
      stats: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Model Optimization (Future)

```javascript
// Placeholder - will be implemented with Draco compression
const result = await optimizer.optimizeModel(
  'model.glb',
  'model-optimized.glb',
  {
    compressionLevel: 7,
    quantizationBits: 14
  }
);
```

## API Reference

### Constructor

```javascript
new AssetOptimizer(config)
```

**Parameters:**
- `config` (Object, optional)
  - `defaultQuality` (number): Default image quality (0-100), default: 85
  - `defaultFormat` (string): Default output format, default: 'webp'
  - `defaultFit` (string): Default fit mode, default: 'inside'

### Methods

#### optimizeImage(inputPath, outputPath, options)

Optimize a single image with compression and format conversion.

**Parameters:**
- `inputPath` (string): Path to input image
- `outputPath` (string): Path to output image
- `options` (Object, optional)
  - `quality` (number): Image quality (0-100), default: 85
  - `format` (string): Output format ('webp', 'jpeg', 'png'), default: 'webp'
  - `width` (number): Target width
  - `height` (number): Target height
  - `fit` (string): Fit mode ('inside', 'outside', 'cover', 'contain', 'fill'), default: 'inside'

**Returns:** Promise<Object>
```javascript
{
  originalSize: 123456,
  optimizedSize: 45678,
  format: 'webp',
  reduction: 77778,
  reductionPercentage: '63.00'
}
```

#### generateImageVariants(inputPath, outputDir, baseName)

Generate multiple resolution variants (thumbnail, medium, full).

**Parameters:**
- `inputPath` (string): Path to input image
- `outputDir` (string): Directory for output variants
- `baseName` (string): Base name for output files (without extension)

**Returns:** Promise<Array>
```javascript
[
  {
    name: 'thumbnail',
    width: 200,
    height: 200,
    path: '/path/to/output_thumbnail.webp',
    originalSize: 123456,
    optimizedSize: 5678,
    format: 'webp',
    reduction: 117778,
    reductionPercentage: '95.40'
  },
  // ... medium and full variants
]
```

#### optimizeModel(inputPath, outputPath, options)

Optimize 3D model (placeholder for future implementation).

**Parameters:**
- `inputPath` (string): Path to input model
- `outputPath` (string): Path to output model
- `options` (Object, optional)
  - `compressionLevel` (number): Draco compression level (0-10), default: 7
  - `quantizationBits` (number): Quantization bits, default: 14

**Returns:** Promise<Object>

#### getFileSize(filePath)

Get file size in bytes.

**Parameters:**
- `filePath` (string): Path to file

**Returns:** Promise<number>

#### formatBytes(bytes, decimals)

Format bytes to human-readable string.

**Parameters:**
- `bytes` (number): Number of bytes
- `decimals` (number, optional): Number of decimal places, default: 2

**Returns:** string (e.g., "1.5 MB")

## Testing

Run the test script:

```bash
node src/optimization/test-asset-optimizer.js
```

## Performance Considerations

- **WebP Format**: Typically 25-35% smaller than JPEG/PNG with similar quality
- **Quality 85%**: Good balance between file size and visual quality
- **Fit Mode 'inside'**: Maintains aspect ratio, fits within dimensions
- **Variants**: Pre-generate multiple sizes for responsive images

## Future Enhancements

- [ ] Draco compression for 3D models using gltf-pipeline
- [ ] LOD (Level of Detail) generation for models
- [ ] Batch processing with progress tracking
- [ ] Automatic format detection and conversion
- [ ] Image metadata stripping for privacy
- [ ] AVIF format support

## Requirements Mapping

This component satisfies **Requirement 8: Asset Optimization and Compression**:

- ✅ Compress images (JPEG quality 85%)
- ✅ Convert images to WebP format
- ✅ Generate multiple resolution variants (thumbnail, medium, full)
- ✅ Estimate file size reduction
- ✅ Format bytes for human-readable output
- ✅ Handle errors gracefully
- 🔄 3D model optimization (placeholder)
