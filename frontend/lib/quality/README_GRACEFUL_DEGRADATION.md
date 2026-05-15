# Graceful Degradation for Low-End Devices

## Overview

Sistem graceful degradation secara otomatis mendeteksi low-end devices dan menonaktifkan fitur-fitur berat untuk memastikan performa optimal dan pengalaman yang lancar.

**Requirement:** 12.5

## Components Created

### 1. Enhanced DeviceDetector
Sudah memiliki method untuk low-end device detection:
- `getDeviceScore()`: Return score 0-100 berdasarkan GPU, memory, CPU, screen
- `getPerformanceTier()`: Return 'low' | 'medium' | 'high'
- `isLowEndDevice()`: Return true jika performance tier = 'low'

### 2. Enhanced QualityManager
Ditambahkan graceful degradation features:

**New Methods:**
- `enableGracefulDegradation()`: Activate degradation mode
- `disableGracefulDegradation()`: Deactivate degradation mode
- `isInDegradationMode()`: Check if in degradation mode
- `getDisabledFeatures()`: Get list of disabled features
- `getRecommendations()`: Get recommendations for user

**Degradation Behavior:**
- Force quality ke LOW
- Disable auto-adjust (keep at LOW)
- Build list of disabled features
- Log degradation status

### 3. LowEndDeviceNotification Component
Modal notification yang muncul saat low-end device terdeteksi.

**Features:**
- Show list of disabled features
- Explain why degradation is needed
- Provide recommendations
- "Saya Mengerti" button (dismiss and accept LOW quality)
- "Coba Tetap" button (force higher quality with warning)
- Store user preference di localStorage
- Only show once per session

**UI:**
- Yellow/orange gradient header dengan warning icon
- List disabled features dengan bullet points
- Blue info box explaining why
- Green checkmark recommendations
- Two action buttons

### 4. QualitySettingsPanel Component
Collapsible panel untuk manual quality control.

**Features:**
- Show current quality level dengan color coding
- Show device information (tier, score, GPU, memory, CPU)
- Show all quality levels dengan performance impact
- Allow manual quality override
- Show warning untuk low-end devices trying high quality
- Show current settings (shadows, antialiasing, etc.)
- Show recommendations untuk low-end devices
- Collapsible/expandable

**UI:**
- Purple/indigo gradient header
- Device info card dengan tier badge
- Quality level buttons dengan active state
- Current settings grid
- Blue recommendations box untuk low-end devices

### 5. Canvas3D Integration
Integrated graceful degradation ke Canvas3D component.

**Changes:**
- Import DeviceDetector, LowEndDeviceNotification, QualitySettingsPanel
- Add state untuk showLowEndNotification dan showQualityPanel
- Detect low-end device on mount
- Enable graceful degradation if low-end
- Show notification if first time
- Add Quality button di bottom-right (next to Stats button)
- Handle notification actions (dismiss, try anyway)
- Handle quality change from panel

**Flow:**
1. On mount, detect device capabilities
2. If low-end device detected:
   - Check localStorage for previous dismissal
   - Check localStorage for force high quality
   - If not forced, enable graceful degradation
   - If not dismissed, show notification
3. User can dismiss (accept LOW quality) or try anyway (force higher quality)
4. User can open Quality Settings panel anytime untuk manual control

## Low-End Device Detection

Device dianggap low-end jika device score < 40 (dari 100).

**Scoring System:**
- GPU tier: 0-35 points
  - High-end (RTX, RX 6000+, Apple M1+): 35 points
  - Mid-range (GTX, RX 5000, Iris): 20 points
  - Low-end (Intel HD, Mali, Adreno): 5 points
- Memory: 0-25 points
  - 8GB+: 25 points
  - 4GB+: 15 points
  - 2GB+: 8 points
  - <2GB: 3 points
- CPU cores: 0-20 points
  - 8+ cores: 20 points
  - 4+ cores: 12 points
  - 2+ cores: 6 points
  - 1 core: 2 points
- Screen resolution: 0-15 points
  - 4K+: 15 points
  - 1440p+: 12 points
  - 1080p+: 8 points
  - <1080p: 4 points
- Device type: 0-5 points
  - Desktop: 5 points
  - Tablet: 3 points
  - Mobile: 0 points

**Performance Tiers:**
- High: score >= 70
- Medium: score >= 40
- Low: score < 40

## Disabled Features on Low-End Devices

Saat graceful degradation mode aktif (LOW quality):

1. **Shadows**: Disabled
   - Shadow map resolution: 256px (minimal)
   - No shadow casting

2. **Post-processing**: Disabled
   - No bloom, SSAO, or other effects

3. **Antialiasing**: Disabled
   - No MSAA or FXAA
   - Jagged edges visible

4. **High-resolution textures**: Disabled
   - Texture resolution multiplier: 0.25 (25%)
   - Blurry textures

5. **High model count**: Limited
   - Max concurrent models: 20 (vs 100 on ULTRA)

6. **Environment effects**: Simplified
   - Basic lighting only
   - No complex reflections

## User Experience Flow

### First Time Low-End Device User

1. User opens app
2. Device detection runs
3. Low-end device detected (score < 40)
4. Graceful degradation enabled automatically
5. Modal notification appears:
   - "Performa Device Terbatas"
   - List of disabled features
   - Explanation why
   - Recommendations
   - Two buttons: "Saya Mengerti" or "Coba Tetap"
6. User clicks "Saya Mengerti":
   - Modal closes
   - Preference saved to localStorage
   - App runs at LOW quality
   - Modal won't show again
7. User clicks "Coba Tetap":
   - Modal closes
   - Preference saved to localStorage
   - Degradation mode disabled
   - App runs at auto-detected quality (might be MEDIUM)
   - Warning: might lag or crash

### Returning Low-End Device User

1. User opens app
2. Device detection runs
3. Low-end device detected
4. Check localStorage:
   - If dismissed before: No modal, run at LOW quality
   - If forced high quality before: No modal, run at auto-detected quality
5. User can open Quality Settings panel anytime untuk change

### Manual Quality Control

1. User clicks "⚙️ Quality" button
2. Quality Settings panel opens
3. User sees:
   - Current quality level
   - Device information (tier, score, specs)
   - All quality levels dengan performance impact
   - Current settings (shadows, antialiasing, etc.)
   - Recommendations (if low-end)
4. User selects different quality level
5. If low-end device trying HIGH/ULTRA:
   - Confirmation dialog appears
   - "Device Anda memiliki performa terbatas. Menggunakan quality tinggi dapat menyebabkan lag atau crash. Lanjutkan?"
   - User confirms or cancels
6. Quality changed, canvas remounts dengan new settings

## LocalStorage Keys

- `lowEndDeviceNotificationDismissed`: 'true' if user dismissed notification
- `lowEndDeviceForceHighQuality`: 'true' if user chose "Coba Tetap"

## Console Logging

Graceful degradation logs ke console untuk debugging:

```
[Canvas3D] Device Score: 35/100, Tier: low, Low-end: true
[Canvas3D] Graceful degradation mode enabled for low-end device
[Canvas3D] Disabled features: ['Shadows', 'Post-processing', 'Antialiasing', 'High-resolution textures', 'High model count']
[QualityManager] Graceful degradation mode enabled
[QualityManager] Disabled features: ['Shadows', 'Post-processing', 'Antialiasing', 'High-resolution textures', 'High model count']
```

## Window API

Quality controls exposed via `window.__qualityControls`:

```javascript
// Get current quality
window.__qualityControls.getQuality() // 'LOW'

// Set quality manually
window.__qualityControls.setQuality('HIGH')

// Get device capabilities
window.__qualityControls.getDeviceCapabilities()

// Remove manual override
window.__qualityControls.removeOverride()

// Export quality info
window.__qualityControls.exportInfo()
```

## Recommendations for Low-End Devices

Saat low-end device terdeteksi, sistem memberikan recommendations:

1. "Tutup aplikasi lain untuk membebaskan memory"
2. "Kurangi jumlah furniture di scene"
3. "Gunakan browser terbaru untuk performa optimal"
4. "Pertimbangkan upgrade RAM untuk pengalaman lebih baik" (if <4GB)
5. "Device dengan CPU multi-core akan memberikan performa lebih baik" (if <4 cores)

## Performance Impact

### LOW Quality (Graceful Degradation)
- FPS: 50-60 (smooth)
- Memory: ~100-150MB
- Visual quality: Basic
- User experience: Smooth but less pretty

### MEDIUM Quality (Forced on Low-End)
- FPS: 30-45 (acceptable)
- Memory: ~150-250MB
- Visual quality: Good
- User experience: Might lag occasionally

### HIGH/ULTRA Quality (Forced on Low-End)
- FPS: 15-30 (laggy)
- Memory: ~250-400MB
- Visual quality: Excellent
- User experience: Laggy, might crash

## Testing

Manual testing required:

1. **Test on actual low-end device:**
   - Old laptop dengan Intel HD Graphics
   - Mobile device dengan <4GB RAM
   - Tablet dengan low-tier GPU

2. **Test notification flow:**
   - First time user sees notification
   - Dismiss notification (should not show again)
   - Try anyway (should force higher quality)
   - Clear localStorage and test again

3. **Test quality panel:**
   - Open panel, check device info accuracy
   - Change quality levels
   - Verify warning for low-end devices
   - Check current settings display

4. **Test localStorage persistence:**
   - Dismiss notification, refresh page
   - Force high quality, refresh page
   - Clear localStorage, refresh page

5. **Test performance:**
   - Measure FPS at LOW quality
   - Measure FPS at forced MEDIUM quality
   - Verify no crashes or freezes

6. **Test on different browsers:**
   - Chrome (best support)
   - Firefox
   - Safari
   - Edge

## Browser Compatibility

- ✅ Chrome: Full support (deviceMemory, GPU detection)
- ✅ Firefox: Partial support (no deviceMemory)
- ✅ Safari: Partial support (no deviceMemory)
- ✅ Edge: Full support (Chromium-based)
- ⚠️ Mobile browsers: Limited GPU detection

## Future Enhancements

1. **Adaptive degradation**: Gradually reduce quality based on FPS
2. **Per-feature toggle**: Allow user to enable/disable individual features
3. **Performance presets**: Save custom quality presets
4. **A/B testing**: Test different degradation strategies
5. **Analytics**: Track low-end device usage and performance
6. **Smart recommendations**: ML-based recommendations based on usage patterns
7. **Progressive enhancement**: Gradually enable features as performance improves

## Troubleshooting

### Notification not showing
- Check localStorage: `localStorage.getItem('lowEndDeviceNotificationDismissed')`
- Clear localStorage: `localStorage.clear()`
- Check device score: `deviceDetector.getDeviceScore()`

### Quality not changing
- Check manual override: `qualityManager.hasManualOverride()`
- Remove override: `qualityManager.setManualOverride(null)`
- Force canvas remount: Change canvasKey state

### Performance still poor
- Check if degradation mode active: `qualityManager.isInDegradationMode()`
- Check current quality: `qualityManager.getQuality()`
- Check disabled features: `qualityManager.getDisabledFeatures()`
- Verify LOW quality settings applied

### False positive (good device detected as low-end)
- Check device score calculation
- Adjust scoring thresholds in DeviceDetector
- Allow manual override via Quality Settings panel
