export function canAccessAdmin(role?: string) {
  return role === 'admin' || role === 'ads_analyst';
}

export function adminLanding(role?: string) {
  return role === 'ads_analyst' ? '/admin/ads' : role === 'admin' ? '/admin' : '/planner';
}

export function canAccessAdminPath(role: string | undefined, pathname: string) {
  return role === 'admin' || (role === 'ads_analyst' && ['/admin/ads', '/admin/analytics', '/admin/tracking'].includes(pathname));
}
