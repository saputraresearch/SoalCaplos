/**
 * Client-Side Direct AI Extractor
 * Executes LLM requests directly from the user's browser / IP address.
 * Eliminates Vercel data center IP blocks, network timeouts, and AWS rate-limiting.
 */

export const SYSTEM_PARSE_PROMPT = `Act strictly as an expert document transcriber, exam parser, and question type detector.
Extract EVERY SINGLE QUESTION and option from the uploaded document exactly as written.

================================================================================
ATURAN UTAMA & WAJIB: KELENGKAPAN BUTIR SOAL (EXTRACT ALL QUESTIONS WITHOUT EXCEPTION)
================================================================================
1. WAJIB EKSTRAK SEMUA BUTIR SOAL DARI AWAL HINGGA AKHIR DOKUMEN TANPA TERLEWAT SATUPUN!
2. JIKA DOKUMEN BERISI 20 BUTIR SOAL (Soal No. 1 s/d 20), ARRAY "questions" WAJIB MEMILIKI TEPAT 20 OBJEK SOAL!
3. DILARANG KERAS MEMOTONG, MENYINGKAT, ATAU HANYA MENGAMBIL SEBAGIAN KECIL SOAL (1-4 NOMOR) SEBAGAI CONTOH!
4. Telusuri teks dari baris pertama sampai baris terakhir. Setiap kali ada nomor soal (misal "1.", "2.", "3.", dst.), buatkan objek soal tersendiri.
5. Jangan pernah berhenti sebelum semua nomor soal di dokumen selesai diekstrak!

PANDUAN DETEKSI TIPE SOAL:
1. JIKA SOAL ISIAN SINGKAT / ISIAN RUMPANG:
   - Cirinya: Kalimat rumpang dengan titik-titik (.... atau ____), tanpa pilihan A, B, C, D di naskah asli.
   - Set "question_type": "FILL_IN_THE_BLANKS"
   - Masukkan tanda "[___]" pada bagian yang harus diisi siswa.
   - Set "blanks_keywords": ["kunci_jawaban_1"]
   - Set "options": [] (wajib array kosong)
   - Set "correct_answer_index": 0

2. JIKA SOAL PILIHAN GANDA BIASA (MCQ):
   - Cirinya: Memiliki pilihan A, B, C, D dengan 1 jawaban benar.
   - Set "question_type": "MULTIPLE_CHOICE"
   - Set "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"] (Teks opsi bersih tanpa prefiks huruf ganda)
   - Set "correct_answer_index": indeks 0-based opsi yang benar (0 untuk A, 1 untuk B, 2 untuk C, 3 untuk D).

3. JIKA SOAL PILIHAN GANDA KOMPLEKS:
   - Set "question_type": "MULTIPLE_SELECT"
   - Set "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"]
   - Set "correct_answers": [0, 1] (indeks semua jawaban yang benar)

4. JIKA SOAL URAIAN / ESAI:
   - Set "question_type": "OPEN_ENDED"
   - Set "rubric": ["kriteria penilaian"]
   - Set "options": []

5. JIKA SOAL BENAR / SALAH:
   - Set "question_type": "TRUE_OR_FALSE"
   - Set "options": ["Benar", "Salah"]

Return JSON in this EXACT structure:
{
  "title": "Judul atau topik ujian dari dokumen",
  "questions": [
    {
      "question_text": "Teks lengkap pertanyaan (gunakan [___] jika soal isian)",
      "question_type": "MULTIPLE_CHOICE" | "FILL_IN_THE_BLANKS" | "MULTIPLE_SELECT" | "OPEN_ENDED" | "TRUE_OR_FALSE",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
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

function normalizeRawQuestions(rawQuestions: any[]): any[] {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions.map((q: any, idx: number) => {
    const isFill =
      q.question_type === "FILL_IN_THE_BLANKS" ||
      /\[(?:_{2,}|\.{2,}|\s*_{2,}\s*)\]|_{3,}|\.{3,}/.test(q.question_text || "") ||
      (Array.isArray(q.blanks_keywords) && q.blanks_keywords.length > 0 && (!q.options || q.options.length === 0));

    let cleanOptions: string[] = [];
    if (!isFill) {
      if (Array.isArray(q.options)) {
        cleanOptions = q.options.map((opt: any) => {
          if (typeof opt === "string") return opt;
          return opt.text || "";
        });
      }
      if (cleanOptions.length === 0) {
        cleanOptions = ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"];
      }
    }

    return {
      question_text: q.question_text || `Soal #${idx + 1}`,
      question_type: isFill ? "FILL_IN_THE_BLANKS" : (q.question_type || "MULTIPLE_CHOICE"),
      options: cleanOptions,
      correct_answer_index: typeof q.correct_answer_index === "number" ? q.correct_answer_index : 0,
      correct_answers: Array.isArray(q.correct_answers) ? q.correct_answers : [0],
      blanks_keywords: Array.isArray(q.blanks_keywords) ? q.blanks_keywords : [],
      explanation: q.explanation || "",
      image_url: q.image_url || null,
      image_source_type: "NONE",
      alt_text: null,
      order_index: idx,
    };
  });
}

function deduplicateQuestions(questions: any[]): any[] {
  const seenTexts = new Set<string>();
  const unique: any[] = [];

  for (const q of questions) {
    const rawText = (q.question_text || "").trim();
    // Normalize question text for duplicate detection (remove numbering like "1. ")
    const normalized = rawText
      .replace(/^(?:No\.?\s*)?\d{1,2}[\.\)\s]+/i, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    const key = normalized.length >= 5 ? normalized : rawText;
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      unique.push(q);
    }
  }

  return unique.map((q, idx) => ({
    ...q,
    order_index: idx,
  }));
}

/**
 * Detect question numbers in document text to estimate total questions.
 */
function detectDocumentQuestionCount(text: string): { count: number; maxNumber: number } {
  const matches = Array.from(text.matchAll(/(?:^|\n|\r)\s*(?:No\.?\s*)?(\d{1,2})[\.\)\s]/gi));
  const numbers = Array.from(
    new Set(matches.map((m) => parseInt(m[1], 10)).filter((n) => n >= 1 && n <= 100))
  ).sort((a, b) => a - b);
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return { count: numbers.length, maxNumber };
}

/**
 * Direct call to Google Gemini from the browser.
 * Uses maxOutputTokens: 8192 to prevent token truncation for 20+ questions.
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
            parts: [{ text: `${SYSTEM_PARSE_PROMPT}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
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
          { role: "user", content: `${prompt}\n\nWajib kembalikan format JSON murni.` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 8000,
        temperature: 0.1,
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
 * Detects total question count in text and performs continuation pass if needed
 * to ensure 100% full extraction of all questions.
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

  // Detect expected question count from document text
  const docMeta = detectDocumentQuestionCount(fullText);
  console.log(`[ClientDirect] Detected ~${docMeta.count} questions (highest number: ${docMeta.maxNumber})`);

  const expectedTotal = Math.max(docMeta.maxNumber, docMeta.count);
  console.log(`[ClientDirect] Expected total questions: ${expectedTotal} (maxNumber: ${docMeta.maxNumber}, detectedCount: ${docMeta.count})`);

  let countDirective = "";
  if (expectedTotal >= 5) {
    countDirective = `\n\n⚠️ PERHATIAN SANGAT KRUSIAL:\nDokumen ini terdeteksi memuat soal bernomor hingga nomor ${expectedTotal} (total sekitar ${expectedTotal} butir soal).\nKamu WAJIB mengekstrak SEMUA butir soal dari nomor pertama sampai nomor ${expectedTotal} tanpa terlewat satupun!\nDILARANG KERAS berhenti di tengah jalan atau hanya mengekstrak sebagian nomor! Buat penjelasan (explanation) ringkas (1-2 kalimat) agar semua butir soal muat lengkap.`;
  }

  const userPrompt = `DOKUMEN SUMBER UJIAN:\n\n${fullText}${countDirective}`;

  // Helper to run continuation extraction if any questions are missing
  const completeMissingQuestions = async (
    initialQuestions: any[],
    callModelFn: (prompt: string) => Promise<{ success: boolean; data?: any; error?: string }>
  ): Promise<any[]> => {
    let allQuestions = [...initialQuestions];
    let pass = 1;

    while (pass <= 3 && expectedTotal >= 5 && allQuestions.length < expectedTotal) {
      pass++;
      const currentCount = allQuestions.length;
      console.log(`[ClientDirect] Pass ${pass - 1} returned ${currentCount}/${expectedTotal} questions. Running continuation pass ${pass}...`);

      const nextStartNum = currentCount + 1;
      const continuationPrompt = `DOKUMEN SUMBER UJIAN:\n\n${fullText}\n\n⚠️ INSTRUKSI LANJUTAN TAHAP ${pass} (SANGAT PENTING):\nPada tahap sebelumnya, baru diekstrak ${currentCount} butir soal (soal nomor 1 s/d nomor ${currentCount}).\nDokumen masih memiliki soal lanjutan mulai dari nomor ${nextStartNum} sampai nomor ${expectedTotal}.\nSekarang, EKSTRAK SELURUH SISA SOAL mulai dari nomor ${nextStartNum} hingga nomor ${expectedTotal} tanpa terlewat satupun!\nWajib kembalikan format JSON murni.`;

      const passRes = await callModelFn(continuationPrompt);
      if (passRes.success && Array.isArray(passRes.data?.questions) && passRes.data.questions.length > 0) {
        const extra = normalizeRawQuestions(passRes.data.questions);
        allQuestions = [...allQuestions, ...extra];
        console.log(`[ClientDirect] After pass ${pass}: total ${allQuestions.length} questions collected.`);
      } else {
        break; // No more questions returned by model
      }
    }

    return deduplicateQuestions(allQuestions);
  };

  // 1. If user explicitly prioritizes Groq
  if (preferredProvider === "groq" && validGroqKey) {
    for (const gModel of groqModels) {
      const res = await callGroqDirectFromBrowser(userPrompt, validGroqKey, gModel);
      if (res.success && res.data) {
        let rawQuestions = normalizeRawQuestions(res.data.questions || []);
        rawQuestions = await completeMissingQuestions(rawQuestions, (p) =>
          callGroqDirectFromBrowser(p, validGroqKey, gModel)
        );

        onStep?.({
          id: "groq_direct",
          label: "Groq AI (Koneksi Browser)",
          status: "success",
          detail: `Berhasil mengekstrak ${rawQuestions.length} butir soal lengkap dengan model: ${res.model}`,
        });
        return {
          success: true,
          questions: rawQuestions,
          title: res.data.title || "Kuis Caplos",
          provider: "groq",
          model: res.model,
        };
      }
    }
  }

  // 2. Try Gemini via Browser Direct Call (Residential IP)
  if (validGeminiKeys.length > 0) {
    for (let kIdx = 0; kIdx < validGeminiKeys.length; kIdx++) {
      const key = validGeminiKeys[kIdx];
      for (const model of geminiModels) {
        const res = await callGeminiDirectFromBrowser(userPrompt, key, model);

        if (res.success && res.data) {
          let rawQuestions = normalizeRawQuestions(res.data.questions || []);
          rawQuestions = await completeMissingQuestions(rawQuestions, (p) =>
            callGeminiDirectFromBrowser(p, key, model)
          );

          onStep?.({
            id: `gemini_direct_key${kIdx + 1}`,
            label: `Gemini AI (Koneksi Browser - Key #${kIdx + 1})`,
            status: "success",
            detail: `Berhasil mengekstrak ${rawQuestions.length} butir soal lengkap dengan model: ${model}`,
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
      const res = await callGroqDirectFromBrowser(userPrompt, validGroqKey, gModel);
      if (res.success && res.data) {
        let rawQuestions = normalizeRawQuestions(res.data.questions || []);
        rawQuestions = await completeMissingQuestions(rawQuestions, (p) =>
          callGroqDirectFromBrowser(p, validGroqKey, gModel)
        );

        onStep?.({
          id: "groq_direct",
          label: "Groq AI (Koneksi Browser)",
          status: "success",
          detail: `Berhasil mengekstrak ${rawQuestions.length} butir soal lengkap dengan model: ${res.model}`,
        });
        return {
          success: true,
          questions: rawQuestions,
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
