/**
 * Groq Cloud AI Client
 * Provides ultra-fast inference (<1s) and high rate limits on free tier.
 * Uses Llama 4 Scout (free tier, vision-capable) as primary model.
 * Falls back to llama-3.1-8b-instant if primary is unavailable.
 */

// Free-tier models — ordered by capability (best first)
const GROQ_TEXT_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct", // Free, 128K ctx, vision-capable
  "llama-3.1-8b-instant",                       // Free, 128K ctx, very fast
];

const GROQ_VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct", // Free, multimodal (image + text)
  "llama-3.2-11b-vision-preview",               // Preview, may be unavailable
];

async function groqChatCompletion(
  model: string,
  messages: any[],
  apiKey: string,
  timeout = 45000
): Promise<{ ok: boolean; status: number; body: any }> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(timeout),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

export async function parseQuizWithGroqText(
  fullText: string,
  systemPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string; model?: string }> {
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `DOKUMEN SOAL (Teks digital resmi hasil ekstraksi dokumen PDF):\n\n${fullText}\n\nInstruksi: Ekstrak seluruh butir soal, pilihan jawaban (A, B, C, D), nomor soal, dan kunci jawaban/pembahasan ke dalam struktur JSON yang diminta. Wajib kembalikan format JSON murni.`,
    },
  ];

  let lastError = "";
  for (const model of GROQ_TEXT_MODELS) {
    try {
      const { ok, status, body } = await groqChatCompletion(model, messages, apiKey);

      if (!ok) {
        const errText = JSON.stringify(body);
        // If model not found, try next model
        if (status === 404 || status === 400) {
          lastError = `Groq model '${model}' not found (HTTP ${status}): ${errText}`;
          continue;
        }
        return { success: false, error: `Groq API returned HTTP ${status}: ${errText}` };
      }

      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `Groq model '${model}' returned empty response.`;
        continue;
      }

      const parsed = JSON.parse(content);
      return { success: true, data: parsed, model };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { success: false, error: lastError || "All Groq text models failed." };
}

export async function parseQuizWithGroqVision(
  jpegBase64Images: string[],
  systemPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string; model?: string }> {
  const contentParts: any[] = [
    {
      type: "text",
      text: "Ekstrak seluruh soal, opsi jawaban (A, B, C, D), nomor soal, dan kunci jawaban dari halaman-halaman dokumen ujian berikut ke dalam struktur JSON yang diminta.",
    },
  ];

  for (const b64 of jpegBase64Images) {
    contentParts.push({
      type: "image_url",
      image_url: {
        url: b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`,
      },
    });
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contentParts },
  ];

  let lastError = "";
  for (const model of GROQ_VISION_MODELS) {
    try {
      const { ok, status, body } = await groqChatCompletion(model, messages, apiKey, 60000);

      if (!ok) {
        const errText = JSON.stringify(body);
        if (status === 404 || status === 400) {
          lastError = `Groq vision model '${model}' not found (HTTP ${status}): ${errText}`;
          continue;
        }
        return { success: false, error: `Groq Vision returned HTTP ${status}: ${errText}` };
      }

      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `Groq vision model '${model}' returned empty response.`;
        continue;
      }

      const parsed = JSON.parse(content);
      return { success: true, data: parsed, model };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { success: false, error: lastError || "All Groq vision models failed." };
}

export async function generateQuizWithGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string; model?: string }> {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let lastError = "";
  for (const model of GROQ_TEXT_MODELS) {
    try {
      const { ok, status, body } = await groqChatCompletion(model, messages, apiKey);

      if (!ok) {
        const errText = JSON.stringify(body);
        if (status === 404 || status === 400) {
          lastError = `Groq model '${model}' not found (HTTP ${status}): ${errText}`;
          continue;
        }
        return { success: false, error: `Groq API returned HTTP ${status}: ${errText}` };
      }

      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `Groq model '${model}' returned empty response.`;
        continue;
      }

      const parsed = JSON.parse(content);
      return { success: true, data: parsed, model };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { success: false, error: lastError || "All Groq models failed." };
}
