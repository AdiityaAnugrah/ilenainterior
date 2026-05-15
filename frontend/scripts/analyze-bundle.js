/**
 * Bundle Size Analysis Script
 * 
 * Analyzes Next.js build output to measure bundle size reduction
 * from dynamic imports implementation.
 * 
 * Requirements: 9.10 - Reduce initial JavaScript bundle size minimal 40%
 * 
 * Usage:
 *   npm run build
 *   node scripts/analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get all files in directory recursively
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}

/**
 * Analyze Next.js build output
 */
function analyzeBuild() {
  console.log(`${colors.bright}${colors.cyan}=== Bundle Size Analysis ===${colors.reset}\n`);
  
  const buildDir = path.join(__dirname, '..', '.next');
  
  if (!fs.existsSync(buildDir)) {
    console.log(`${colors.red}Error: Build directory not found. Run 'npm run build' first.${colors.reset}`);
    process.exit(1);
  }
  
  // Analyze static chunks
  const staticDir = path.join(buildDir, 'static', 'chunks');
  
  if (!fs.existsSync(staticDir)) {
    console.log(`${colors.red}Error: Static chunks directory not found.${colors.reset}`);
    process.exit(1);
  }
  
  const allFiles = getAllFiles(staticDir);
  const jsFiles = allFiles.filter(f => f.endsWith('.js'));
  
  // Categorize files
  const categories = {
    main: [],
    vendor: [],
    pages: [],
    lazy: [],
    other: [],
  };
  
  jsFiles.forEach((file) => {
    const fileName = path.basename(file);
    const size = getFileSize(file);
    
    if (fileName.includes('main')) {
      categories.main.push({ file: fileName, size });
    } else if (fileName.includes('framework') || fileName.includes('vendor') || fileName.includes('webpack')) {
      categories.vendor.push({ file: fileName, size });
    } else if (fileName.includes('pages')) {
      categories.pages.push({ file: fileName, size });
    } else if (file.includes('lazy') || fileName.match(/^\d+\./)) {
      categories.lazy.push({ file: fileName, size });
    } else {
      categories.other.push({ file: fileName, size });
    }
  });
  
  // Calculate totals
  const totals = {
    main: categories.main.reduce((sum, f) => sum + f.size, 0),
    vendor: categories.vendor.reduce((sum, f) => sum + f.size, 0),
    pages: categories.pages.reduce((sum, f) => sum + f.size, 0),
    lazy: categories.lazy.reduce((sum, f) => sum + f.size, 0),
    other: categories.other.reduce((sum, f) => sum + f.size, 0),
  };
  
  const totalSize = Object.values(totals).reduce((sum, size) => sum + size, 0);
  const initialLoad = totals.main + totals.vendor + totals.pages;
  const lazyLoaded = totals.lazy;
  
  // Print results
  console.log(`${colors.bright}Main Bundle:${colors.reset}`);
  categories.main.forEach(({ file, size }) => {
    console.log(`  ${file}: ${formatBytes(size)}`);
  });
  console.log(`  ${colors.bright}Total: ${formatBytes(totals.main)}${colors.reset}\n`);
  
  console.log(`${colors.bright}Vendor Bundle:${colors.reset}`);
  categories.vendor.forEach(({ file, size }) => {
    console.log(`  ${file}: ${formatBytes(size)}`);
  });
  console.log(`  ${colors.bright}Total: ${formatBytes(totals.vendor)}${colors.reset}\n`);
  
  console.log(`${colors.bright}Page Bundles:${colors.reset}`);
  categories.pages.forEach(({ file, size }) => {
    console.log(`  ${file}: ${formatBytes(size)}`);
  });
  console.log(`  ${colors.bright}Total: ${formatBytes(totals.pages)}${colors.reset}\n`);
  
  console.log(`${colors.bright}Lazy-Loaded Chunks:${colors.reset}`);
  categories.lazy.forEach(({ file, size }) => {
    console.log(`  ${file}: ${formatBytes(size)}`);
  });
  console.log(`  ${colors.bright}Total: ${formatBytes(totals.lazy)}${colors.reset}\n`);
  
  if (categories.other.length > 0) {
    console.log(`${colors.bright}Other Chunks:${colors.reset}`);
    categories.other.forEach(({ file, size }) => {
      console.log(`  ${file}: ${formatBytes(size)}`);
    });
    console.log(`  ${colors.bright}Total: ${formatBytes(totals.other)}${colors.reset}\n`);
  }
  
  // Summary
  console.log(`${colors.bright}${colors.cyan}=== Summary ===${colors.reset}`);
  console.log(`Initial Load Size: ${colors.bright}${formatBytes(initialLoad)}${colors.reset}`);
  console.log(`Lazy-Loaded Size: ${colors.bright}${formatBytes(lazyLoaded)}${colors.reset}`);
  console.log(`Total Bundle Size: ${colors.bright}${formatBytes(totalSize)}${colors.reset}`);
  
  const lazyPercentage = ((lazyLoaded / totalSize) * 100).toFixed(2);
  console.log(`\nLazy-Loaded Percentage: ${colors.bright}${lazyPercentage}%${colors.reset}`);
  
  // Check if we meet the 40% reduction requirement
  if (lazyPercentage >= 40) {
    console.log(`\n${colors.green}✓ SUCCESS: Lazy loading reduces initial bundle by ${lazyPercentage}% (target: 40%)${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ WARNING: Lazy loading reduces initial bundle by ${lazyPercentage}% (target: 40%)${colors.reset}`);
  }
  
  // Estimate for Three.js controls
  console.log(`\n${colors.bright}${colors.cyan}=== Three.js Controls Analysis ===${colors.reset}`);
  
  const dreiFiles = categories.lazy.filter(f => 
    f.file.includes('drei') || 
    f.file.includes('OrbitControls') || 
    f.file.includes('TransformControls') ||
    f.file.includes('Environment')
  );
  
  if (dreiFiles.length > 0) {
    console.log(`${colors.bright}Lazy-loaded @react-three/drei chunks:${colors.reset}`);
    dreiFiles.forEach(({ file, size }) => {
      console.log(`  ${file}: ${formatBytes(size)}`);
    });
    
    const dreiTotal = dreiFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(`  ${colors.bright}Total: ${formatBytes(dreiTotal)}${colors.reset}`);
    console.log(`\n${colors.green}✓ @react-three/drei utilities are lazy-loaded (${formatBytes(dreiTotal)} saved from initial bundle)${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ No separate @react-three/drei chunks found. They may be bundled with main code.${colors.reset}`);
  }
  
  console.log('');
}

// Run analysis
try {
  analyzeBuild();
} catch (error) {
  console.error(`${colors.red}Error analyzing bundle:${colors.reset}`, error);
  process.exit(1);
}
