'use client';
import { useEffect, useState } from 'react';
import { Loader2, Check, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
}

export default function AutoSaveIndicator({ isSaving, lastSaved }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Show "Tersimpan" message for 2 seconds after save
  useEffect(() => {
    if (!isSaving && lastSaved) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, lastSaved]);

  // Update "time ago" every 10 seconds
  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastSaved) {
        setTimeAgo('');
        return;
      }

      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      
      if (seconds < 60) {
        setTimeAgo('baru saja');
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`${minutes} menit lalu`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours} jam lalu`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [lastSaved]);

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
        <Loader2 size={14} className="animate-spin" />
        <span>Menyimpan...</span>
      </div>
    );
  }

  if (showSaved) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-100 animate-in fade-in duration-200">
        <Check size={14} />
        <span>Tersimpan</span>
      </div>
    );
  }

  if (lastSaved && timeAgo) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 text-stone-500 rounded-lg text-xs border border-stone-100">
        <Cloud size={14} />
        <span>Tersimpan {timeAgo}</span>
      </div>
    );
  }

  return null;
}
