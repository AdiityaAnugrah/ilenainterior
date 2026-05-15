'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface LowEndDeviceNotificationProps {
  disabledFeatures: string[];
  onDismiss: () => void;
  onTryAnyway: () => void;
}

/**
 * LowEndDeviceNotification Component
 * 
 * Menampilkan notifikasi saat low-end device terdeteksi.
 * Memberitahu user tentang fitur yang dinonaktifkan untuk performa optimal.
 * 
 * Features:
 * - List disabled features
 * - "Saya Mengerti" button untuk dismiss
 * - "Coba Tetap" button untuk force higher quality (dengan warning)
 * - Store user preference di localStorage
 * - Only show once per session
 * 
 * Requirements: 12.5
 */
export default function LowEndDeviceNotification({
  disabledFeatures,
  onDismiss,
  onTryAnyway,
}: LowEndDeviceNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user has dismissed this notification before
    const dismissed = localStorage.getItem('lowEndDeviceNotificationDismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
      onDismiss();
    }
  }, [onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('lowEndDeviceNotificationDismissed', 'true');
    onDismiss();
  };

  const handleTryAnyway = () => {
    setIsVisible(false);
    localStorage.setItem('lowEndDeviceNotificationDismissed', 'true');
    localStorage.setItem('lowEndDeviceForceHighQuality', 'true');
    onTryAnyway();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-yellow-500 to-orange-500 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} />
            <span className="text-sm font-semibold">Performa Device Terbatas</span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-700">
            Device Anda memiliki performa terbatas. Beberapa fitur visual telah dinonaktifkan untuk memastikan pengalaman yang lancar dan optimal.
          </p>

          {/* Disabled Features List */}
          {disabledFeatures.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase">Fitur yang Dinonaktifkan:</p>
              <ul className="space-y-1">
                {disabledFeatures.map((feature, index) => (
                  <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Explanation */}
          <div className="bg-blue-50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-blue-900">Mengapa ini terjadi?</p>
            <p className="text-xs text-blue-800">
              Aplikasi 3D membutuhkan resource yang cukup besar. Dengan menonaktifkan beberapa fitur visual, kami memastikan aplikasi tetap berjalan lancar di device Anda.
            </p>
          </div>

          {/* Recommendations */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-700">Rekomendasi:</p>
            <ul className="space-y-1">
              <li className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Tutup aplikasi lain untuk membebaskan memory</span>
              </li>
              <li className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Kurangi jumlah furniture di scene</span>
              </li>
              <li className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Gunakan browser terbaru untuk performa optimal</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-end gap-2">
          <button
            onClick={handleTryAnyway}
            className="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Coba Tetap
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-xs font-medium bg-linear-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-colors shadow-sm"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
