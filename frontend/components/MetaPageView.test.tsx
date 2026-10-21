import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MetaPageView } from './MetaPageView';

const route = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

describe('MetaPageView', () => {
  beforeEach(() => {
    route.pathname = '/';
    delete window.fbq; delete window._fbq;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });
  it('sends matching browser/server IDs, deduplicates rerenders and tracks navigation', () => {
    const view = render(<MetaPageView pixelId="123456789" />);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(window.fbq!.queue![1]).toEqual(['trackSingle', '123456789', 'PageView', {}, { eventID: body.event_id }]);
    expect(body.event_source_url).toBe(location.origin + '/');
    view.rerender(<MetaPageView pixelId="123456789" />);
    expect(fetch).toHaveBeenCalledTimes(1);
    route.pathname = '/products'; view.rerender(<MetaPageView pixelId="123456789" />);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(window.fbq!.queue!.filter(item => item[0] === 'init')).toHaveLength(1);
    route.pathname = '/'; view.rerender(<MetaPageView pixelId="123456789" />);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it.each(['/admin', '/admin/settings', '/login', '/register'])('excludes %s', pathname => {
    route.pathname = pathname; render(<MetaPageView pixelId="123456789" />);
    expect(fetch).not.toHaveBeenCalled(); expect(window.fbq).toBeUndefined();
  });
  it('ignores invalid pixel IDs', () => {
    render(<MetaPageView pixelId="<script>" />); expect(fetch).not.toHaveBeenCalled();
  });
});
