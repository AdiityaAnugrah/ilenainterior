# Build Optimization Scripts

This directory contains scripts for analyzing and optimizing the production build.

## analyze-bundle.js

Analyzes the Next.js production bundle to report sizes, detect threshold violations, and compare with previous builds.

### Features

- **Bundle Size Analysis**: Reports total JS size, main bundle size, and individual chunk sizes
- **Threshold Warnings**: Warns when bundles exceed defined thresholds:
  - Main bundle: < 500KB
  - Total JS: < 2MB
  - Individual chunks: < 200KB
- **Build Comparison**: Compares current build with previous build to track size changes
- **Visualization Data**: Generates JSON data for bundle visualization
- **Build History**: Saves timestamped reports for historical analysis

### Usage

```bash
# Build and analyze
npm run analyze

# Analyze existing build (without rebuilding)
npm run analyze:only
```

### Output

The script generates several files in the `.next` directory:

- `bundle-report.json` - Latest build analysis report
- `bundle-visualization.json` - Data for visualization tools
- `bundle-history/bundle-*.json` - Historical build reports

### Exit Codes

- `0` - Success, all bundles within thresholds
- `1` - Warnings detected, bundles exceed thresholds

### Customization

You can modify the thresholds in `analyze-bundle.js`:

```javascript
const THRESHOLDS = {
  mainBundle: 500 * 1024,      // 500KB
  totalJS: 2 * 1024 * 1024,    // 2MB
  individualChunk: 200 * 1024,  // 200KB
};
```

### Integration with CI/CD

Add to your CI/CD pipeline to fail builds that exceed size thresholds:

```yaml
# Example GitHub Actions
- name: Build and analyze bundle
  run: npm run analyze
```

The script will exit with code 1 if any thresholds are exceeded, causing the CI build to fail.

### Example Output

```
=== Bundle Size Analysis ===

Bundle Summary:
  Total JS Size: 1.45 MB
  Main Bundle: 387.23 KB
  Total Chunks: 24

Comparison with Previous Build:
  Total JS: -45.67 KB (-3.05%)

Largest Chunks (Top 10):
  1. framework-abc123.js
     245.67 KB - static/chunks/framework-abc123.js
  2. main-def456.js
     187.45 KB - static/chunks/main-def456.js
  ...

✓ All bundles are within size thresholds!

Thresholds:
  Main Bundle: 500 KB
  Total JS: 2 MB
  Individual Chunks: 200 KB

Detailed report saved to: .next/bundle-report.json
Build history saved to: .next/bundle-history/

Build completed successfully!
```

## visualize-bundle.html

Interactive HTML visualization tool for bundle analysis reports.

### Features

- **Visual Summary**: Cards showing total JS, main bundle, chunk count, and warnings
- **Bar Chart**: Visual representation of the 15 largest chunks
- **Color-Coded Warnings**: Red/yellow highlighting for chunks exceeding thresholds
- **Interactive**: Load any bundle-report.json file for visualization

### Usage

1. Open `scripts/visualize-bundle.html` in your web browser
2. Click the file input area
3. Select `frontend/.next/bundle-report.json`
4. View the interactive visualization

Alternatively, you can open it directly:

```bash
# Windows
start scripts/visualize-bundle.html

# macOS
open scripts/visualize-bundle.html

# Linux
xdg-open scripts/visualize-bundle.html
```

### Screenshot

The visualization includes:
- Summary cards with total sizes and warnings
- Bar chart showing largest chunks
- Color-coded warnings for threshold violations
- Timestamp of the report

## Future Enhancements

Potential improvements for these scripts:

1. **Advanced Treemap Visualization**: D3.js-based treemap for hierarchical view
2. **Webpack Bundle Analyzer Integration**: Integrate with webpack-bundle-analyzer for detailed analysis
3. **Dependency Analysis**: Show which dependencies contribute most to bundle size
4. **Recommendations Engine**: Suggest optimizations based on analysis (e.g., code splitting opportunities)
5. **Performance Budgets**: Support custom budgets per route or feature
6. **Slack/Email Notifications**: Send alerts when thresholds are exceeded
7. **Historical Trends**: Graph showing bundle size changes over time
8. **Comparison Tool**: Compare two builds side-by-side
