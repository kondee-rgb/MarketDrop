/**
 * Shared server-side Gemini Vision call that returns parsed JSON.
 * Key goes in a header (not the URL) so it never lands in request logs.
 */
export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

export async function geminiImageToJson(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  preferLite = false
): Promise<unknown> {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

  // gemini-2.5-flash was retired for new keys (404). Aliases follow the current models;
  // Flash is often overloaded (503 / hangs), so fall back to Flash-Lite. Printed text (slips) goes Lite-first.
  const order = preferLite
    ? ['gemini-flash-lite-latest', 'gemini-flash-latest']
    : ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  const models = [process.env.GEMINI_MODEL, ...order].filter(
    (m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i
  );
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: cleanBase64 } }] }],
    generationConfig: { response_mime_type: 'application/json' }
  });

  let lastError = 'Gemini API error';
  for (const [i, model] of models.entries()) {
    const isLast = i === models.length - 1;
    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        // give up on a stuck model quickly so the person at the door isn't left waiting
        signal: AbortSignal.timeout(isLast ? 30000 : 12000)
      });
    } catch {
      lastError = `Gemini ${model} timeout`;
      continue;
    }

    if (!response.ok) {
      console.error(`Gemini API Error (${model}):`, await response.text());
      lastError = `Gemini API error: ${response.status}`;
      if (response.status === 404 || response.status === 429 || response.status >= 500) continue;
      throw new Error(lastError);
    }

    const resData = await response.json();
    const candidate = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error('ไม่พบคำตอบจาก Gemini');
    return JSON.parse(candidate);
  }
  throw new Error(`${lastError} — ลองใหม่อีกครั้ง`);
}
