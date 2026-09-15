import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedQuestion } from "@/lib/types";
import { enrichQuestionsWithImages } from "@/lib/pdfImageExtractor";
import { getActiveGeminiModels } from "@/lib/geminiModels";
import { logServerError } from "@/lib/serverLogger";
import dns from "dns";

// Ensure Node.js resolves IPv4 first
dns.setDefaultResultOrder("ipv4first");

export const maxDuration = 60; // Up to 60s processing window on serverless

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Check for API key from header, formData, or environment variable
    const headerKey = req.headers.get("x-gemini-api-key");
    const formKey = formData.get("api_key") as string | null;
    const envKey = process.env.GEMINI_API_KEY;

    const apiKey = headerKey || formKey || (envKey !== "your-gemini-api-key" ? envKey : null);

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Key is missing. Please set your Gemini API Key in the Settings menu or in .env.local.",
        },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    // Ensure Node.js resolves IPv4 first on every request
    dns.setDefaultResultOrder("ipv4first");

    const pdfBuffer = Buffer.from(arrayBuffer);
    const base64Data = pdfBuffer.toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey.trim());

    const requestedModel = (req.headers.get("x-gemini-model") || (formData.get("model") as string | null))?.trim();
    const modelsToTry = await getActiveGeminiModels(apiKey, requestedModel);
    console.log(`[parse-pdf] Selected models to try:`, modelsToTry);

    const systemPrompt = `Act strictly as an expert document transcriber, question type detector, and diagram analyzer. Extract the existing questions, options, and diagram/image information from the uploaded PDF document exactly as written. Return structured JSON matching the quiz schema. Do not generate or invent new questions.

PANDUAN UTAMA DETEKSI TIPE SOAL (JANGAN MEMAKSAKAN SEMUA JADI PILIHAN GANDA!):
1. JIKA SOAL ADALAH ISIAN SINGKAT / ISIAN RUMPANG:
   - Cirinya: Soal berupa kalimat rumpang dengan titik-titik (.... atau ____), atau pertanyaan isian singkat tanpa pilihan ganda A, B, C, D di dokumen aslinya (misal: "Proses fotosintesis menghasilkan zat makanan dan gas ....").
   - JANGAN PERNAH membuat atau mengarang opsi pilihan ganda palsu jika di dokumen aslinya adalah soal isian!
   - Set "question_type": "FILL_IN_THE_BLANKS"
   - Masukkan tanda "[___]" pada bagian yang harus diisi siswa dalam "question_text". Jika dokumen menggunakan titik-titik '....' atau garis bawah '____', ubah menjadi '[___]'.
   - Set "blanks_keywords": ["kunci_jawaban_1", "kunci_jawaban_alternatif"] (kata kunci jawaban yang benar).
   - Set "options": [] (KOSONGKAN array options! Wajib [] kosong).
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
   - Cirinya: Pertanyaan uraian bebas (misal: "Jelaskan proses siklus air!").
   - Set "question_type": "OPEN_ENDED"
   - Set "rubric": ["poin_penilaian_1", "poin_penilaian_2"]
   - Set "options": []

5. JIKA SOAL ADALAH BENAR / SALAH:
   - Set "question_type": "TRUE_OR_FALSE"
   - Set "options": ["Benar", "Salah"]

Return JSON in this EXACT structure:
{
  "title": "Judul atau header topik ujian dari dokumen PDF",
  "questions": [
    {
      "question_text": "Teks lengkap pertanyaan (gunakan [___] jika soal isian)",
      "question_type": "FILL_IN_THE_BLANKS" | "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "OPEN_ENDED" | "TRUE_OR_FALSE",
      "page_number": 1,
      "has_diagram": false,
      "diagram_box": null,
      "diagram_description": "",
      "options": [
        {
          "option_letter": "A",
          "text": "Teks opsi (kosongkan [] untuk soal isian)",
          "has_image": false,
          "page_number": 1,
          "image_box": null,
          "image_description": ""
        }
      ],
      "correct_answer_index": 0,
      "correct_answers": [0],
      "blanks_keywords": ["kunci_isian"],
      "rubric": [],
      "explanation": "Pembahasan atau kunci jawaban jika tertulis di dokumen"
    }
  ]
}

PANDUAN DETEKSI GAMBAR (DIAGRAM SOAL & GAMBAR OPSI):
1. Jika soal memiliki gambar/diagram/grafik/peta pada badan soal:
   - Set "has_diagram": true
   - Set "page_number": nomor halaman (1, 2, dst).
   - Berikan "diagram_box": [ymin, xmin, ymax, xmax] (skala 0-1000).
   - Berikan "diagram_description": deskripsi singkat objek dalam gambar.
2. Jika opsi jawaban pilihan ganda berupa gambar atau memuat gambar:
   - Set "has_image": true pada opsi yang bersangkutan.
   - Berikan "image_box": [ymin, xmin, ymax, xmax] (skala 0-1000).
   - Berikan "image_description": deskripsi gambar opsi tersebut.`;

    const promptParts = [
      systemPrompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf",
        },
      },
    ];

    let responseText: string | null = null;
    let lastError: Error | null = null;
    let successfulModel = "";

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting OCR extraction with Gemini model: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" },
        });

        const result = await model.generateContent(promptParts);
        responseText = result.response.text();
        if (responseText) {
          successfulModel = modelName;
          console.log(`OCR extraction succeeded with model: ${modelName}`);
          break;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`Model ${modelName} failed (${errorMsg}), trying next fallback...`);
        lastError = err instanceof Error ? err : new Error(errorMsg);

        // If it's a network/connection failure, pause briefly before retrying
        if (errorMsg.includes("fetch failed") || errorMsg.includes("ENOTFOUND") || errorMsg.includes("ETIMEDOUT")) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    if (!responseText) {
      throw (
        lastError ||
        new Error(
          "Could not generate quiz content with available Gemini models. Please check your API key permissions."
        )
      );
    }

    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleanedJson);
    const detectedTitle = parsed.title || file.name.replace(/\.[^/.]+$/, "");
    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

    // Enrich questions with cropped diagrams and option images
    let enrichedQuestions: ParsedQuestion[] = [];
    try {
      enrichedQuestions = await enrichQuestionsWithImages(rawQuestions, pdfBuffer);
      console.log(
        `Enriched ${enrichedQuestions.length} questions. Questions with images: ${
          enrichedQuestions.filter((q) => !!q.image_url).length
        }, options with images: ${
          enrichedQuestions.reduce(
            (acc, q) => acc + (q.option_items?.filter((oi) => !!oi.image_url).length || 0),
            0
          )
        }`
      );
    } catch (enrichErr) {
      console.warn("Failed to enrich questions with images, falling back to raw questions:", enrichErr);
      enrichedQuestions = rawQuestions.map((q: any, idx: number) => {
        const isFill =
          q.question_type === "FILL_IN_THE_BLANKS" ||
          /\[(?:_{2,}|\.{2,}|\s*_{2,}\s*)\]|_{3,}|\.{3,}/.test(q.question_text || "") ||
          (Array.isArray(q.blanks_keywords) && q.blanks_keywords.length > 0);
        return {
          question_text: q.question_text || `Soal #${idx + 1}`,
          question_type: isFill ? "FILL_IN_THE_BLANKS" : (q.question_type || "MULTIPLE_CHOICE"),
          options: isFill ? [] : (Array.isArray(q.options)
            ? q.options.map((opt: any) => (typeof opt === "string" ? opt : opt.text || ""))
            : ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]),
          blanks_keywords: q.blanks_keywords || [],
          correct_answer_index: typeof q.correct_answer_index === "number" ? q.correct_answer_index : 0,
          explanation: q.explanation || "",
          image_url: q.image_url || null,
        };
      });
    }

    return NextResponse.json({
      title: detectedTitle,
      modelUsed: successfulModel,
      questions: enrichedQuestions,
    });
  } catch (error: unknown) {
    const rawError = error instanceof Error ? error.message : String(error);
    console.error("Error in parse-pdf API route:", rawError);
    logServerError("/api/parse-pdf", rawError, error);

    let userFriendlyError = rawError;
    if (rawError.includes("API_KEY_INVALID") || rawError.includes("API key not valid") || rawError.includes("400")) {
      userFriendlyError = "API Key Gemini Anda tidak valid. Silakan periksa kembali dan masukkan API Key yang benar melalui menu Pengaturan (ikon gerigi di kanan atas).";
    } else if (rawError.includes("RESOURCE_EXHAUSTED") || rawError.includes("429") || rawError.includes("quota")) {
      userFriendlyError = "Batas kuota gratis (rate limit / quota) Gemini API Anda telah tercapai. Silakan tunggu 1-2 menit sebelum mencoba lagi, atau gunakan API Key Gemini lainnya.";
    } else if (rawError.includes("fetch failed") || rawError.includes("ENOTFOUND") || rawError.includes("ETIMEDOUT") || rawError.includes("ECONNRESET")) {
      userFriendlyError = "Gagal terhubung ke Google Gemini API (koneksi jaringan terputus / fetch failed). Pastikan perangkat Anda terhubung ke internet dan API Key di menu Pengaturan sudah aktif.";
    } else if (rawError.includes("SAFETY") || rawError.includes("blocked")) {
      userFriendlyError = "Dokumen PDF tidak dapat diproses karena terdeteksi filter konten Google Gemini. Pastikan isi dokumen sesuai materi edukasi.";
    }

    return NextResponse.json({ error: userFriendlyError, rawDetails: rawError }, { status: 500 });
  }
}
