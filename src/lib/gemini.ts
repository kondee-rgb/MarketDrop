/**
 * Shared server-side Gemini Vision call that returns parsed JSON.
 * Key goes in a header (not the URL) so it never lands in request logs.
 */
export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

// Measured 2026-11-15: the newest Flash (`gemini-flash-latest`) was 503 / hanging 45s+,
// while these answered in ~1–5s. Fixed names (not "-latest") so a new release can't break us.
export const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
export const GEMINI_TIMEOUT_MS = 5000; // per model: slower than this → try the next one
export const GEMINI_BUSY_MESSAGE = 'ระบบ AI ไม่ว่างชั่วคราว ลองใหม่อีกครั้ง หรือตรวจด้วยตาไปก่อน';

class GeminiRequestError extends Error {}

export async function geminiImageToJson(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<unknown> {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  const models = [process.env.GEMINI_MODEL, ...GEMINI_MODELS].filter(
    (m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i
  );
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: cleanBase64 } }] }],
    generationConfig: { response_mime_type: 'application/json' }
  });

  for (const model of models) {
    try {
      // The signal also covers reading the body, so a stalled download falls through to the next model too
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS)
      });

      if (!response.ok) {
        console.error(`Gemini ${model} HTTP ${response.status}:`, (await response.text()).slice(0, 300));
        // busy / gone / rate-limited → next model; anything else (e.g. 400 bad image or key) won't improve by retrying
        if (response.status === 404 || response.status === 429 || response.status >= 500) continue;
        throw new GeminiRequestError(`อ่านรูปไม่สำเร็จ (Gemini ${response.status})`);
      }

      const resData = await response.json();
      const candidate = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidate) {
        console.error(`Gemini ${model}: empty answer`);
        continue;
      }
      return JSON.parse(candidate);
    } catch (err) {
      if (err instanceof GeminiRequestError) throw err;
      const reason = err instanceof Error && err.name === 'TimeoutError' ? `timeout >${GEMINI_TIMEOUT_MS}ms` : err;
      console.error(`Gemini ${model} failed:`, reason);
    }
  }
  throw new Error(GEMINI_BUSY_MESSAGE);
}
