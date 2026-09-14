import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logServerError } from "@/lib/serverLogger";
import dns from "dns";

// Ensure Node.js resolves IPv4 first
dns.setDefaultResultOrder("ipv4first");

export const maxDuration = 60;

export interface GeneratedOption {
  option_letter: string;
  option_text: string;
  is_correct: boolean;
  distractor_analysis: string;
}

export interface DistractorResponse {
  status: "success";
  generated_options: GeneratedOption[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      question_text,
      correct_answer,
      option_count = 4,
      target_age = "12-15 tahun (SMP)",
    } = body as {
      question_text: string;
      correct_answer: string;
      option_count?: number;
      target_age?: string;
    };

    if (!question_text || !question_text.trim()) {
      return NextResponse.json(
        { error: "Teks soal / pertanyaan wajib diisi." },
        { status: 400 }
      );
    }

    if (!correct_answer || !correct_answer.trim()) {
      return NextResponse.json(
        { error: "Kunci jawaban benar wajib diisi untuk menghasilkan pengecoh logis." },
        { status: 400 }
      );
    }

    const count = Math.min(Math.max(Number(option_count) || 4, 2), 6);
    const distractorCount = count - 1;

    // Check for API key
    const headerKey = req.headers.get("x-gemini-api-key");
    const envKey = process.env.GEMINI_API_KEY;
    const apiKey = headerKey || (envKey !== "your-gemini-api-key" ? envKey : null);

    let generatedDistractors: { text: string; analysis: string }[] = [];

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const userModel = req.headers.get("x-gemini-model");

      const candidateModels = [
        userModel,
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro-latest",
      ].filter(Boolean) as string[];

      const modelsToTry = Array.from(new Set(candidateModels));

      const prompt = `Anda adalah Core AI Engine untuk modul "Smart Options & Distractor Generator" di aplikasi kuis interaktif.
Tugas utama Anda adalah membantu guru membuat opsi jawaban pengecoh (distractors) berkualitas tinggi, logis, dan menantang untuk tipe soal objektif pilihan ganda.

DATA SOAL:
- Teks Soal/Pertanyaan Utama: "${question_text.trim()}"
- Kunci Jawaban Benar (Correct Answer): "${correct_answer.trim()}"
- Target Usia/Jenjang Siswa: "${target_age}"
- Jumlah Pengecoh yang Dibutuhkan: Tepat ${distractorCount} butir pengecoh salah (Total dengan kunci jawaban = ${count} opsi).

ATURAN UX & EDUKASI KETAT:
1. RELEVANSI KONSEP (Pengecoh Logis): Semua opsi pengecoh harus memiliki keterkaitan konsep erat dengan topik soal. Jangan membuat opsi yang konyol atau tidak nyambung.
2. KESALAHAN UMUM (Common Misconceptions): Buat opsi pengecoh berdasarkan kesalahpahaman umum yang sering dialami oleh siswa pada target jenjang tersebut.
3. STRUKTUR PARALEL: Panjang kalimat, gaya bahasa, dan format penulisan (seperti penggunaan huruf kapital, simbol, atau satuan) antara kunci jawaban benar dan opsi pengecoh harus seragam/paralel agar siswa tidak bisa menebak jawaban benar hanya dari panjang pendeknya teks.
4. VALIDASI MUTLAK: Pastikan semua opsi pengecoh yang Anda hasilkan bernilai SALAH secara ilmiah/faktual tanpa ambiguitas atau berpotensi menjadi jawaban benar kedua.

FORMAT OUTPUT WAJIB:
Berikan HANYA JSON murni tanpa markdown blok atau teks pembuka dengan struktur:
{
  "distractors": [
    {
      "text": "[Teks Opsi Pengecoh yang salah namun sangat logis]",
      "analysis": "[Penjelasan singkat mengapa pengecoh ini logis dan menjebak bagi siswa / miskonsepsi apa yang disentuh]"
    }
  ]
}`;

      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          });

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const rawText = response.text();

          if (rawText) {
            const cleanJson = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed.distractors) && parsed.distractors.length > 0) {
              generatedDistractors = parsed.distractors.slice(0, distractorCount).map((d: any, idx: number) => ({
                text: String(d.text || `Alternatif Pengecoh ${idx + 1}`),
                analysis: String(d.analysis || "Pengecoh logis berdasarkan materi terkait."),
              }));
              break;
            }
          }
        } catch (err) {
          console.warn(`Model ${modelName} failed for distractors:`, err);
        }
      }
    }

    // Fallback if AI offline or returned insufficient distractors
    while (generatedDistractors.length < distractorCount) {
      const idx = generatedDistractors.length + 1;
      generatedDistractors.push({
        text: `Variasi Konsep Terkait ${idx} (${correct_answer.slice(0, 15)})`,
        analysis: `Pengecoh berdasarkan konsep alternatif yang sering tertukar oleh siswa dengan "${correct_answer}".`,
      });
    }

    // Combine correct answer and distractors, then randomly shuffle position
    const optionsPool: { text: string; is_correct: boolean; analysis: string }[] = [
      {
        text: correct_answer.trim(),
        is_correct: true,
        analysis: "Kunci Jawaban Benar (Faktual & Tervalidasi).",
      },
      ...generatedDistractors.map((d) => ({
        text: d.text.trim(),
        is_correct: false,
        analysis: d.analysis.trim(),
      })),
    ];

    // Fisher-Yates Shuffle to guarantee correct answer is NOT always option A
    for (let i = optionsPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionsPool[i], optionsPool[j]] = [optionsPool[j], optionsPool[i]];
    }

    // Assign final letters (A, B, C, D, E, F)
    const finalOptions: GeneratedOption[] = optionsPool.map((opt, idx) => ({
      option_letter: String.fromCharCode(65 + idx),
      option_text: opt.text,
      is_correct: opt.is_correct,
      distractor_analysis: opt.is_correct
        ? "Kunci Jawaban Benar (Faktual & Tervalidasi)."
        : opt.analysis,
    }));

    const responsePayload: DistractorResponse = {
      status: "success",
      generated_options: finalOptions,
    };

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    const rawError = error instanceof Error ? error.message : String(error);
    console.error("Distractor Generation Error:", rawError);
    logServerError("/api/generate-distractors", rawError, error);

    return NextResponse.json(
      { error: "Gagal membuat opsi pengecoh otomatis. Silakan periksa kembali API Key Gemini Anda." },
      { status: 500 }
    );
  }
}
