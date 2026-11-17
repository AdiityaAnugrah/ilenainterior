import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from './useAutoSave';

const fixture = vi.hoisted(() => ({
  current: null as any,
  setProjectId: vi.fn(),
  setProjectRevision: vi.fn(),
}));
const apiMock = vi.hoisted(() => ({ put: vi.fn(), post: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/store/editorStore', () => ({
  useEditorStore: Object.assign(vi.fn(() => fixture.current), {
    getState: () => fixture.current,
  }),
}));
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ token: null }) }));
vi.mock('@/lib/api', () => ({ default: apiMock }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

describe('useAutoSave', () => {
  beforeEach(() => {
    apiMock.put.mockReset();
    apiMock.post.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    fixture.setProjectId.mockReset();
    fixture.setProjectRevision.mockReset();
    fixture.setProjectRevision.mockImplementation((revision: string) => { fixture.current.projectRevision = revision; });
    fixture.current = {
      items: [],
      roomConfig: { roomType: 'ruang_tamu', width: 5, depth: 4 },
      projectId: 12,
      projectRevision: 'revision-1',
      projectName: 'Draft',
      setProjectId: fixture.setProjectId,
      setProjectRevision: fixture.setProjectRevision,
    };
  });

  it('keeps failed manual saves unsuccessful and exposes retry state', async () => {
    apiMock.put.mockRejectedValueOnce(new Error('fixture network failure'));
    const { result } = renderHook(() => useAutoSave());
    let succeeded = true;

    await act(async () => {
      succeeded = await result.current.save(false);
    });

    expect(succeeded).toBe(false);
    expect(result.current.saveError).toBe(true);
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(toastMock.error).toHaveBeenCalledWith('Gagal menyimpan proyek');
  });

  it('serializes overlapping saves and sends the newest document last', async () => {
    let resolveFirst!: (value: unknown) => void;
    apiMock.put
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: { revision: 'revision-2' } })
      .mockResolvedValueOnce({ data: { revision: 'revision-3' } });
    const { result } = renderHook(() => useAutoSave());
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;

    act(() => { first = result.current.save(true); });
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    fixture.current.projectName = 'Latest name';
    act(() => { second = result.current.save(true); });
    expect(apiMock.put).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({ data: {} });
      expect(await first).toBe(false);
      expect(await second).toBe(true);
    });

    expect(apiMock.put).toHaveBeenCalledTimes(2);
    expect(apiMock.put.mock.calls[0][1].expected_revision).toBe('revision-1');
    expect(apiMock.put.mock.calls[1][1].expected_revision).toBe('revision-2');
    expect(apiMock.put.mock.calls[1][1].name).toBe('Latest name');
    expect(fixture.current.projectRevision).toBe('revision-3');
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('keeps a conflicting revision unsaved for manual recovery', async () => {
    apiMock.put.mockRejectedValueOnce({ response: { status: 409 } });
    const { result } = renderHook(() => useAutoSave());
    let succeeded = true;
    await act(async () => { succeeded = await result.current.save(true); });
    expect(succeeded).toBe(false);
    expect(result.current.saveError).toBe(true);
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.saveErrorMessage).toBe('Versi proyek berubah. Buka ulang proyek sebelum menyimpan.');
    expect(apiMock.put.mock.calls[0][1].expected_revision).toBe('revision-1');
  });
});
