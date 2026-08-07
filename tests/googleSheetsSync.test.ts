import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FormData } from '../types';
import {
  syncToSheets,
  syncAllCompaniesToSheets,
  syncAllCompaniesToSheetsNow,
  SYNC_DEBOUNCE_MS,
} from '../utils/googleSheetsSync';

// supabaseClient is mocked so tests never hit the real client (which throws
// without VITE_* env vars). googleSheetsSync itself is the unit under test.
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  fromSelect: vi.fn(),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: () => ({ select: mocks.fromSelect }),
  },
}));

/** DB-style rows returned by the (mocked) companies table query. */
const companiesFixture = [
  { id: 'c1', company_name: 'Acme', form_data: { companyName: 'Acme' } },
  { id: 'c2', company_name: 'Beta', form_data: { companyName: 'Beta' } },
] as unknown as FormData[];

/** Response-like object the sync's fetch() awaits on. */
function okResponse(overrides: Partial<{ success: boolean; tabs: unknown[]; error?: string }> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, tabs: [{ name: 'Companies', rows: 2 }], ...overrides }),
  };
}

const fetchMock = vi.fn();

/** Deferred that lets a test hold a fetch in flight and release it manually. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Flush pending microtasks (promise chains resolve even under fake timers). */
async function flushAsync(times = 10) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('googleSheetsSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    mocks.getSession.mockReset().mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
    mocks.fromSelect.mockReset().mockResolvedValue({ data: companiesFixture, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns an error result when given no company data', async () => {
    const result = await syncToSheets([]);
    expect(result).toEqual({ success: false, error: 'No company data provided' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an error when the session is missing', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const result = await syncToSheets(companiesFixture);
    expect(result).toEqual({ success: false, error: 'Not authenticated' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the companies to the sheets edge function', async () => {
    const result = await syncToSheets(companiesFixture);
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/functions/v1/sync-sheets');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    expect(JSON.parse(init.body as string).companies).toHaveLength(2);
  });

  describe('syncAllCompaniesToSheets (debounced)', () => {
    it('is single-flight: concurrent calls share one promise and run exactly one sync', async () => {
      const first = syncAllCompaniesToSheets();
      const second = syncAllCompaniesToSheets();
      // Same pending promise — the second caller is never left hanging.
      expect(first).toBe(second);

      // Inside the debounce window nothing has run yet.
      await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS - 1);
      expect(fetchMock).not.toHaveBeenCalled();

      // After the window elapses: one companies fetch, one edge-function call.
      await vi.advanceTimersByTimeAsync(1);
      const result = await first;
      expect(result.success).toBe(true);
      expect(mocks.fromSelect).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('cleans up after firing: a later call schedules a fresh promise and runs again', async () => {
      const first = syncAllCompaniesToSheets();
      await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS);
      await first;
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const second = syncAllCompaniesToSheets();
      expect(second).not.toBe(first);
      await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS);
      await second;
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncAllCompaniesToSheetsNow (immediate)', () => {
    it('runs immediately, bypassing the debounce window', async () => {
      const result = await syncAllCompaniesToSheetsNow();
      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('is independent of a pending debounced sync: shares nothing and cancels nothing', async () => {
      const debounced = syncAllCompaniesToSheets();
      const immediate = syncAllCompaniesToSheetsNow();
      expect(immediate).not.toBe(debounced);

      // Immediate sync already ran.
      await immediate;
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // The debounced call is still scheduled and runs on its own after the window.
      await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS);
      await debounced;
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('coalescing while a sync is in progress', () => {
    it('queues one follow-up sync instead of running concurrently', async () => {
      const held = deferred<ReturnType<typeof okResponse>>();
      fetchMock.mockReturnValueOnce(held.promise);

      const inFlight = syncToSheets(companiesFixture);
      await flushAsync();

      // A second call while in progress is queued, not run.
      const queued = await syncToSheets(companiesFixture);
      expect(queued.success).toBe(false);
      expect(queued.error ?? '').toContain('queued');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Release the in-flight sync.
      held.resolve(okResponse());
      const first = await inFlight;
      expect(first.success).toBe(true);

      // The queued follow-up re-fetches companies and syncs once more.
      await flushAsync();
      expect(mocks.fromSelect).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('settles a pending debounced caller when a queued follow-up cancels its timer (no hang)', async () => {
      // Schedule a debounced sync; its timer is still pending.
      const debounced = syncAllCompaniesToSheets();
      expect(fetchMock).not.toHaveBeenCalled();

      // Start a direct sync and hold it in flight so a follow-up gets queued.
      const held = deferred<ReturnType<typeof okResponse>>();
      fetchMock.mockReturnValueOnce(held.promise);
      const inFlight = syncToSheets(companiesFixture);
      await flushAsync();

      // Queue a follow-up while in flight.
      await syncToSheets(companiesFixture);

      // Release the in-flight sync. Its finally block cancels the still-pending
      // debounce timer and runs the queued follow-up — the debounced caller
      // must be settled by that follow-up instead of hanging forever.
      held.resolve(okResponse());
      await inFlight;
      await flushAsync();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      await expect(debounced).resolves.toMatchObject({ success: true });
    });
  });
});
