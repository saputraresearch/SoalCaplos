/**
 * Client-Side Direct AI Extractor
 * Executes LLM requests directly from the user's browser / IP address.
 * Eliminates Vercel data center IP blocks, network timeouts, and AWS rate-limiting.
 */

export const SYSTEM_PARSE_PROMPT = `Act strictly as an expert document transcriber, question type detector, and diagram analyzer. Extract the existing questions, options, and diagram/image information from the uploaded PDF document text exactly as written. Return structured JSON matching the quiz schema. Do not generate or invent new questions.

PANDUAN UTAMA DETEKSI TIPE SOAL (JANGAN MEMAKSAKAN SEMUA JADI PILIHAN GANDA!):
1. JIKA SOAL ADALAH ISIAN SINGKAT / ISIAN RUMPANG:
   - Cirinya: Soal berupa kalimat rumpang dengan titik-titik (.... atau ____), atau pertanyaan isian singkat tanpa pilihan ganda A, B, C, D di dokumen aslinya.
   - JANGAN PERNAH membuat atau mengarang opsi pilihan ganda palsu jika di dokumen aslinya adalah soal isian!
   - Set "question_type": "FILL_IN_THE_BLANKS"
   - Masukkan tanda "[___]" pada bagian yang harus diisi siswa dalam "question_text".
   - Set "blanks_keywords": ["kunci_jawaban_1", "kunci_jawaban_alternatif"].
   - Set "options": [] (KOSONGKAN array options).
   - Set "correct_answer_index": 0.

2. JIKA SOAL ADALAH PILIHAN GANDA BIASA (MCQ):
   - Cirinya: Memiliki pilihan jawaban A, B, C, D tertulis di dokumen dengan 1 jawaban benar.
   - Set "question_type": "MULTIPLE_CHOICE"
   - Set "options": [ ... ] berisi pilihan opsi asli dari dokumen.
   - Set "correct_answer_index": indeks 0-based opsi yang benar.

3. JIKA SOAL ADALAH PILIHAN GANDA KOMPLEKS:
   - Cirinya: Memiliki pilihan opsi A, B, C, D dengan instruksi memilih lebih dari satu jawaban benar.
   - Set "question_type": "MULTIPLE_SELECT"
   - Set "options": [ ... ]
   - Set "correct_answers": [indeks_opsi_benar_1, indeks_opsi_benar_2]

4. JIKA SOAL ADALAH URAIAN / ESAI:
   - Set "question_type": "OPEN_ENDED"
   - Set "rubric": ["poin_penilaian_1", "poin_penilaian_2"]
   - Set "options": []

5. JIKA SOAL ADALAH BENAR / SALAH:
   - Set "question_type": "TRUE_OR_FALSE"
   - Set "options": ["Benar", "Salah"]

Return JSON in this EXACT structure:
{
  "title": "Judul atau topik ujian dari dokumen",
  "questions": [
    {
      "question_text": "Teks lengkap pertanyaan (gunakan [___] jika soal isian)",
      "question_type": "FILL_IN_THE_BLANKS" | "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "OPEN_ENDED" | "TRUE_OR_FALSE",
      "options": ["A. Opsi 1", "B. Opsi 2", "C. Opsi 3", "D. Opsi 4"],
      "correct_answer_index": 0,
      "correct_answers": [0],
      "blanks_keywords": ["kunci_isian"],
      "explanation": "Pembahasan atau kunci jawaban jika tertulis di dokumen"
    }
  ]
}`;

function cleanAndParseJson(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

/**
 * Direct call to Google Gemini from the browser.
 * Uses the user's residential/local IP, completely bypassing Vercel AWS IP limits.
 */
export async function callGeminiDirectFromBrowser(
  prompt: string,
  apiKey: string,
  modelName = "gemini-1.5-flash"
): Promise<{ success: boolean; data?: any; error?: string; model?: string }> {
  const cleanKey = apiKey.trim();
  const cleanModel = modelName.trim().replace(/^models\//, "").replace(/-latest$/, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${cleanKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PARSE_PROMPT}\n\nDOKUMEN SUMBER:\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = body?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      return { success: false, error: errMsg, model: cleanModel };
    }

    const rawText = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { success: false, error: "Respons kosong dari Gemini", model: cleanModel };
    }

    const parsed = cleanAndParseJson(rawText);
    return { success: true, data: parsed, model: cleanModel };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg, model: cleanModel };
  }
}

/**
 * Direct call to Groq Cloud AI from the browser.
 */
export async function callGroqDirectFromBrowser(
  prompt: string,
  apiKey: string,
  model = "llama-3.3-70b-versatile"
): Promise<{ success: boolean; data?: any; error?: string; model?: string }> {
  const cleanKey = apiKey.trim();
  const url = "https://api.groq.com/openai/v1/chat/completions";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PARSE_PROMPT },
          { role: "user", content: `DOKUMEN SUMBER:\n\n${prompt}\n\nWajib format JSON murni.` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = body?.error?.message || `HTTP ${response.status}`;
      return { success: false, error: errMsg, model };
    }

    const rawText = body?.choices?.[0]?.message?.content;
    if (!rawText) {
      return { success: false, error: "Respons kosong dari Groq", model };
    }

    const parsed = cleanAndParseJson(rawText);
    return { success: true, data: parsed, model };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg, model };
  }
}

/**
 * Orchestrator: Try Gemini first via browser direct connection.
 * Supports multi-key rotation and multi-model fallback.
 */
export async function parseQuizWithClientDirect(options: {
  fullText: string;
  geminiKeys: string[];
  groqKey?: string | null;
  preferredProvider?: string | null;
  preferredModel?: string | null;
  onStep?: (step: {
    id: string;
    label: string;
    status: "success" | "failed" | "skipped";
    detail: string;
  }) => void;
}): Promise<{
  success: boolean;
  questions?: any[];
  title?: string;
  error?: string;
  provider?: string;
  model?: string;
}> {
  const { fullText, geminiKeys, groqKey, preferredProvider, onStep } = options;

  const validGeminiKeys = geminiKeys.filter((k) => k && k.trim().length > 10);
  const validGroqKey = groqKey?.trim() || null;

  const geminiModels = ["gemini-1.5-flash", "gemini-2.0-flash"];
  const groqModels = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
  ];

  // 1. If user explicitly prioritizes Groq
  if (preferredProvider === "groq" && validGroqKey) {
    for (const gModel of groqModels) {
      const res = await callGroqDirectFromBrowser(fullText, validGroqKey, gModel);
      if (res.success && res.data) {
        onStep?.({
          id: "groq_direct",
          label: "Groq AI (Koneksi Browser)",
          status: "success",
          detail: `Berhasil dengan model: ${res.model}`,
        });
        return {
          success: true,
          questions: res.data.questions || [],
          title: res.data.title || "Kuis Caplos",
          provider: "groq",
          model: res.model,
        };
      }
    }
    onStep?.({
      id: "groq_direct",
      label: "Groq AI (Koneksi Browser)",
      status: "failed",
      detail: "Semua model Groq gagal, beralih ke Gemini...",
    });
  }

  // 2. Try Gemini via Browser Direct Call (Uses user's home/work IP address)
  if (validGeminiKeys.length > 0) {
    for (let kIdx = 0; kIdx < validGeminiKeys.length; kIdx++) {
      const key = validGeminiKeys[kIdx];
      for (const model of geminiModels) {
        const res = await callGeminiDirectFromBrowser(fullText, key, model);

        if (res.success && res.data) {
          const rawQuestions = res.data.questions || [];
          onStep?.({
            id: `gemini_direct_key${kIdx + 1}`,
            label: `Gemini AI (Koneksi Browser - Key #${kIdx + 1})`,
            status: "success",
            detail: `Berhasil dengan model: ${model}`,
          });
          return {
            success: true,
            questions: rawQuestions,
            title: res.data.title || "Kuis Caplos",
            provider: "gemini",
            model,
          };
        } else {
          console.warn(`[ClientGemini] Key #${kIdx + 1} (${model}) error:`, res.error);
        }
      }
    }

    onStep?.({
      id: "gemini_direct",
      label: "Gemini AI (Koneksi Browser)",
      status: "failed",
      detail: "Semua Gemini API Key diuji via browser gagal.",
    });
  }

  // 3. Fallback to Groq if not tried yet
  if (validGroqKey && preferredProvider !== "groq") {
    for (const gModel of groqModels) {
      const res = await callGroqDirectFromBrowser(fullText, validGroqKey, gModel);
      if (res.success && res.data) {
        onStep?.({
          id: "groq_direct",
          label: "Groq AI (Koneksi Browser)",
          status: "success",
          detail: `Berhasil dengan model: ${res.model}`,
        });
        return {
          success: true,
          questions: res.data.questions || [],
          title: res.data.title || "Kuis Caplos",
          provider: "groq",
          model: res.model,
        };
      }
    }
  }

  return {
    success: false,
    error:
      "Gagal mengekstrak soal dengan Gemini & Groq via koneksi browser. Silakan periksa kembali API Key Anda di menu Pengaturan.",
  };
}
