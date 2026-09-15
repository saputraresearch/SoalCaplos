import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedQuestion } from "@/lib/types";
import { enrichQuestionsWithImages } from "@/lib/pdfImageExtractor";
import { extractPdfDigitalText } from "@/lib/pdfTextExtractor";
import { extractScannedPdfWithOcrSpace } from "@/lib/ocrSpace";
import { parseQuizWithGroqText } from "@/lib/groqClient";
import { getActiveGeminiModels, normalizeModelName } from "@/lib/geminiModels";
import { logServerError } from "@/lib/serverLogger";
import dns from "dns";

// Ensure Node.js resolves IPv4 first
dns.setDefaultResultOrder("ipv4first");

export const maxDuration = 60; // Up to 60s processing window on serverless

export async function POST(req: NextRequest) {
  let digitalTextResult: any = null;
  let apiKeys: string[] = [];
  const triedLog: string[] = [];
  const extractionSteps: Array<{
    id: string;
    label: string;
    status: "success" | "failed" | "skipped";
    detail: string;
  }> = [];

  try {
    const formData = await req.formData();

    // Check for Groq API key
    const groqApiKey = (req.headers.get("x-groq-api-key") || (formData.get("groq_api_key") as string | null) || process.env.GROQ_API_KEY)?.trim() || "";

    // Check for Gemini API key from header, formData, or environment variable
    const headerKey = req.headers.get("x-gemini-api-key");
    const formKey = formData.get("api_key") as string | null;
    const envKey = process.env.GEMINI_API_KEY;

    const rawApiKey = headerKey || formKey || (envKey !== "your-gemini-api-key" ? envKey : null);

    if (!rawApiKey && !groqApiKey) {
      return NextResponse.json(
        {
          error:
            "API Key belum diisi. Silakan masukkan Gemini API Key atau Groq API Key melalui menu Pengaturan (ikon gerigi di kanan atas).",
        },
        { status: 400 }
      );
    }

    if (rawApiKey) {
      apiKeys = rawApiKey
        .split(/[\s,\n;]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 10);
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    // Ensure Node.js resolves IPv4 first on every request
    dns.setDefaultResultOrder("ipv4first");

    const pdfBuffer = Buffer.from(arrayBuffer);

    if (pdfBuffer.length > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `Ukuran file PDF (${(pdfBuffer.length / (1024 * 1024)).toFixed(1)} MB) melebihi batas 4.5 MB serverless. Silakan kompres PDF Anda terlebih dahulu.`,
        },
        { status: 413 }
      );
    }

    const base64Data = pdfBuffer.toString("base64");

    const requestedModel = (req.headers.get("x-gemini-model") || (formData.get("model") as string | null))?.trim();
    const preferredProvider = (req.headers.get("x-ai-provider") || (formData.get("ai_provider") as string | null) || (groqApiKey && apiKeys.length === 0 ? "groq" : "auto"))?.toLowerCase();
    // Prioritize official high-throughput flash models
    const candidateList = [requestedModel, "gemini-1.5-flash", "gemini-2.0-flash"].filter(Boolean) as string[];
    const modelsToTry = Array.from(new Set(candidateList.map((m) => normalizeModelName(m))));
    console.log(`[parse-pdf] Provider preference: ${preferredProvider}, Candidate models:`, modelsToTry, `(Active Gemini keys: ${apiKeys.length}, Groq key: ${!!groqApiKey})`);

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

    // Hybrid PDF Extraction: Extract digital text locally in ~50ms
    // extractionSteps tracks every pipeline step for the UI progress panel

    digitalTextResult = await extractPdfDigitalText(pdfBuffer);
    console.log(
      `[parse-pdf] Hybrid text extraction: hasDigitalText=${digitalTextResult.hasDigitalText}, chars=${digitalTextResult.charCount}, pages=${digitalTextResult.pageCount}`
    );

    extractionSteps.push({
      id: "local_text",
      label: "Ekstraksi Teks Lokal",
      status: digitalTextResult.hasDigitalText ? "success" : "failed",
      detail: digitalTextResult.hasDigitalText
        ? `${digitalTextResult.charCount} karakter dari ${digitalTextResult.pageCount} halaman`
        : "PDF scan/foto — tidak ada teks digital",
    });

    // If no digital text detected, try OCR.space to convert scanned pages into text (0 AI tokens)
    if (!digitalTextResult.hasDigitalText) {
      const ocrApiKey = (req.headers.get("x-ocrspace-api-key") || (formData.get("ocr_api_key") as string | null))?.trim();
      if (!ocrApiKey) {
        extractionSteps.push({
          id: "ocr_space",
          label: "OCR Space",
          status: "skipped",
          detail: "API Key OCR Space tidak ditemukan di Pengaturan",
        });
      } else {
        try {
          const ocrResult = await extractScannedPdfWithOcrSpace(pdfBuffer, ocrApiKey);
          if (ocrResult.success && ocrResult.text) {
            console.log(`[parse-pdf] OCR.space converted scanned PDF to text (${ocrResult.text.length} chars)`);
            digitalTextResult = {
              hasDigitalText: true,
              fullText: ocrResult.text,
              charCount: ocrResult.text.length,
              pageCount: ocrResult.pageCount || 1,
              pageTexts: [{ pageNumber: 1, text: ocrResult.text }],
            };
            extractionSteps.push({
              id: "ocr_space",
              label: "OCR Space",
              status: "success",
              detail: `${ocrResult.text.length} karakter berhasil diekstrak dari scan PDF`,
            });
          } else {
            extractionSteps.push({
              id: "ocr_space",
              label: "OCR Space",
              status: "failed",
              detail: ocrResult.error || "OCR Space tidak mengembalikan teks",
            });
          }
        } catch (ocrErr) {
          const ocrErrMsg = ocrErr instanceof Error ? ocrErr.message : String(ocrErr);
          console.warn("[parse-pdf] OCR.space attempt error:", ocrErrMsg);
          extractionSteps.push({
            id: "ocr_space",
            label: "OCR Space",
            status: "failed",
            detail: ocrErrMsg.slice(0, 120),
          });
        }
      }
    } else {
      extractionSteps.push({
        id: "ocr_space",
        label: "OCR Space",
        status: "skipped",
        detail: "Tidak diperlukan — teks digital sudah tersedia",
      });
    }

    // If digital text exists, send PURE TEXT as the primary prompt!
    // This cuts token consumption by 99% (from ~250,000 visual tokens to ~1,500 text tokens)
    // and eliminates 429 TPM / RPM quota exhaustion on Google AI Studio.
    const primaryPromptParts = digitalTextResult.hasDigitalText
      ? [
          systemPrompt,
          `DOKUMEN SOAL (Teks digital resmi hasil ekstraksi dokumen PDF):\n\n${digitalTextResult.fullText}\n\nInstruksi: Ekstrak seluruh butir soal, pilihan jawaban (A, B, C, D), nomor soal, dan kunci jawaban/pembahasan dari teks dokumen di atas ke dalam struktur JSON yang diminta.`,
        ]
      : [
          systemPrompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf",
            },
          },
        ];

    // Fallback prompt only used if pure text extraction fails to return valid JSON
    const fallbackVisualPromptParts = digitalTextResult.hasDigitalText
      ? [
          systemPrompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf",
            },
          },
        ]
      : null;

    let responseText: string | null = null;
    let lastError: Error | null = null;
    let successfulModel = "";
    let successfulKeyIndex = 0;
    const triedLog: string[] = [];

    const tryGroq = async (): Promise<boolean> => {
      if (!groqApiKey) return false;
      const textToUse = digitalTextResult?.fullText || "";
      if (textToUse.length >= 20) {
        console.log(`[parse-pdf] Executing Groq Cloud AI with ${textToUse.length} chars of text...`);
        const groqRes = await parseQuizWithGroqText(textToUse, systemPrompt, groqApiKey);
        if (groqRes.success && groqRes.data) {
          responseText = JSON.stringify(groqRes.data);
          successfulModel = `groq/${groqRes.model || "llama-4-scout"}`;
          extractionSteps.push({
            id: "groq",
            label: "Groq AI",
            status: "success",
            detail: `Berhasil dengan model: ${groqRes.model}${groqRes.triedModels && groqRes.triedModels.length > 1 ? ` (dicoba ${groqRes.triedModels.length} model)` : ""}`,
          });
          console.log(`[parse-pdf] Groq parsing succeeded with model: ${groqRes.model}`);
          return true;
        } else {
          const errMsg = groqRes.error || "Groq parsing failed.";
          triedLog.push(`Groq: ${errMsg.slice(0, 120)}`);
          extractionSteps.push({
            id: "groq",
            label: "Groq AI",
            status: "failed",
            detail: groqRes.triedModels
              ? `${groqRes.triedModels.length} model dicoba, semua gagal. ${errMsg.slice(0, 100)}`
              : errMsg.slice(0, 150),
          });
          console.warn("[parse-pdf] Groq parsing failed:", errMsg);
          lastError = new Error(errMsg);
        }
      } else {
        console.warn("[parse-pdf] Groq requires digital text, but PDF has no text layer.");
        triedLog.push("Groq: Memerlukan teks digital / OCR");
        extractionSteps.push({
          id: "groq",
          label: "Groq AI",
          status: "skipped",
          detail: "Tidak ada teks yang bisa dikirim ke Groq (PDF scan tanpa OCR)",
        });
      }
      return false;
    };

    // If Groq is preferred or only Groq is configured, run Groq first!
    if ((preferredProvider === "groq" || apiKeys.length === 0) && groqApiKey) {
      await tryGroq();
    }

    // Run Gemini if response not yet obtained and Gemini keys are available
    if (!responseText && apiKeys.length > 0) {
      keyLoop: for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
        const currentApiKey = apiKeys[keyIdx];
        const genAI = new GoogleGenerativeAI(currentApiKey);

        for (const modelName of modelsToTry) {
          try {
            console.log(`Attempting extraction with key #${keyIdx + 1} and model: ${modelName} (pureText=${digitalTextResult.hasDigitalText})`);
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { responseMimeType: "application/json" },
            });

            // Attempt with primary prompt (ultra-lightweight pure text if available)
            let result;
            try {
              result = await model.generateContent(primaryPromptParts);
            } catch (primaryErr: any) {
              const primaryErrMsg = String(primaryErr?.message || primaryErr);
              // If pure text failed for a non-quota reason and visual fallback is available, try fallback
              if (
                fallbackVisualPromptParts &&
                !primaryErrMsg.includes("RESOURCE_EXHAUSTED") &&
                !primaryErrMsg.includes("429") &&
                !primaryErrMsg.includes("quota")
              ) {
                console.warn(`Pure text attempt failed on ${modelName}, trying visual fallback...`);
                result = await model.generateContent(fallbackVisualPromptParts);
              } else {
                throw primaryErr;
              }
            }

            responseText = result.response.text();
            if (responseText) {
              successfulModel = modelName;
              successfulKeyIndex = keyIdx;
              extractionSteps.push({
                id: `gemini_key${keyIdx + 1}`,
                label: `Gemini (Key #${keyIdx + 1})`,
                status: "success",
                detail: `Berhasil dengan model: ${modelName}`,
              });
              console.log(`Extraction succeeded with key #${keyIdx + 1} and model: ${modelName}`);
              break keyLoop;
            }
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            const shortErr = errorMsg.length > 90 ? `${errorMsg.slice(0, 90)}...` : errorMsg;
            triedLog.push(`Key #${keyIdx + 1} [${modelName}]: ${shortErr}`);
            console.warn(`Key #${keyIdx + 1} model ${modelName} failed (${errorMsg})`);
            lastError = err instanceof Error ? err : new Error(errorMsg);

            // If network failure, brief backoff
            if (errorMsg.includes("fetch failed") || errorMsg.includes("ENOTFOUND") || errorMsg.includes("ETIMEDOUT")) {
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }
      }
      // If Gemini loop finished without success, log step
      if (!responseText && !extractionSteps.find((s) => s.id.startsWith("gemini"))) {
        extractionSteps.push({
          id: "gemini",
          label: "Gemini AI",
          status: "failed",
          detail: triedLog.filter((t) => t.includes("Key #")).slice(-1)[0]?.slice(0, 150) || "Semua Gemini key/model gagal",
        });
      }
    } else if (!responseText && apiKeys.length === 0) {
      extractionSteps.push({
        id: "gemini",
        label: "Gemini AI",
        status: "skipped",
        detail: "Tidak ada Gemini API Key yang dikonfigurasi",
      });
    }

    // If Gemini models failed, try Groq Cloud AI as fallback!
    if (!responseText && groqApiKey && !extractionSteps.find((s) => s.id === "groq" && s.status === "success")) {
      console.log(`[parse-pdf] Gemini models failed, running Groq Cloud AI fallback...`);
      await tryGroq();
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
      extractionSteps,
    });
  } catch (error: unknown) {
    const rawError = error instanceof Error ? error.message : String(error);
    console.error("Error in parse-pdf API route:", rawError);
    logServerError("/api/parse-pdf", rawError, error);

    let userFriendlyError = rawError;
    if (rawError.includes("API_KEY_INVALID") || rawError.includes("API key not valid") || rawError.includes("400")) {
      userFriendlyError = "API Key Gemini Anda tidak valid. Silakan periksa kembali dan masukkan API Key yang benar melalui menu Pengaturan (ikon gerigi di kanan atas).";
    } else if (rawError.includes("RESOURCE_EXHAUSTED") || rawError.includes("429") || rawError.includes("quota")) {
      userFriendlyError = "Batas kuota gratis (rate limit / quota) Gemini API Anda telah tercapai. Kuota Google dihitung per API Key / Project (maks 15 request per menit). Silakan tunggu 1-2 menit lalu klik 'Coba Ekstrak Ulang', atau tambahkan API Key cadangan di menu Pengaturan.";
    } else if (rawError.includes("fetch failed") || rawError.includes("ENOTFOUND") || rawError.includes("ETIMEDOUT") || rawError.includes("ECONNRESET")) {
      userFriendlyError = "Gagal terhubung ke Google Gemini API (koneksi jaringan terputus / fetch failed). Pastikan perangkat Anda terhubung ke internet dan API Key di menu Pengaturan sudah aktif.";
    } else if (rawError.includes("SAFETY") || rawError.includes("blocked")) {
      userFriendlyError = "Dokumen PDF tidak dapat diproses karena terdeteksi filter konten Google Gemini. Pastikan isi dokumen sesuai materi edukasi.";
    }

    return NextResponse.json(
      {
        error: userFriendlyError,
        rawDetails: rawError,
        extractionSteps,
        diagnostics: {
          hasDigitalText: digitalTextResult?.hasDigitalText ?? false,
          charCount: digitalTextResult?.charCount ?? 0,
          pageCount: digitalTextResult?.pageCount ?? 0,
          keysTested: apiKeys.length,
          triedLog,
        },
      },
      { status: 500 }
    );
  }
}
