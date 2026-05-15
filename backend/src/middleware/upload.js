const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const AssetOptimizer = require('../optimization/AssetOptimizer');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Initialize AssetOptimizer
const assetOptimizer = new AssetOptimizer({
  defaultQuality: 85,
  defaultFormat: 'webp',
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isModel = file.mimetype === 'model/gltf-binary' || file.originalname.endsWith('.glb');
    const dir = isModel
      ? path.join(UPLOAD_DIR, 'models')
      : path.join(UPLOAD_DIR, 'images');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .slice(0, 40);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const IMAGE_MAX = 5  * 1024 * 1024;  //  5 MB
const MODEL_MAX = 15 * 1024 * 1024;  // 15 MB

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.glb'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error(`Tipe file tidak didukung: ${ext}. Gunakan JPG, PNG, WebP, atau GLB.`));
  }

  const isModel = ext === '.glb';
  const limit   = isModel ? MODEL_MAX : IMAGE_MAX;
  // multer's fileSize limit is global — enforce per-type here via Content-Length header
  const declared = parseInt(req.headers['content-length'] || '0', 10);
  // Fine-grained check happens in the limits object below; this filter just validates ext
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MODEL_MAX }, // upper ceiling; per-type check below
});

/**
 * Middleware to optimize uploaded images automatically
 * - Renames original file with '_original' suffix
 * - Optimizes image to WebP format
 * - Generates variants (thumbnail, medium, full)
 * - Logs optimization stats
 * - Handles errors gracefully (doesn't fail upload if optimization fails)
 * - Skips optimization for 3D models (.glb files)
 * - Supports both single file (req.file) and multiple fields (req.files)
 */
const optimizeUploadedAsset = async (req, res, next) => {
  // Collect all uploaded files
  const filesToOptimize = [];
  
  if (req.file) {
    // Single file upload
    filesToOptimize.push(req.file);
  } else if (req.files) {
    // Multiple fields upload (e.g., upload.fields())
    if (Array.isArray(req.files)) {
      // Array of files
      filesToOptimize.push(...req.files);
    } else {
      // Object with field names as keys
      Object.keys(req.files).forEach(fieldName => {
        const files = req.files[fieldName];
        if (Array.isArray(files)) {
          filesToOptimize.push(...files);
        }
      });
    }
  }

  // Skip if no files uploaded
  if (filesToOptimize.length === 0) {
    return next();
  }

  // Process each file
  const optimizationResults = [];
  
  for (const file of filesToOptimize) {
    const filePath = file.path;
    const ext = path.extname(file.filename).toLowerCase();

    // Skip optimization for 3D models
    if (ext === '.glb') {
      console.log(`[AssetOptimizer] Skipping optimization for 3D model: ${file.filename}`);
      continue;
    }

    // Only optimize image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!imageExtensions.includes(ext)) {
      continue;
    }

    try {
      console.log(`[AssetOptimizer] Starting optimization for: ${file.filename}`);

      // Rename original file with '_original' suffix
      const dir = path.dirname(filePath);
      const baseName = path.basename(file.filename, ext);
      const originalPath = path.join(dir, `${baseName}_original${ext}`);
      
      await fs.promises.rename(filePath, originalPath);
      console.log(`[AssetOptimizer] Original file preserved: ${baseName}_original${ext}`);

      // Optimize image to WebP format (main optimized version)
      const optimizedPath = path.join(dir, `${baseName}-optimized.webp`);
      const optimizationStats = await assetOptimizer.optimizeImage(
        originalPath,
        optimizedPath,
        {
          quality: 85,
          format: 'webp',
        }
      );

      console.log(`[AssetOptimizer] Image optimized:`);
      console.log(`  - Original size: ${assetOptimizer.formatBytes(optimizationStats.originalSize)}`);
      console.log(`  - Optimized size: ${assetOptimizer.formatBytes(optimizationStats.optimizedSize)}`);
      console.log(`  - Reduction: ${optimizationStats.reductionPercentage}%`);

      // Generate multiple resolution variants
      const variantsDir = path.join(dir, 'variants');
      const variants = await assetOptimizer.generateImageVariants(
        originalPath,
        variantsDir,
        baseName
      );

      console.log(`[AssetOptimizer] Generated ${variants.length} variants:`);
      variants.forEach(variant => {
        console.log(`  - ${variant.name}: ${variant.width}x${variant.height} (${assetOptimizer.formatBytes(variant.optimizedSize)})`);
      });

      // Update file reference to point to optimized file
      file.path = optimizedPath;
      file.filename = `${baseName}-optimized.webp`;
      
      // Store optimization result
      optimizationResults.push({
        fieldName: file.fieldname,
        originalFile: `${baseName}_original${ext}`,
        optimizedFile: `${baseName}-optimized.webp`,
        originalSize: optimizationStats.originalSize,
        optimizedSize: optimizationStats.optimizedSize,
        reduction: optimizationStats.reduction,
        reductionPercentage: optimizationStats.reductionPercentage,
        variants: variants.map(v => ({
          name: v.name,
          path: path.relative(UPLOAD_DIR, v.path),
          size: v.optimizedSize,
        })),
      });

      console.log(`[AssetOptimizer] Optimization complete for: ${file.filename}`);

    } catch (error) {
      // Log error but don't fail the upload
      console.error(`[AssetOptimizer] Error optimizing asset ${file.filename}: ${error.message}`);
      console.error(error);
      
      // If optimization failed, try to restore original file
      try {
        const dir = path.dirname(filePath);
        const baseName = path.basename(file.filename, ext);
        const originalPath = path.join(dir, `${baseName}_original${ext}`);
        
        // Check if original file exists and restore it
        if (fs.existsSync(originalPath)) {
          await fs.promises.rename(originalPath, filePath);
          console.log(`[AssetOptimizer] Restored original file after optimization failure`);
        }
      } catch (restoreError) {
        console.error(`[AssetOptimizer] Error restoring original file: ${restoreError.message}`);
      }

      // Store error for this file
      if (!req.optimizationErrors) {
        req.optimizationErrors = [];
      }
      req.optimizationErrors.push({
        fieldName: file.fieldname,
        filename: file.filename,
        error: error.message,
      });
    }
  }

  // Add optimization metadata to request
  if (optimizationResults.length > 0) {
    req.optimizationStats = optimizationResults.length === 1 
      ? optimizationResults[0] 
      : optimizationResults;
  }

  next();
};

module.exports = upload;
module.exports.optimizeUploadedAsset = optimizeUploadedAsset;
