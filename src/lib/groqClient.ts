/**
 * Groq Cloud AI Client
 * Provides ultra-fast inference (<1s) and high rate limits on free tier.
 *
 * Model fallback chain (tried in order until one succeeds):
 * 1. meta-llama/llama-4-scout-17b-16e-instruct  – Llama 4 Scout, free, vision-capable
 * 2. llama-3.3-70b-versatile                     – Llama 3.3 70B, free dev plan
 * 3. llama-3.1-8b-instant                        – Llama 3.1 8B, free dev plan, fastest
 * 4. llama3-70b-8192                             – Legacy stable ID for 70B
 * 5. llama3-8b-8192                              – Legacy stable ID for 8B
 * 6. gemma2-9b-it                               – Google Gemma 2 on Groq
 */

const GROQ_TEXT_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "gemma2-9b-it",
];

const GROQ_VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
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
): Promise<{ success: boolean; data?: any; error?: string; model?: string; triedModels?: string[] }> {
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `DOKUMEN SOAL (Teks digital resmi hasil ekstraksi dokumen PDF):\n\n${fullText}\n\nInstruksi: Ekstrak seluruh butir soal, pilihan jawaban (A, B, C, D), nomor soal, dan kunci jawaban/pembahasan ke dalam struktur JSON yang diminta. Wajib kembalikan format JSON murni.`,
    },
  ];

  const triedModels: string[] = [];
  let lastError = "";

  for (const model of GROQ_TEXT_MODELS) {
    triedModels.push(model);
    try {
      const { ok, status, body } = await groqChatCompletion(model, messages, apiKey);

      if (!ok) {
        const errText = JSON.stringify(body);
        // 404/400 = model not found or no access → try next model
        if (status === 404 || status === 400) {
          lastError = `Model '${model}' tidak tersedia (HTTP ${status})`;
          console.warn(`[groqClient] ${lastError}`);
          continue;
        }
        // 429 = rate limit → stop trying (no point trying other models with same key)
        return {
          success: false,
          error: `Groq rate limited (429). Coba lagi dalam 1 menit.`,
          triedModels,
        };
      }

      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `Model '${model}' mengembalikan respons kosong.`;
        continue;
      }

      const parsed = JSON.parse(content);
      return { success: true, data: parsed, model, triedModels };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[groqClient] Model ${model} error:`, lastError);
    }
  }

  return {
    success: false,
    error: `Semua model Groq gagal. Model dicoba: ${triedModels.join(", ")}. Error terakhir: ${lastError}`,
    triedModels,
  };
}

export async function parseQuizWithGroqVision(
  jpegBase64Images: string[],
  systemPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string; model?: string; triedModels?: string[] }> {
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

  const triedModels: string[] = [];
  let lastError = "";

  for (const model of GROQ_VISION_MODELS) {
    triedModels.push(model);
    try {
      const { ok, status, body } = await groqChatCompletion(model, messages, apiKey, 60000);

      if (!ok) {
        const errText = JSON.stringify(body);
        if (status === 404 || status === 400) {
          lastError = `Vision model '${model}' tidak tersedia (HTTP ${status})`;
          continue;
        }
        return { success: false, error: `Groq Vision HTTP ${status}: ${errText}`, triedModels };
      }

      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `Vision model '${model}' mengembalikan respons kosong.`;
        continue;
      }

      const parsed = JSON.parse(content);
      return { success: true, data: parsed, model, triedModels };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    success: false,
    error: `Semua Groq vision model gagal. Error: ${lastError}`,
    triedModels,
  };
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
        if (status === 404 || status === 400) {
          lastError = `Model '${model}' tidak tersedia (HTTP ${status})`;
          continue;
        }
        return { success: false, error: `Groq API HTTP ${status}: ${JSON.stringify(body)}` };
      }

      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `Model '${model}' mengembalikan respons kosong.`;
        continue;
      }

      const parsed = JSON.parse(content);
      return { success: true, data: parsed, model };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { success: false, error: `Semua Groq model gagal. Error: ${lastError}` };
}
