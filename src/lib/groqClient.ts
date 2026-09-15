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
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama-3.1-70b-versatile",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "gemma2-9b-it",
  "mixtral-8x7b-32768",
];

const GROQ_VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
];

/**
 * Fetch available models dynamically for the given API key.
 * This guarantees we only request models that the user's specific account has access to.
 */
async function getAvailableGroqModels(
  apiKey: string
): Promise<{ ok: boolean; status: number; models: string[]; error?: string }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body?.error?.message || `HTTP ${res.status}`;
      return { ok: false, status: res.status, models: [], error: msg };
    }
    const data = Array.isArray(body?.data) ? body.data : [];
    const allIds: string[] = data.map((m: any) => m.id as string).filter(Boolean);

    // Prioritize high-quality chat models
    const preferredOrder = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama-3.1-70b-versatile",
      "llama3-70b-8192",
      "llama3-8b-8192",
      "gemma2-9b-it",
      "mixtral-8x7b-32768",
    ];

    const sorted = [
      ...preferredOrder.filter((id) => allIds.includes(id)),
      ...allIds.filter(
        (id) =>
          !preferredOrder.includes(id) &&
          !id.includes("whisper") &&
          !id.includes("guard") &&
          !id.includes("embed")
      ),
    ];

    return { ok: true, status: 200, models: sorted };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, models: [], error: msg };
  }
}

async function groqChatCompletion(
  model: string,
  messages: any[],
  apiKey: string,
  timeout = 45000,
  useJsonFormat = true
): Promise<{ ok: boolean; status: number; body: any }> {
  const payload: any = {
    model,
    messages,
    temperature: 0.1,
    max_tokens: 8000,
  };
  if (useJsonFormat) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeout),
  });
  const body = await response.json().catch(() => ({}));

  // If 400 and json_object was requested, retry once without json_object
  if (!response.ok && response.status === 400 && useJsonFormat) {
    return groqChatCompletion(model, messages, apiKey, timeout, false);
  }

  return { ok: response.ok, status: response.status, body };
}

function parseJsonSafely(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    let clean = content.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```/, "").replace(/```$/, "").trim();
    }
    return JSON.parse(clean);
  }
}

function detectExpectedQuestions(text: string): number {
  const matches = Array.from(text.matchAll(/(?:^|\n|\r)\s*(?:(?:No\.?|Soal)\s*)?\(?(\d{1,2})\)?[\.\:\)\s]/gi));
  const numbers = Array.from(
    new Set(matches.map((m) => parseInt(m[1], 10)).filter((n) => n >= 1 && n <= 100))
  ).sort((a, b) => a - b);
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}

export async function parseQuizWithGroqText(
  fullText: string,
  systemPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string; model?: string; triedModels?: string[] }> {
  const expectedTotal = detectExpectedQuestions(fullText);
  let countNote = "";
  if (expectedTotal >= 5) {
    countNote = `\n\n⚠️ PERHATIAN: Dokumen ini terdeteksi memiliki nomor soal hingga nomor ${expectedTotal}. Kamu WAJIB mengekstrak SEMUA ${expectedTotal} butir soal tanpa terlewat satupun! Selesaikan dan tentukan kunci jawaban A, B, C, atau D secara akurat.`;
  }

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `DOKUMEN SOAL (Teks digital resmi hasil ekstraksi dokumen PDF):\n\n${fullText}${countNote}\n\nInstruksi: Ekstrak seluruh butir soal, pilihan jawaban (A, B, C, D), nomor soal, dan kunci jawaban/pembahasan ke dalam struktur JSON yang diminta. Wajib kembalikan format JSON murni.`,
    },
  ];

  // 1. Check available models dynamically from the user's Groq key
  const modelsCheck = await getAvailableGroqModels(apiKey);
  if (!modelsCheck.ok && modelsCheck.status === 401) {
    return {
      success: false,
      error: `API Key Groq tidak valid atau ditolak oleh server Groq (HTTP 401: ${modelsCheck.error}). Periksa kembali API Key Groq Anda di Pengaturan.`,
      triedModels: [],
    };
  }

  const candidateModels = modelsCheck.models.length > 0 ? modelsCheck.models : GROQ_TEXT_MODELS;
  const triedModels: string[] = [];
  let lastError = "";

  for (const model of candidateModels) {
    triedModels.push(model);
    try {
      const { ok, status, body } = await groqChatCompletion(model, messages, apiKey);

      if (!ok) {
        const errDetail = body?.error?.message || JSON.stringify(body);
        // 404/400 = model not found or no access → try next model
        if (status === 404 || status === 400) {
          lastError = `Model '${model}' (HTTP ${status}): ${errDetail}`;
          console.warn(`[groqClient] ${lastError}`);
          continue;
        }
        // 429 = rate limit → stop trying
        return {
          success: false,
          error: `Groq rate limited (HTTP 429: ${errDetail}). Coba lagi dalam beberapa saat.`,
          triedModels,
        };
      }

      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        lastError = `Model '${model}' mengembalikan respons kosong.`;
        continue;
      }

      let parsed = parseJsonSafely(content);
      let questionsList = Array.isArray(parsed?.questions) ? parsed.questions : [];

      // Multi-pass continuation if Groq stopped early (e.g. only 6 out of 20 questions)
      if (expectedTotal >= 8 && questionsList.length < expectedTotal) {
        console.log(`[groqClient] Pass 1 returned ${questionsList.length}/${expectedTotal} questions. Continuing extraction for remaining questions...`);
        const nextStart = questionsList.length + 1;
        const pass2Messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `DOKUMEN SOAL:\n\n${fullText}\n\n⚠️ INSTRUKSI LANJUTAN:\nPada tahap sebelumnya baru diekstrak ${questionsList.length} soal (nomor 1 s/d ${questionsList.length}).\nDokumen masih memiliki soal nomor ${nextStart} sampai ${expectedTotal}.\nSekarang, EKSTRAK SELURUH SISA SOAL dari nomor ${nextStart} hingga nomor ${expectedTotal} tanpa terlewat satupun! Kembalikan JSON dengan array "questions".`,
          },
        ];

        const pass2Res = await groqChatCompletion(model, pass2Messages, apiKey);
        if (pass2Res.ok) {
          const pass2Content = pass2Res.body?.choices?.[0]?.message?.content;
          if (pass2Content) {
            const pass2Parsed = parseJsonSafely(pass2Content);
            if (Array.isArray(pass2Parsed?.questions) && pass2Parsed.questions.length > 0) {
              questionsList = [...questionsList, ...pass2Parsed.questions];
              console.log(`[groqClient] Merged questions: now ${questionsList.length} total questions.`);
            }
          }
        }
      }

      parsed = {
        ...parsed,
        questions: questionsList,
      };

      return { success: true, data: parsed, model, triedModels };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[groqClient] Model ${model} error:`, lastError);
    }
  }

  return {
    success: false,
    error: `Semua model Groq (${triedModels.length} model) gagal. Penyebab: ${lastError}`,
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

      const parsed = parseJsonSafely(content);
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

      const parsed = parseJsonSafely(content);
      return { success: true, data: parsed, model };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { success: false, error: `Semua Groq model gagal. Error: ${lastError}` };
}

export async function parseRemainingQuestionsWithGroq(
  fullText: string,
  fromIndex: number,
  toIndex: number,
  systemPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string; model?: string }> {
  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
  ];

  const userPrompt = `DOKUMEN SOAL ASLI (Teks Lengkap PDF):\n\n${fullText}\n\n⚠️ TUGAS SANGAT SPESIFIK & PENTING:\nSoal nomor 1 s/d ${fromIndex - 1} SUDAH diekstrak sebelumnya.\nSekarang, EKSTRAK HANYA soal nomor ${fromIndex} sampai nomor ${toIndex}.\n\nAturan:\n1. Ekstrak teks soal dan pilihan A, B, C, D (atau [___] jika isian rumpang) sesuai teks aslinya.\n2. Selesaikan/hitung jawabannya dan tentukan kunci jawaban yang benar (correct_answer_index) serta pembahasan singkat (explanation). DILARANG selalu memilih 0!\n3. Jangan buat soal di luar rentang nomor ${fromIndex} s/d ${toIndex}.\n4. Kembalikan JSON murni format: { "questions": [ { "question_text": "...", "question_type": "MULTIPLE_CHOICE", "options": ["A", "B", "C", "D"], "correct_answer_index": 0, "explanation": "..." } ] }`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let lastError = "";
  for (const model of models) {
    try {
      const res = await groqChatCompletion(model, messages, apiKey);
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const content = res.body?.choices?.[0]?.message?.content;
      if (!content) continue;
      const parsed = parseJsonSafely(content);
      if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
        return { success: true, data: parsed, model };
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { success: false, error: `Gagal mengekstrak sisa soal dengan Groq: ${lastError}` };
}

