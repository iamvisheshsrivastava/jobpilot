export type LLMResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Call the user's configured LLM provider via the server-side /api/llm endpoint.
 * The userId parameter is kept for API compatibility but is no longer used
 * (the server resolves the user from the session).
 */
export async function callLLM(
  _userId: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResult> {
  try {
    const res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` }
    }
    return { ok: true, text: data.text ?? '' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Network error: ${msg}` }
  }
}
