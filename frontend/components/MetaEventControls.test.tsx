import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MetaPageView } from './MetaPageView';
vi.mock('next/navigation', () => ({ usePathname: () => '/iklan' }));
beforeEach(() => { delete window.fbq; delete window._fbq; vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true})); });
afterEach(cleanup);
it('turns off PageView independently while Lead continues and retains matching IDs', () => {
  const view=render(<><MetaPageView pixelId="123456789" pageViewEnabled={false} /><a target="_blank" href="https://wa.me/62812">WA</a></>);
  expect(fetch).not.toHaveBeenCalled(); fireEvent.click(view.getByText('WA'));
  expect(fetch).toHaveBeenCalledTimes(1);
  const call=vi.mocked(fetch).mock.calls[0]; expect(call[0]).toBe('/api/meta/lead');
  const body=JSON.parse(call[1]!.body as string);
  expect(window.fbq!.queue!.at(-1)).toEqual(['trackSingle','123456789','Lead',{}, {eventID:body.event_id}]);
});
it('turns off Lead without blocking WhatsApp navigation or PageView', () => {
  const view=render(<><MetaPageView pixelId="123456789" leadEnabled={false} /><a target="_blank" href="https://wa.me/62812">WA</a></>);
  expect(fetch).toHaveBeenCalledTimes(1); expect(fireEvent.click(view.getByText('WA'))).toBe(true); expect(fetch).toHaveBeenCalledTimes(1);
});
