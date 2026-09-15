import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedQuestion, QuestionType } from "@/lib/types";
import { logServerError } from "@/lib/serverLogger";
import { getActiveGeminiModels } from "@/lib/geminiModels";
import dns from "dns";

// Ensure Node.js resolves IPv4 addresses first to prevent 20s IPv6 timeouts / fetch failed errors
dns.setDefaultResultOrder("ipv4first");

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      targetAge,
      difficulty,
      types,
      count = 8,
    } = body as {
      topic: string;
      targetAge?: string;
      difficulty?: string;
      types?: QuestionType[];
      count?: number;
    };

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: "Topic/Materi kuis wajib diisi." }, { status: 400 });
    }

    // Check for API key
    const headerKey = req.headers.get("x-gemini-api-key");
    const envKey = process.env.GEMINI_API_KEY;
    const rawApiKey = headerKey || (envKey !== "your-gemini-api-key" ? envKey : null);

    if (!rawApiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Key is missing. Silakan atur Gemini API Key pada menu Settings atau .env.local.",
        },
        { status: 400 }
      );
    }

    const apiKeys = rawApiKey
      .split(/[,\n;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: "Gemini API Key is invalid or empty." }, { status: 400 });
    }

    // Ensure Node.js resolves IPv4 first on every request
    dns.setDefaultResultOrder("ipv4first");

    const requestedModel = req.headers.get("x-gemini-model")?.trim();
    const allModels = await getActiveGeminiModels(apiKeys[0], requestedModel);
    const modelsToTry = allModels.slice(0, 2);
    console.log(`[generate-quiz] Selected models to try:`, modelsToTry, `(Active keys: ${apiKeys.length})`);

    const selectedTypesText = types && types.length > 0
      ? `Buat soal yang berfokus pada tipe berikut: ${types.join(", ")}.`
      : `Buat variasi lengkap mencakup ke-8 tipe soal yang diminta di bawah ini.`;

    const systemPrompt = `Anda adalah Guru Ahli Kurikulum dan Pembuat Kuis Interaktif Berstandar Tinggi.
Tugas Anda adalah membuat paket soal ujian berkualitas tinggi berdasarkan:
- Topik/Mata Pelajaran: "${topic.trim()}"
- Target Usia Siswa: "${targetAge || "12-15 tahun (SMP)"}"
- Tingkat Kesulitan: "${difficulty || "Sedang"}"
- Jumlah Soal: ${count} butir soal.

${selectedTypesText}

IKUTI ATURAN KETAT UNTUK SETIAP TIPE SOAL BERIKUT:
1. MULTIPLE_CHOICE
   - Aturan: Buat 1 pertanyaan, sediakan 4 opsi (A, B, C, D).
   - Validasi: Hanya boleh ada tepat 1 kunci jawaban yang benar. Pengecoh harus logis dan mendidik.
   - Field: question_type="MULTIPLE_CHOICE", options=[4 string], correct_answer_index (0-3).

2. MULTIPLE_SELECT
   - Aturan: Buat 1 pertanyaan kompleks, sediakan 5 opsi (A, B, C, D, E).
   - Validasi: Minimal 2 opsi benar dan maksimal 4 opsi benar. Tentukan semua kunci jawaban yang benar.
   - Field: question_type="MULTIPLE_SELECT", options=[5 string], correct_answers=[array indeks 0-4].

3. TRUE_OR_FALSE
   - Aturan: Buat 1 pernyataan tegas terkait materi.
   - Validasi: Kunci jawaban hanya berupa nilai "Benar" atau "Salah".
   - Field: question_type="TRUE_OR_FALSE", options=["Benar", "Salah"], correct_answer_index (0 untuk Benar, 1 untuk Salah).

4. MATCHING
   - Aturan: Buat pasangan item. Sediakan 3 sampai 4 item di Kolom Kiri (Kunci/Stimulus) dan jumlah yang sama di Kolom Kanan (Nilai/Pasangan).
   - Validasi: Berikan pemetaan pasangan yang benar secara eksplisit.
   - Field: question_type="MATCHING", matching_pairs=[{"left": "Item Kiri 1", "right": "Pasangan Kanan 1"}, ...].

5. REORDER
   - Aturan: Buat sebuah proses, siklus, atau tahapan kronologis acak berisi 4-5 langkah.
   - Validasi: Berikan urutan nomor indeks urutan yang benar dari awal hingga akhir (1, 2, 3, dst).
   - Field: question_type="REORDER", reorder_items=[array string langkah-langkah teracak], correct_order=[array indeks urutan yang benar, misal 0, 1, 2, 3].

6. FILL_IN_THE_BLANKS
   - Aturan: Buat 1-2 kalimat teks rumpang dengan bagian yang hilang ditandai dengan [___].
   - Validasi: Sediakan kata kunci eksak yang menjadi jawaban benar.
   - Field: question_type="FILL_IN_THE_BLANKS", blanks_keywords=[array kata kunci jawaban benar].

7. OPEN_ENDED
   - Aturan: Buat 1 pertanyaan berbasis HOTS (Higher Order Thinking Skills) yang membutuhkan jawaban deskriptif/esai.
   - Validasi: Sediakan poin-poin rubrik penilaian atau kata kunci yang harus ada dalam jawaban ideal siswa.
   - Field: question_type="OPEN_ENDED", rubric=[array poin penilaian kriteria jawaban ideal].

8. MATH_RESPONSE
   - Aturan: Buat 1 soal eksakta/STEM yang membutuhkan jawaban rumus, angka presisi, atau koordinat.
   - Validasi: Tulis jawaban dalam format matematika standar (menggunakan notasi LaTeX atau angka desimal/pecahan rigid) beserta langkah penyelesaiannya.
   - Field: question_type="MATH_RESPONSE", math_solution="Jawaban dan langkah penyelesaian".

9. IMAGE_LABELING
   - Aturan: Sediakan sebuah konteks visual (deskripsi gambar yang harus dicari/dibuat pengguna, misal: "Gambar Struktur Tumbuhan"). Tentukan 3-4 nama label teks (kartu) dan koordinat/posisi titik penanda (pin) yang tepat pada gambar (skala x: 0-100%, y: 0-100%).
   - Validasi: Pasangkan setiap label teks secara rigid dengan nama area target yang benar pada gambar (Contoh: Label "Akar" -> Target "Bagian Bawah Tanah").
   - Field: question_type="IMAGE_LABELING", image_context="Deskripsi detail gambar", label_targets=[{"id": "pin-1", "label": "Akar", "x": 50, "y": 80, "target_name": "Bagian Bawah Tanah"}, ...], options=["Akar", "Batang", "Daun"].

10. IMAGE_HOTSPOT
   - Aturan: Sediakan deskripsi gambar latar belakang dan berikan instruksi kepada siswa untuk menunjuk area spesifik (Contoh: "Ketuk bagian jantung yang memompa darah bersih").
   - Validasi: Tentukan area koordinat target (Hotspot Zone: x, y tengah 0-100%, radius 10-20%) yang bernilai benar.
   - Field: question_type="IMAGE_HOTSPOT", image_context="Deskripsi detail gambar", hotspot_zone={"x": 45, "y": 50, "radius": 15, "description": "Deskripsi zona target"}.

11. CATEGORIZE_ITEMS
   - Aturan: Buat 2 sampai 3 nama kategori/kelompok yang jelas (Contoh: "Makhluk Hidup" dan "Benda Mati"). Sediakan 6 sampai 8 kartu item acak yang harus dimasukkan ke dalam kelompok-kelompok tersebut.
   - Validasi: Pasangkan setiap kartu item secara mutlak ke dalam kategori yang benar tanpa ambiguitas (Contoh: "Kucing" -> "Makhluk Hidup", "Batu" -> "Benda Mati").
   - Field: question_type="CATEGORIZE_ITEMS", categories=["Kategori A", "Kategori B"], categorize_items=[{"text": "Item 1", "category": "Kategori A"}, ...].

WAJIB MENGEMBALIKAN OUTPUT DALAM BENTUK JSON DENGAN STRUKTUR BERIKUT:
{
  "title": "Judul Kuis yang Menarik dan Edukatif",
  "questions": [
    {
      "id": "q_1",
      "question_type": "MULTIPLE_CHOICE",
      "question_text": "Teks soal pertanyaan...",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correct_answer_index": 0,
      "correct_answers": [0],
      "matching_pairs": [{"left": "...", "right": "..."}],
      "reorder_items": ["Langkah B", "Langkah A", "Langkah C"],
      "correct_order": [1, 0, 2],
      "blanks_keywords": ["kata kunci"],
      "rubric": ["Poin 1...", "Poin 2..."],
      "math_solution": "Rumus / langkah penyelesaian...",
      "image_context": "Deskripsi gambar visual jika ada...",
      "label_targets": [{"id": "pin-1", "label": "Label", "x": 50, "y": 50, "target_name": "Target"}],
      "hotspot_zone": {"x": 50, "y": 50, "radius": 15, "description": "Target zone"},
      "categories": ["Kat A", "Kat B"],
      "categorize_items": [{"text": "Item", "category": "Kat A"}],
      "explanation": "Penjelasan/pembahasan mendalam..."
    }
  ]
}

Patuhi target usia dan tingkat kesulitan yang diinput. Gunakan Bahasa Indonesia yang baik, edukatif, dan interaktif. Jangan berikan teks pengantar markdown di luar format JSON.`;

    let responseText: string | null = null;
    let lastError: Error | null = null;

    keyLoop: for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
      const currentApiKey = apiKeys[keyIdx];
      const genAI = new GoogleGenerativeAI(currentApiKey);

      for (const modelName of modelsToTry) {
        try {
          console.log(`Generating quiz with key #${keyIdx + 1} and Gemini model: ${modelName}`);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" },
          });

          const result = await model.generateContent(systemPrompt);
          const response = await result.response;
          responseText = response.text();
          if (responseText) break keyLoop;
        } catch (err: any) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`Key #${keyIdx + 1} model ${modelName} failed:`, lastError.message);

          if (
            (lastError.message.includes("RESOURCE_EXHAUSTED") || lastError.message.includes("429") || lastError.message.includes("quota")) &&
            keyIdx < apiKeys.length - 1
          ) {
            console.warn(`Key #${keyIdx + 1} quota limit hit, switching to backup key #${keyIdx + 2}...`);
            break;
          }
        }
      }
    }

    if (!responseText) {
      const errMsg = lastError?.message || "";
      if (errMsg.includes("fetch failed") || errMsg.includes("ENOTFOUND") || errMsg.includes("ETIMEDOUT")) {
        throw new Error(
          `Gagal menghubungi server Google Gemini API (koneksi jaringan / fetch failed). Pastikan perangkat terhubung ke internet dan API Key Gemini Anda di menu Settings valid.`
        );
      }
      throw lastError || new Error("Gagal membuat soal dari seluruh model Gemini kandidat.");
    }

    const cleanJson = responseText
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsedData = JSON.parse(cleanJson);

    // Normalize and validate output
    const validatedQuestions: ParsedQuestion[] = (parsedData.questions || []).map(
      (q: any, idx: number) => {
        const qType: QuestionType = q.question_type || "MULTIPLE_CHOICE";
        return {
          id: `q_${Date.now()}_${idx + 1}`,
          question_type: qType,
          question_text: q.question_text || `Pertanyaan #${idx + 1}`,
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer_index: typeof q.correct_answer_index === "number" ? q.correct_answer_index : 0,
          correct_answers: Array.isArray(q.correct_answers) ? q.correct_answers : [0],
          matching_pairs: Array.isArray(q.matching_pairs) ? q.matching_pairs : [],
          reorder_items: Array.isArray(q.reorder_items) ? q.reorder_items : [],
          correct_order: Array.isArray(q.correct_order) ? q.correct_order : [],
          blanks_keywords: Array.isArray(q.blanks_keywords) ? q.blanks_keywords : [],
          rubric: Array.isArray(q.rubric) ? q.rubric : [],
          math_solution: q.math_solution || null,
          explanation: q.explanation || null,
        };
      }
    );

    return NextResponse.json({
      title: parsedData.title || topic,
      questions: validatedQuestions,
    });
  } catch (error: unknown) {
    const rawError = error instanceof Error ? error.message : String(error);
    console.error("AI Quiz Generation Error:", rawError);
    logServerError("/api/generate-quiz", rawError, error);

    let userFriendlyError = rawError;
    if (rawError.includes("API_KEY_INVALID") || rawError.includes("API key not valid")) {
      userFriendlyError = "API Key Gemini Anda tidak valid. Silakan periksa kembali dan masukkan API Key yang benar melalui menu Settings (ikon gerigi di kanan atas).";
    } else if (rawError.includes("RESOURCE_EXHAUSTED") || rawError.includes("quota")) {
      userFriendlyError = "Batas kuota gratis (rate limit / quota) Gemini API Anda telah tercapai. Silakan tunggu beberapa menit atau gunakan API Key lainnya.";
    } else if (rawError.includes("fetch failed") || rawError.includes("ENOTFOUND") || rawError.includes("ETIMEDOUT")) {
      userFriendlyError = "Gagal terhubung ke Google Gemini API (koneksi jaringan terputus). Pastikan perangkat Anda terhubung ke internet dan API Key valid.";
    }

    return NextResponse.json({ error: userFriendlyError }, { status: 500 });
  }
}
