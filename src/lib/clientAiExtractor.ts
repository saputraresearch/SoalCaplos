/**
 * Client-Side Direct AI Extractor
 * Executes LLM requests directly from the user's browser / IP address.
 * Eliminates Vercel data center IP blocks, network timeouts, and AWS rate-limiting.
 */

export const SYSTEM_PARSE_PROMPT = `Act as an expert math teacher, document transcriber, exam parser, and master problem solver.
Extract EVERY SINGLE QUESTION and option from the uploaded document exactly as written, and SOLVE every question to provide the accurate answer key and explanation.

================================================================================
ATURAN 1: WAJIB MENENTUKAN KUNCI JAWABAN & PEMBAHASAN AKURAT (AI PROBLEM SOLVER)
================================================================================
Dokumen ini adalah naskah ujian siswa yang TIDAK memuat kunci jawaban tercetak.
OLEH KARENA ITU, KAMU SEBAGAI AI WAJIB MENYELESAIKAN/MENGERJAKAN SETIAP BUTIR SOAL DENGAN TELITI!
1. Untuk Pilihan Ganda (MULTIPLE_CHOICE):
   - Hitung dan selesaikan pertanyaan secara matematis dan logis.
   - Cocokkan jawaban hasil perhitunganmu dengan opsi A, B, C, D yang ada.
   - Tentukan "correct_answer_index" secara akurat:
     * 0 jika kunci jawabannya A
     * 1 jika kunci jawabannya B
     * 2 jika kunci jawabannya C
     * 3 jika kunci jawabannya D
   - DILARANG SELALU MENGISI 0! Kunci jawaban harus bervariasi (bisa A, B, C, atau D) sesuai hasil perhitungan matematika yang benar!
   - Wajib isi "explanation" dengan langkah perhitungan singkat (1-2 kalimat).

2. Untuk Isian Singkat (FILL_IN_THE_BLANKS):
   - Selesaikan pertanyaan dan isi "blanks_keywords" dengan jawaban akhir yang benar (misal: ["6x - 7", "6x-7"]).
   - Tuliskan langkah perhitungan di "explanation".

3. Untuk Pilihan Ganda Kompleks (MULTIPLE_SELECT):
   - Tentukan seluruh opsi yang benar dan masukkan indeksnya ke "correct_answers" (misal: [0, 2]).

================================================================================
ATURAN 2: KELENGKAPAN BUTIR SOAL & LARANGAN MENYELIPKAN TEKS PETUNJUK
================================================================================
1. WAJIB EKSTRAK SEMUA BUTIR SOAL DARI AWAL HINGGA AKHIR DOKUMEN TANPA TERLEWAT SATUPUN!
2. JIKA DOKUMEN BERISI 20 BUTIR SOAL (Soal No. 1 s/d 20), ARRAY "questions" WAJIB MEMILIKI TEPAT 20 OBJEK SOAL!
3. DILARANG KERAS MEMASUKKAN TEKS PETUNJUK/HEADER DOKUMEN (misal: "Pilihlah salah satu jawaban", "Petunjuk Umum", dsb.) sebagai butir soal! Hanya ekstrak soal yang memiliki nomor dan pertanyaan riil.
4. Jangan pernah berhenti sebelum semua nomor soal di dokumen selesai diekstrak!

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
      "explanation": "Langkah penyelesaian ringkas dan kunci jawaban"
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

function extractQuestionNumber(text: string): number | null {
  const m = text.match(/^(?:(?:No\.?|Soal)\s*)?\(?(\d{1,2})\)?[\.\:\)\s]/i);
  return m ? parseInt(m[1], 10) : null;
}

function isInstructionHeader(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    lower.startsWith("petunjuk") ||
    lower.startsWith("pilihlah salah satu") ||
    lower.startsWith("pilihlah jawaban") ||
    lower.startsWith("berilah tanda silang") ||
    lower.startsWith("jawablah pertanyaan") ||
    lower.startsWith("isilah titik-titik") ||
    lower.startsWith("kerjakan soal-soal") ||
    lower.startsWith("bab ") ||
    lower.startsWith("ulangan ") ||
    lower.startsWith("penilaian ") ||
    lower.includes("alokasi waktu") ||
    lower.includes("tahun ajaran") ||
    lower.includes("mata pelajaran :")
  );
}

function deduplicateQuestions(questions: any[], expectedTotal = 0): any[] {
  const seenTexts = new Set<string>();
  const seenNumbers = new Set<number>();
  const unique: any[] = [];

  for (const q of questions) {
    const rawText = (q.question_text || "").trim();
    if (!rawText || isInstructionHeader(rawText)) {
      continue;
    }

    const num = extractQuestionNumber(rawText);
    const normalized = rawText
      .replace(/^(?:(?:No\.?|Soal)\s*)?\(?\d{1,2}\)?[\.\:\)\s]+/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

    // Check duplicate by question number (e.g. question #11 extracted twice)
    if (num !== null && seenNumbers.has(num)) {
      console.log(`[Deduplicate] Skipping duplicate question number #${num}`);
      continue;
    }

    // Check duplicate by normalized text content
    if (normalized.length >= 8 && seenTexts.has(normalized)) {
      console.log(`[Deduplicate] Skipping duplicate text: ${rawText.slice(0, 30)}`);
      continue;
    }

    if (num !== null) seenNumbers.add(num);
    if (normalized.length >= 8) seenTexts.add(normalized);

    unique.push(q);
  }

  // If there is still 1 extra item beyond expectedTotal (e.g. 21 vs 20)
  if (expectedTotal > 0 && unique.length === expectedTotal + 1) {
    const last = unique[unique.length - 1];
    if (!last.options || last.options.length < 2 || (last.question_text && last.question_text.length < 15)) {
      unique.pop();
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
export function detectDocumentQuestionCount(text: string): { count: number; maxNumber: number } {
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
  expectedTotal?: number;
  fullText?: string;
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
      const continuationPrompt = `DOKUMEN SUMBER UJIAN:\n\n${fullText}\n\n⚠️ INSTRUKSI LANJUTAN TAHAP ${pass} (SANGAT PENTING):\nPada tahap sebelumnya, baru diekstrak ${currentCount} butir soal (soal nomor 1 s/d nomor ${currentCount}).\nDokumen masih memiliki soal lanjutan mulai dari nomor ${nextStartNum} sampai nomor ${expectedTotal}.\nSekarang, EKSTRAK SELURUH SISA SOAL mulai dari nomor ${nextStartNum} hingga nomor ${expectedTotal} tanpa terlewat satupun!\nWajib kerjakan/tentukan kunci jawabannya secara akurat dan kembalikan format JSON murni.`;

      const passRes = await callModelFn(continuationPrompt);
      if (passRes.success && Array.isArray(passRes.data?.questions) && passRes.data.questions.length > 0) {
        const extra = normalizeRawQuestions(passRes.data.questions);
        allQuestions = [...allQuestions, ...extra];
        console.log(`[ClientDirect] After pass ${pass}: total ${allQuestions.length} questions collected.`);
      } else {
        break; // No more questions returned by model
      }
    }

    return deduplicateQuestions(allQuestions, expectedTotal);
  };

  /**
   * Auto-Solver Safeguard:
   * If all multiple-choice questions still have default answer key 0 (A),
   * run an AI mathematical solving pass to determine the accurate answer key for each question!
   */
  const ensureAnswerKeysProvided = async (
    questionsList: any[],
    callSolverFn: (prompt: string) => Promise<{ success: boolean; data?: any; error?: string }>
  ): Promise<any[]> => {
    const mcqs = questionsList.filter((q) => !q.question_type || q.question_type === "MULTIPLE_CHOICE");
    if (mcqs.length === 0) return questionsList;

    const allZero = mcqs.length >= 3 && mcqs.every((q) => q.correct_answer_index === 0);
    if (!allZero) {
      return questionsList;
    }

    console.log(`[ClientDirect] All ${mcqs.length} questions had default answer key A (0). Auto-solving with AI...`);
    onStep?.({
      id: "ai_solver",
      label: "AI Solver Kunci Jawaban",
      status: "success",
      detail: `Menghitung dan menentukan kunci jawaban akurat untuk ${mcqs.length} butir soal...`,
    });

    const solvePrompt = `Kamu adalah guru matematika ahli. Selesaikan dan tentukan opsi mana (A, B, C, atau D) yang benar untuk setiap butir soal berikut:
${mcqs
  .map(
    (q, i) =>
      `[Soal ${i + 1}] ${q.question_text}\n${q.options.map((o: string, oi: number) => `  ${String.fromCharCode(65 + oi)}. ${o}`).join("\n")}`
  )
  .join("\n\n")}

Kembalikan JSON dengan format:
{
  "solutions": [
    {
      "question_number": 1,
      "correct_letter": "A" | "B" | "C" | "D",
      "correct_index": 0 | 1 | 2 | 3,
      "explanation": "Langkah pengerjaan matematika singkat (1-2 kalimat)"
    }
  ]
}`;

    try {
      const res = await callSolverFn(solvePrompt);
      if (res.success && Array.isArray(res.data?.solutions)) {
        const solMap = new Map<number, { correct_index: number; explanation: string }>();
        for (const sol of res.data.solutions) {
          const num = typeof sol.question_number === "number" ? sol.question_number - 1 : -1;
          if (num >= 0 && typeof sol.correct_index === "number") {
            solMap.set(num, sol);
          }
        }

        let mcqCount = 0;
        return questionsList.map((q) => {
          if (!q.question_type || q.question_type === "MULTIPLE_CHOICE") {
            const found = solMap.get(mcqCount);
            mcqCount++;
            if (found) {
              return {
                ...q,
                correct_answer_index: Math.min(Math.max(found.correct_index, 0), q.options.length - 1),
                explanation: found.explanation || q.explanation,
              };
            }
          }
          return q;
        });
      }
    } catch (err) {
      console.warn("[ClientDirect] Auto-solver error:", err);
    }

    return questionsList;
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
        rawQuestions = await ensureAnswerKeysProvided(rawQuestions, (p) =>
          callGroqDirectFromBrowser(p, validGroqKey, gModel)
        );

        onStep?.({
          id: "groq_direct",
          label: "Groq AI (Koneksi Browser)",
          status: "success",
          detail: `Berhasil mengekstrak ${rawQuestions.length} butir soal lengkap dengan kunci jawaban (Model: ${res.model})`,
        });
        return {
          success: true,
          questions: rawQuestions,
          title: res.data.title || "Kuis Caplos",
          provider: "groq",
          model: res.model,
          expectedTotal: expectedTotal > 0 ? expectedTotal : rawQuestions.length,
          fullText,
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
          rawQuestions = await ensureAnswerKeysProvided(rawQuestions, (p) =>
            callGeminiDirectFromBrowser(p, key, model)
          );

          onStep?.({
            id: `gemini_direct_key${kIdx + 1}`,
            label: `Gemini AI (Koneksi Browser - Key #${kIdx + 1})`,
            status: "success",
            detail: `Berhasil mengekstrak ${rawQuestions.length} butir soal lengkap dengan kunci jawaban (Model: ${model})`,
          });

          return {
            success: true,
            questions: rawQuestions,
            title: res.data.title || "Kuis Caplos",
            provider: "gemini",
            model,
            expectedTotal: expectedTotal > 0 ? expectedTotal : rawQuestions.length,
            fullText,
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
        rawQuestions = await ensureAnswerKeysProvided(rawQuestions, (p) =>
          callGroqDirectFromBrowser(p, validGroqKey, gModel)
        );

        onStep?.({
          id: "groq_direct",
          label: "Groq AI (Koneksi Browser)",
          status: "success",
          detail: `Berhasil mengekstrak ${rawQuestions.length} butir soal lengkap dengan kunci jawaban (Model: ${res.model})`,
        });
        return {
          success: true,
          questions: rawQuestions,
          title: res.data.title || "Kuis Caplos",
          provider: "groq",
          model: res.model,
          expectedTotal: expectedTotal > 0 ? expectedTotal : rawQuestions.length,
          fullText,
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

/**
 * Extract remaining questions between fromIndex and toIndex.
 * Supports both client-direct connection and serverless fallback.
 */
export async function extractRemainingQuestions(options: {
  fullText: string;
  fromIndex: number;
  toIndex: number;
  geminiKeys: string[];
  groqKey?: string | null;
  preferredProvider?: string | null;
  preferredModel?: string | null;
}): Promise<{
  success: boolean;
  questions: any[];
  error?: string;
  provider?: string;
  model?: string;
}> {
  const { fullText, fromIndex, toIndex, geminiKeys, groqKey, preferredProvider, preferredModel } = options;
  const validGroqKey = groqKey?.trim() || null;
  const validGeminiKeys = geminiKeys.filter((k) => k && k.trim().length > 10);

  const prompt = `DOKUMEN NASKAH SOAL:\n\n${fullText}\n\n⚠️ INSTRUKSI KHUSUS PENGAMBILAN SISA SOAL:\nSoal nomor 1 sampai ${fromIndex - 1} SUDAH diekstrak sebelumnya.\nSekarang, KAMU WAJIB HANYA MENGEKSTRAK SOAL NOMOR ${fromIndex} SAMPAI NOMOR ${toIndex} tanpa terlewat satupun!\n\nAturan Penting:\n1. Ekstrak teks pertanyaan dan nomor soal aslinya.\n2. Ekstrak pilihan opsi A, B, C, D atau biarkan [] jika isian.\n3. KERJAKAN DAN SELESAIKAN SOAL SECARA AKURAT untuk menentukan kunci jawaban (correct_answer_index) dan langkah penyelesaian ringkas (explanation). DILARANG SELALU MENGISI 0!\n4. Kembalikan JSON dengan format murni:\n{\n  "questions": [\n    {\n      "question_text": "...",\n      "question_type": "MULTIPLE_CHOICE" | "FILL_IN_THE_BLANKS",\n      "options": ["A", "B", "C", "D"],\n      "correct_answer_index": 0,\n      "explanation": "..."\n    }\n  ]\n}`;

  // 1. Try browser Groq if available
  if (preferredProvider === "groq" && validGroqKey) {
    try {
      const res = await callGroqDirectFromBrowser(prompt, validGroqKey, "llama-3.3-70b-versatile");
      if (res.success && Array.isArray(res.data?.questions) && res.data.questions.length > 0) {
        const normalized = normalizeRawQuestions(res.data.questions);
        return { success: true, questions: normalized, provider: "groq", model: res.model };
      }
    } catch (e) {
      console.warn("[ClientDirect] Groq remaining error:", e);
    }
  }

  // 2. Try browser Gemini if available
  if (validGeminiKeys.length > 0) {
    for (const key of validGeminiKeys) {
      try {
        const res = await callGeminiDirectFromBrowser(prompt, key, preferredModel || "gemini-1.5-flash");
        if (res.success && Array.isArray(res.data?.questions) && res.data.questions.length > 0) {
          const normalized = normalizeRawQuestions(res.data.questions);
          return { success: true, questions: normalized, provider: "gemini", model: res.model };
        }
      } catch (e) {
        console.warn("[ClientDirect] Gemini remaining error:", e);
      }
    }
  }

  // 3. Fallback to serverless API /api/continue-extraction
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (validGroqKey) headers["x-groq-api-key"] = validGroqKey;
    if (validGeminiKeys[0]) headers["x-gemini-api-key"] = validGeminiKeys[0];
    if (preferredProvider) headers["x-ai-provider"] = preferredProvider;

    const res = await fetch("/api/continue-extraction", {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullText,
        fromIndex,
        toIndex,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
      const normalized = normalizeRawQuestions(data.questions);
      return { success: true, questions: normalized, provider: data.provider || "server", model: data.model };
    }
    return { success: false, questions: [], error: data.error || "Gagal mengekstrak sisa soal." };
  } catch (err) {
    return { success: false, questions: [], error: err instanceof Error ? err.message : String(err) };
  }
}

