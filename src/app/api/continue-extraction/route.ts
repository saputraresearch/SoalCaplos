import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseRemainingQuestionsWithGroq } from "@/lib/groqClient";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

export const maxDuration = 45;

const SYSTEM_CONTINUE_PROMPT = `Act as an expert math teacher, document transcriber, exam parser, and master problem solver.
Your task is to extract the remaining questions from the uploaded document text.
You MUST solve every question to provide the accurate answer key and explanation.
Never output dummy choices or always 0 for correct_answer_index. Varied keys (A, B, C, D) are required.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullText, fromIndex, toIndex } = body;

    if (!fullText || typeof fromIndex !== "number" || typeof toIndex !== "number") {
      return NextResponse.json(
        { error: "fullText, fromIndex, dan toIndex wajib diisi." },
        { status: 400 }
      );
    }

    const groqApiKey =
      (req.headers.get("x-groq-api-key") || body.groq_api_key || process.env.GROQ_API_KEY)?.trim() || "";
    const geminiApiKey =
      (req.headers.get("x-gemini-api-key") || body.gemini_api_key || process.env.GEMINI_API_KEY)?.trim() || "";
    const preferredProvider =
      (req.headers.get("x-ai-provider") || body.ai_provider || (groqApiKey ? "groq" : "auto"))?.toLowerCase();

    // 1. Try Groq if preferred or only Groq available
    if ((preferredProvider === "groq" || !geminiApiKey) && groqApiKey) {
      console.log(`[continue-extraction] Trying Groq for questions ${fromIndex} to ${toIndex}...`);
      const groqRes = await parseRemainingQuestionsWithGroq(
        fullText,
        fromIndex,
        toIndex,
        SYSTEM_CONTINUE_PROMPT,
        groqApiKey
      );
      if (groqRes.success && Array.isArray(groqRes.data?.questions) && groqRes.data.questions.length > 0) {
        return NextResponse.json({
          success: true,
          questions: groqRes.data.questions,
          provider: "groq",
          model: groqRes.model,
        });
      }
    }

    // 2. Try Gemini
    if (geminiApiKey) {
      console.log(`[continue-extraction] Trying Gemini for questions ${fromIndex} to ${toIndex}...`);
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];

      for (const mName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({
            model: mName,
            generationConfig: { responseMimeType: "application/json" },
          });

          const prompt = `DOKUMEN NASKAH SOAL:\n\n${fullText}\n\n⚠️ INSTRUKSI KHUSUS:\nSoal nomor 1 s/d ${fromIndex - 1} SUDAH diekstrak sebelumnya.\nSekarang, HANYA EKSTRAK soal nomor ${fromIndex} sampai nomor ${toIndex} tanpa terlewat satupun!\nSelesaikan dan tentukan kunci jawaban A, B, C, D (correct_answer_index) serta langkah pengerjaannya.\nKembalikan JSON murni format:\n{\n  "questions": [\n    {\n      "question_text": "...",\n      "question_type": "MULTIPLE_CHOICE" | "FILL_IN_THE_BLANKS",\n      "options": ["A", "B", "C", "D"],\n      "correct_answer_index": 0,\n      "explanation": "..."\n    }\n  ]\n}`;

          const res = await model.generateContent([SYSTEM_CONTINUE_PROMPT, prompt]);
          const rawText = res.response.text();
          if (rawText) {
            const parsed = JSON.parse(rawText.replace(/^```json/, "").replace(/```$/, "").trim());
            if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
              return NextResponse.json({
                success: true,
                questions: parsed.questions,
                provider: "gemini",
                model: mName,
              });
            }
          }
        } catch (mErr) {
          console.warn(`[continue-extraction] Gemini model ${mName} error:`, mErr);
        }
      }
    }

    // 3. Fallback to Groq if not tried yet
    if (groqApiKey && preferredProvider !== "groq") {
      const groqRes = await parseRemainingQuestionsWithGroq(
        fullText,
        fromIndex,
        toIndex,
        SYSTEM_CONTINUE_PROMPT,
        groqApiKey
      );
      if (groqRes.success && Array.isArray(groqRes.data?.questions) && groqRes.data.questions.length > 0) {
        return NextResponse.json({
          success: true,
          questions: groqRes.data.questions,
          provider: "groq",
          model: groqRes.model,
        });
      }
    }

    return NextResponse.json(
      { error: "Gagal mengekstrak sisa soal. Periksa kuota API Key Anda." },
      { status: 500 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[continue-extraction] Route error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
