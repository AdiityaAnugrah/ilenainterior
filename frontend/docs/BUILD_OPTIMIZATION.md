# Build Optimization Guide

This document describes the build optimization tools and strategies implemented for the ILENA INTERIOR application.

## Overview

The build optimization system provides automated analysis of production bundles to ensure optimal performance and prevent bundle size bloat. It includes:

- Automated bundle size analysis
- Threshold-based warnings
- Build-to-build comparison
- Historical tracking
- Visualization data generation

## Bundle Size Analyzer

### Quick Start

```bash
# Build and analyze in one command
npm run analyze

# Analyze existing build without rebuilding
npm run analyze:only
```

### Features

#### 1. Bundle Size Reporting

The analyzer reports:
- **Total JS Size**: Combined size of all JavaScript chunks
- **Main Bundle Size**: Size of the main application bundle
- **Individual Chunk Sizes**: Size of each code-split chunk
- **Chunk Count**: Total number of chunks generated

#### 2. Threshold Monitoring

Default thresholds:
- **Main Bundle**: < 500KB
- **Total JS**: < 2MB
- **Individual Chunks**: < 200KB

The script will:
- ✅ Exit with code 0 if all thresholds are met
- ⚠️ Exit with code 1 if any threshold is exceeded

#### 3. Build Comparison

Automatically compares the current build with the previous build:
- Shows size differences in bytes and percentages
- Highlights increases (red) and decreases (green)
- Helps track bundle size trends over time

#### 4. Historical Tracking

All build reports are saved with timestamps in `.next/bundle-history/`:
- Enables long-term trend analysis
- Useful for identifying when bundle size increased
- Can be used for performance regression testing

#### 5. Visualization Data

Generates `bundle-visualization.json` with hierarchical data suitable for:
- D3.js treemap visualizations
- Custom bundle visualization tools
- Third-party analysis tools

## Output Files

### bundle-report.json

Complete analysis report including:
```json
{
  "chunks": [
    {
      "path": "static/chunks/framework-abc123.js",
      "name": "framework-abc123.js",
      "size": 245670,
      "sizeFormatted": "239.91 KB"
    }
  ],
  "totalJS": 1520000,
  "mainBundle": 387230,
  "warnings": [],
  "timestamp": "2026-05-11T05:18:19.325Z"
}
```

### bundle-visualization.json

Hierarchical data for visualization:
```json
{
  "name": "root",
  "children": [
    {
      "name": "framework-abc123.js",
      "value": 245670,
      "path": "static/chunks/framework-abc123.js"
    }
  ]
}
```

### bundle-history/

Timestamped reports for historical analysis:
- `bundle-2026-05-11T05-18-19-325Z.json`
- `bundle-2026-05-10T14-32-45-123Z.json`
- etc.

## Integration with CI/CD

### GitHub Actions

```yaml
name: Build and Analyze

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend
        
      - name: Build and analyze bundle
        run: npm run analyze
        working-directory: ./frontend
        
      - name: Upload bundle report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: bundle-report
          path: frontend/.next/bundle-report.json
```

### GitLab CI

```yaml
build-and-analyze:
  stage: build
  script:
    - cd frontend
    - npm ci
    - npm run analyze
  artifacts:
    paths:
      - frontend/.next/bundle-report.json
      - frontend/.next/bundle-visualization.json
    when: always
```

## Customizing Thresholds

Edit `frontend/scripts/analyze-bundle.js`:

```javascript
const THRESHOLDS = {
  mainBundle: 500 * 1024,      // 500KB - adjust as needed
  totalJS: 2 * 1024 * 1024,    // 2MB - adjust as needed
  individualChunk: 200 * 1024,  // 200KB - adjust as needed
};
```

## Optimization Strategies

When the analyzer reports warnings, consider these optimization strategies:

### 1. Code Splitting

Split large chunks using dynamic imports:

```typescript
// Before: Large bundle
import HeavyComponent from './HeavyComponent';

// After: Code split
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
});
```

### 2. Tree Shaking

Ensure imports are tree-shakeable:

```typescript
// Bad: Imports entire library
import _ from 'lodash';

// Good: Imports only what's needed
import debounce from 'lodash/debounce';
```

### 3. Lazy Loading

Lazy load non-critical components:

```typescript
// Lazy load admin panel (only for admin users)
const AdminPanel = lazy(() => import('./admin/AdminPanel'));

// Lazy load 3D environment (only in 3D view)
const OutdoorEnvironment = lazy(() => import('./OutdoorEnvironment'));
```

### 4. Bundle Analysis

For detailed analysis, use Next.js bundle analyzer:

```bash
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

```bash
ANALYZE=true npm run build
```

### 5. Dependency Optimization

- Remove unused dependencies
- Replace heavy libraries with lighter alternatives
- Use CDN for large third-party libraries
- Consider peer dependencies to avoid duplication

### 6. Image Optimization

- Use Next.js Image component for automatic optimization
- Convert images to WebP format
- Generate multiple resolutions (responsive images)
- Lazy load images below the fold

### 7. Font Optimization

- Use Next.js font optimization
- Subset fonts to include only needed characters
- Preload critical fonts
- Use system fonts when possible

## Monitoring and Alerts

### Setting Up Alerts

You can integrate the analyzer with monitoring tools:

```javascript
// Example: Send alert to Slack when threshold exceeded
if (results.warnings.length > 0) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `⚠️ Bundle size warning: ${results.warnings.length} issues detected`,
      attachments: results.warnings.map(w => ({
        text: `${w.file}: ${formatBytes(w.size)} (threshold: ${formatBytes(w.threshold)})`,
      })),
    }),
  });
}
```

### Performance Budgets

Consider implementing performance budgets per route:

```javascript
const ROUTE_BUDGETS = {
  '/': { maxJS: 300 * 1024 },
  '/planner': { maxJS: 800 * 1024 },
  '/admin': { maxJS: 500 * 1024 },
};
```

## Best Practices

1. **Run analyzer on every build**: Integrate into your build process
2. **Monitor trends**: Review historical data regularly
3. **Set realistic thresholds**: Based on your application needs
4. **Optimize proactively**: Don't wait for thresholds to be exceeded
5. **Document changes**: When bundle size increases significantly, document why
6. **Review dependencies**: Regularly audit and update dependencies
7. **Use code splitting**: Split code at route and component boundaries
8. **Lazy load heavy features**: Load on-demand rather than upfront

## Troubleshooting

### Script fails with "Build directory not found"

**Solution**: Run `npm run build` first, or use `npm run analyze` which builds automatically.

### Thresholds too strict/lenient

**Solution**: Adjust thresholds in `scripts/analyze-bundle.js` based on your requirements.

### Large chunk identified but unsure what it contains

**Solution**: Use `@next/bundle-analyzer` for detailed visualization:
```bash
ANALYZE=true npm run build
```

### Bundle size increased unexpectedly

**Solution**: 
1. Check `bundle-history/` to identify when it increased
2. Review git commits between builds
3. Check for new dependencies or large imports
4. Use bundle analyzer to identify the culprit

## Future Enhancements

Planned improvements:

1. **Interactive HTML Report**: Generate visual report with charts and graphs
2. **Dependency Analysis**: Show which dependencies contribute most to bundle size
3. **Automatic Recommendations**: Suggest specific optimizations based on analysis
4. **Performance Budgets**: Support custom budgets per route
5. **Integration with Lighthouse**: Combine with Lighthouse performance scores
6. **Real-time Monitoring**: Track bundle size in production

## Related Documentation

- [Next.js Optimization](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Performance Monitoring](./PERFORMANCE_MONITORING.md)
- [Asset Optimization](./ASSET_OPTIMIZATION.md)

## Support

For issues or questions about build optimization:
1. Check this documentation
2. Review the script source code in `scripts/analyze-bundle.js`
3. Consult the performance optimization spec in `.kiro/specs/performance-optimization/`
