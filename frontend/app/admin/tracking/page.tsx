import { MetaCapiSettings } from '@/components/admin/MetaCapiSettings';
import { MarketingTrackingSettings } from '@/components/admin/MarketingTrackingSettings';
export default function TrackingPage() {
  return <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
    <header><h1 className="text-2xl font-bold text-stone-900">Event & Tracking Iklan</h1><p className="mt-2 text-sm leading-6 text-stone-600">Kelola event Lead/PageView, Meta Pixel, CAPI, dan integrasi tracking website. Pengaturan ini tersedia untuk admin dan pengelola iklan.</p></header>
    <MetaCapiSettings /><MarketingTrackingSettings />
  </div>;
}
