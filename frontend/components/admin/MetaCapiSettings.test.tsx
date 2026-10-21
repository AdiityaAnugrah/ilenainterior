import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MetaCapiSettings } from './MetaCapiSettings';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
describe('MetaCapiSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { meta_pixel_id: '123456789', meta_capi_enabled: true, has_access_token: true, meta_capi_test_event_code: 'TEST123' } });
    vi.mocked(api.put).mockResolvedValue({ data: { has_access_token: true } });
    vi.mocked(api.post).mockResolvedValue({ data: { message: 'Event diterima' } });
  });
  it('loads masked token status and saves replacement token with explicit CAPI fields', async () => {
    render(<MetaCapiSettings />);
    const token = await screen.findByLabelText('Conversions API Access Token');
    expect(token).toHaveValue(''); expect(token).toHaveAttribute('type', 'password');
    fireEvent.change(token, { target: { value: 'NEW_EXAMPLE_TOKEN' } });
    fireEvent.click(screen.getByText('Simpan Meta CAPI'));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/admin/meta-capi', {
      meta_pixel_id: '123456789', meta_page_view_enabled: true, meta_lead_enabled: true, meta_capi_enabled: true, meta_capi_access_token: 'NEW_EXAMPLE_TOKEN', meta_capi_test_event_code: 'TEST123', clear_token: false,
    }));
    await waitFor(() => expect(token).toHaveValue(''));
  });
  it('sends test using saved configuration and shows the result', async () => {
    render(<MetaCapiSettings />); const button = await screen.findByText('Kirim Event Uji');
    fireEvent.click(button); expect(await screen.findByRole('status')).toHaveTextContent('Event diterima');
    expect(api.post).toHaveBeenCalledWith('/api/admin/meta-capi/test', { event_name: 'PageView' });
  });
  it('shows load failure rather than allowing an empty configuration overwrite', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('offline')); render(<MetaCapiSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Konfigurasi gagal dimuat');
    expect(screen.queryByText('Simpan Meta CAPI')).not.toBeInTheDocument();
  });
});
