/**
 * Robust API helper to fetch and parse JSON safely without throwing "Unexpected token '<'" syntax errors on HTML error pages.
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      console.warn(`API [${url}] returned non-JSON content-type (${contentType}) status ${res.status}:`, text.slice(0, 120));
      return {
        ok: res.ok,
        status: res.status,
        data: { error: res.ok ? undefined : `Server returned status ${res.status}`, text },
      };
    }
    const data = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (err: any) {
    console.warn(`API fetch exception for [${url}]:`, err);
    return {
      ok: false,
      status: 500,
      data: { error: err?.message || 'Network request failed' },
    };
  }
}
