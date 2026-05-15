'use client';

import React, { useState, useEffect } from 'react';
import { QualityManager, type QualityLevel } from '@/lib/quality/QualityManager';
import { deviceDetector } from '@/lib/performance/DeviceDetector';
import { Settings, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface QualitySettingsPanelProps {
  qualityManager: QualityManager;
  onQualityChange: (level: QualityLevel) => void;
}

/**
 * QualitySettingsPanel Component
 * 
 * Panel untuk manual quality control dengan informasi device capabilities.
 * 
 * Features:
 * - Show current quality level (LOW/MEDIUM/HIGH/ULTRA)
 * - Show device capabilities (GPU, memory, CPU)
 * - Show enabled/disabled features
 * - Allow manual quality override dengan warning untuk low-end devices
 * - Show performance impact estimate untuk each quality level
 * - Collapsible panel
 * 
 * Requirements: 12.5
 */
export default function QualitySettingsPanel({
  qualityManager,
  onQualityChange,
}: QualitySettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>(qualityManager.getQuality());
  const [deviceInfo, setDeviceInfo] = useState(deviceDetector.detect());
  const [deviceScore, setDeviceScore] = useState(deviceDetector.getDeviceScore());
  const [performanceTier, setPerformanceTier] = useState(deviceDetector.getPerformanceTier());

  useEffect(() => {
    // Update current quality every second
    const interval = setInterval(() => {
      const newQuality = qualityManager.getQuality();
      if (newQuality !== currentQuality) {
        setCurrentQuality(newQuality);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qualityManager, currentQuality]);

  const handleQualityChange = (level: QualityLevel) => {
    // Show warning for low-end devices trying to use high quality
    if (performanceTier === 'low' && (level === 'HIGH' || level === 'ULTRA')) {
      const confirmed = window.confirm(
        'Device Anda memiliki performa terbatas. Menggunakan quality tinggi dapat menyebabkan lag atau crash. Lanjutkan?'
      );
      if (!confirmed) return;
    }

    qualityManager.setManualOverride(level);
    setCurrentQuality(level);
    onQualityChange(level);
  };

  const getQualityColor = (level: QualityLevel): string => {
    switch (level) {
      case 'LOW':
        return 'text-red-600 bg-red-50';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50';
      case 'HIGH':
        return 'text-green-600 bg-green-50';
      case 'ULTRA':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPerformanceImpact = (level: QualityLevel): string => {
    switch (level) {
      case 'LOW':
        return 'Ringan - FPS tinggi, visual minimal';
      case 'MEDIUM':
        return 'Sedang - Balance antara FPS dan visual';
      case 'HIGH':
        return 'Berat - Visual bagus, FPS sedang';
      case 'ULTRA':
        return 'Sangat Berat - Visual maksimal, FPS rendah';
      default:
        return '';
    }
  };

  const getDeviceTierColor = (tier: 'low' | 'medium' | 'high'): string => {
    switch (tier) {
      case 'low':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getDeviceTierLabel = (tier: 'low' | 'medium' | 'high'): string => {
    switch (tier) {
      case 'low':
        return 'Rendah';
      case 'medium':
        return 'Sedang';
      case 'high':
        return 'Tinggi';
      default:
        return 'Unknown';
    }
  };

  const settings = qualityManager.getSettings();
  const isInDegradationMode = qualityManager.isInDegradationMode();

  return (
    <div className="fixed bottom-4 right-[250px] z-40">
      {/* Compact Button - Only show icon when collapsed */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-white hover:bg-gray-50 text-gray-700 rounded-full p-2.5 shadow-lg border border-gray-200 transition-all hover:shadow-xl"
          title="Quality Settings"
        >
          <Settings size={16} />
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-72 max-h-[400px] overflow-hidden">
          {/* Compact Header */}
          <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-gray-600" />
              <span className="text-xs font-semibold text-gray-700">Quality</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${getQualityColor(currentQuality)}`}>
                {currentQuality}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Simplified Content */}
          <div className="p-3 space-y-3 max-h-[340px] overflow-y-auto">
            {/* Degradation Warning - Only if active */}
            {isInDegradationMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-800">Mode hemat aktif untuk performa optimal</p>
              </div>
            )}

            {/* Quick Quality Selector */}
            <div className="grid grid-cols-2 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as QualityLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handleQualityChange(level)}
                  className={`px-3 py-2 rounded text-xs font-semibold transition-all ${
                    currentQuality === level
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Device Info - Minimal */}
            <div className="bg-gray-50 rounded p-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Device:</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getDeviceTierColor(performanceTier)}`}>
                  {getDeviceTierLabel(performanceTier)} ({deviceScore}/100)
                </span>
              </div>
            </div>

            {/* Recommendations - Only for low-end devices */}
            {performanceTier === 'low' && (
              <div className="bg-blue-50 rounded p-2">
                <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tips:</p>
                <p className="text-xs text-blue-800">Gunakan LOW atau MEDIUM untuk performa terbaik</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
