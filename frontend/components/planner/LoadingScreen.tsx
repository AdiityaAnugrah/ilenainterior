'use client';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  progress: number; // 0-100
  message?: string;
  tips?: string[];
}

const DEFAULT_TIPS = [
  '💡 Gunakan scroll mouse untuk zoom in/out',
  '💡 Klik kanan + drag untuk memutar kamera',
  '💡 Klik kiri + drag untuk menggeser view',
  '💡 Project Anda auto-save setiap 10 detik',
  '💡 Klik furniture untuk edit posisi dan rotasi',
  '💡 Gunakan tombol Delete untuk hapus furniture',
  '💡 Anda bisa share desain ke WhatsApp',
  '💡 Ganti material dinding di tab Material',
];

export default function LoadingScreen({ progress, message = 'Memuat...', tips = DEFAULT_TIPS }: LoadingScreenProps) {
  const [currentTip, setCurrentTip] = useState(0);

  // Rotate tips every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-stone-800 tracking-wide mb-2">
            ILENA INTERIOR
          </h1>
          <p className="text-sm text-stone-500">3D Room Planner</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700">{message}</span>
            <span className="text-sm font-semibold text-stone-800">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-800 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Loader2 size={20} className="animate-spin text-stone-600" />
          <span className="text-sm text-stone-600">Mohon tunggu sebentar...</span>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 min-h-[80px] flex items-center justify-center">
          <p className="text-sm text-stone-600 text-center transition-opacity duration-300">
            {tips[currentTip]}
          </p>
        </div>

        {/* Estimated Time (optional) */}
        {progress < 100 && (
          <p className="text-xs text-stone-400 text-center mt-4">
            Estimasi: {Math.ceil((100 - progress) / 20)} detik lagi
          </p>
        )}
      </div>
    </div>
  );
}
