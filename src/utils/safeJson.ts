/**
 * Safely parses JSON from a fetch Response, guarding against non-JSON (HTML/text error) responses.
 */
export async function safeJson(res: Response, fallbackValue: any = {}): Promise<any> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      console.warn(`API returned non-JSON content-type (${contentType}) with status ${res.status}:`, text.slice(0, 120));
      return fallbackValue;
    }
    return await res.json();
  } catch (err) {
    console.warn('JSON parsing error caught safely:', err);
    return fallbackValue;
  }
}
