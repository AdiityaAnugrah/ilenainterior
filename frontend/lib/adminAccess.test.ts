import { describe, it, expect } from 'vitest';
import { adminLanding, canAccessAdmin, canAccessAdminPath } from './adminAccess';
describe('Ads analyst access', () => {
  it('lands analysts on ads dashboard and limits navigation to read-only analytics', () => {
    expect(adminLanding('ads_analyst')).toBe('/admin/ads');
    expect(canAccessAdmin('ads_analyst')).toBe(true);
    expect(canAccessAdminPath('ads_analyst', '/admin/ads')).toBe(true);
    expect(canAccessAdminPath('ads_analyst', '/admin/analytics')).toBe(true);
    expect(canAccessAdminPath('ads_analyst', '/admin/tracking')).toBe(true);
    for (const path of ['/admin', '/admin/users', '/admin/orders/1', '/admin/settings', '/admin/ads/../settings']) expect(canAccessAdminPath('ads_analyst', path)).toBe(false);
  });
  it('retains full admin access and excludes customers and anonymous visitors', () => {
    expect(adminLanding('admin')).toBe('/admin');
    expect(canAccessAdminPath('admin', '/admin/settings')).toBe(true);
    for (const role of ['user', undefined]) {
      expect(adminLanding(role)).toBe('/planner');
      expect(canAccessAdmin(role)).toBe(false);
      expect(canAccessAdminPath(role, '/admin/ads')).toBe(false);
    }
  });
});
