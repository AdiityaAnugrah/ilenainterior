import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MetaPageView } from './MetaPageView';

const route = vi.hoisted(() => ({ pathname: '/iklan' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

describe('WhatsApp Lead', () => {
  beforeEach(() => {
    route.pathname = '/iklan';
    delete window.fbq; delete window._fbq;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(cleanup);
  const setup = (href = 'https://wa.me/628123456789?text=private', disabled = false) => render(<>
    <MetaPageView pixelId="123456789" />
    <a href={href} target="_blank" aria-disabled={disabled}><span>Konsultasi</span></a>
  </>);

  it('sends Lead with matching Pixel/CAPI IDs, keepalive and sanitized source; preserves navigation', () => {
    const view = setup();
    const target = view.getByText('Konsultasi');
    expect(fireEvent.click(target)).toBe(true);
    const call = vi.mocked(fetch).mock.calls.at(-1)!;
    expect(call[0]).toBe('/api/meta/lead');
    expect(call[1]!.keepalive).toBe(true);
    const body = JSON.parse(call[1]!.body as string);
    expect(body.event_source_url).toBe(location.origin + '/iklan');
    expect(JSON.stringify(body)).not.toContain('private');
    expect(window.fbq!.queue!.at(-1)).toEqual(['trackSingle', '123456789', 'Lead', {}, { eventID: body.event_id }]);
    fireEvent.click(target);
    expect(JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).event_id).not.toBe(body.event_id);
  });
  it.each(['#', 'https://example.com/', 'https://wa.me.evil.test/62812', 'https://wa.me/', 'http://wa.me/62812'])('ignores invalid destination %s', href => {
    const view = setup(href); fireEvent.click(view.getByText('Konsultasi'));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('ignores disabled and cancelled clicks', () => {
    const view = setup('https://wa.me/62812', true);
    fireEvent.click(view.getByText('Konsultasi'));
    expect(fetch).toHaveBeenCalledTimes(1);
    view.unmount();
    const next = setup();
    next.getByText('Konsultasi').addEventListener('click', event => event.preventDefault());
    fireEvent.click(next.getByText('Konsultasi'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(['/admin/settings', '/login', '/register'])('excludes %s', pathname => {
    route.pathname = pathname; const view = setup();
    fireEvent.click(view.getByText('Konsultasi')); expect(fetch).not.toHaveBeenCalled();
  });
  it('cleans up listeners on rerender, navigation and unmount', () => {
    const view = setup();
    route.pathname = '/planner';
    view.rerender(<><MetaPageView pixelId="123456789" /><a href="https://wa.me/62812" target="_blank">Konsultasi</a></>);
    fireEvent.click(view.getByText('Konsultasi'));
    expect(vi.mocked(fetch).mock.calls.filter(call => call[0] === '/api/meta/lead')).toHaveLength(1);
    expect(JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).event_source_url).toBe(location.origin + '/planner');
    view.unmount();
    const link = document.createElement('a'); link.href = 'https://wa.me/62812'; link.target = '_blank'; document.body.append(link);
    fireEvent.click(link); link.remove(); expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('does not block navigation if tracking fails', async () => {
    const view = setup(); vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    expect(fireEvent.click(view.getByText('Konsultasi'))).toBe(true);
    await Promise.resolve();
  });
});
