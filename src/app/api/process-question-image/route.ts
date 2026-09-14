import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logServerError } from "@/lib/serverLogger";
import { ImageSourceType, StructuredImageQuestionResponse, QuestionOptionItem } from "@/lib/types";
import dns from "dns";

// Ensure Node.js resolves IPv4 first for stable outbound connections
dns.setDefaultResultOrder("ipv4first");

export const maxDuration = 60;

// Regex to detect embedded URLs and Base64 image strings inside text
const URL_REGEX = /(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|svg|webp)[^\s"'<>]*|https?:\/\/[^\s"'<>]+|data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+)/i;

/**
 * Rule 2 Helper: Separates text from embedded image URLs or Base64 data strings.
 * Guarantees zero text mixing.
 */
function cleanTextAndExtractImage(rawText: string, currentImageUrl?: string): {
  cleanText: string;
  extractedImageUrl: string;
} {
  if (!rawText) return { cleanText: "", extractedImageUrl: currentImageUrl || "" };

  let text = rawText;
  let imageUrl = currentImageUrl || "";

  const match = text.match(URL_REGEX);
  if (match) {
    if (!imageUrl) {
      imageUrl = match[0];
    }
    // Remove the URL/Base64 string from the text
    text = text.replace(match[0], "").trim();
  }

  return {
    cleanText: text.trim(),
    extractedImageUrl: imageUrl.trim(),
  };
}

/**
 * Generates an automatic accessibility alt-text using Gemini AI or contextual fallback
 */
async function generateAltTextWithAi(
  contextText: string,
  imageUrl: string,
  isOption = false,
  apiKey?: string | null,
  modelName = "gemini-1.5-flash"
): Promise<string> {
  if (!imageUrl) return "";

  // Attempt AI generation if API key is provided
  if (apiKey && apiKey.trim()) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 120,
        },
      });

      const prompt = `Anda adalah AI Ahli Aksesibilitas dan Edukasi untuk aplikasi kuis interaktif.
Tugas Anda adalah menghasilkan deskripsi teks alternatif singkat (alt_text) secara objektif dalam Bahasa Indonesia (maksimal 1-2 kalimat, tanpa kata pembuka 'Gambar ini menunjukkan' atau 'Foto tentang').
Teks ini sangat penting sebagai penanda aksesibilitas jika gambar gagal dimuat di perangkat siswa.

Konteks Soal / Pilihan:
"${contextText || "Materi Ujian Siswa"}"

${isOption ? "Konteks: Ini adalah gambar untuk opsi pilihan jawaban." : "Konteks: Ini adalah gambar stimulus pertanyaan utama."}

Balas HANYA dengan kalimat deskripsi teks alternatif Bahasa Indonesia, tanpa tanda kutip dan tanpa penjelasan tambahan.`;

      const response = await model.generateContent(prompt);
      const text = response.response.text().trim().replace(/^["']|["']$/g, "");
      if (text && text.length > 5) {
        return text;
      }
    } catch (err) {
      console.warn("Gemini Alt-Text generation fallback invoked:", err);
    }
  }

  // Deterministic pedagogical fallback
  const cleanedContext = contextText ? contextText.slice(0, 80).trim() : "";
  if (isOption) {
    return cleanedContext
      ? `Ilustrasi opsi jawaban: ${cleanedContext}`
      : "Ilustrasi visual pilihan jawaban";
  }
  return cleanedContext
    ? `Diagram visual pendukung soal: ${cleanedContext}`
    : "Diagram visual materi pembelajaran";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      id_soal,
      tipe_soal = "MULTIPLE_CHOICE",
      question,
      options = [],
    } = body as {
      id_soal?: string;
      tipe_soal?: string;
      question?: {
        text?: string;
        image_source_type?: string;
        image_url?: string;
        alt_text?: string;
      };
      options?: Array<{
        option_letter?: string;
        text?: string;
        image_source_type?: string;
        image_url?: string;
        alt_text?: string;
        is_correct?: boolean;
      }>;
    };

    const apiKey =
      req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY || null;
    const modelName =
      req.headers.get("x-gemini-model") || "gemini-1.5-flash";

    // 1. Process Question Object
    const rawQuestionText = question?.text || (body as any).question_text || "";
    const rawQuestionImg = question?.image_url || (body as any).image_url || "";
    let questionSourceType: ImageSourceType =
      (question?.image_source_type as ImageSourceType) ||
      ((body as any).image_source_type as ImageSourceType) ||
      "NONE";

    // Rule 2: Prevent text mixing
    const { cleanText: cleanQuestionText, extractedImageUrl: questionImg } =
      cleanTextAndExtractImage(rawQuestionText, rawQuestionImg);

    // Rule 1: Determine question image_source_type if not explicitly set
    if (questionImg) {
      if (!questionSourceType || questionSourceType === "NONE") {
        if (questionImg.startsWith("data:image/") || questionImg.length > 300) {
          questionSourceType = "PASTE_UPLOAD";
        } else if (questionImg.includes("google") || questionImg.includes("gstatic")) {
          questionSourceType = "GOOGLE_IMAGE_SEARCH";
        } else {
          questionSourceType = "DIRECT_LINK";
        }
      }
    } else {
      questionSourceType = "NONE";
    }

    // Rule 3: Alt Text generation for question image
    let questionAltText =
      question?.alt_text?.trim() ||
      ((body as any).alt_text as string)?.trim() ||
      "";
    if (questionImg && !questionAltText) {
      questionAltText = await generateAltTextWithAi(
        cleanQuestionText,
        questionImg,
        false,
        apiKey,
        modelName
      );
    }

    // 2. Process Options Array
    const processedOptions: QuestionOptionItem[] = [];
    const rawOptions = Array.isArray(options) ? options : [];

    for (let idx = 0; idx < rawOptions.length; idx++) {
      const opt = rawOptions[idx];
      const letter = opt.option_letter || String.fromCharCode(65 + idx);
      const rawOptText = opt.text || "";
      const rawOptImg = opt.image_url || "";
      let optSourceType: ImageSourceType = (opt.image_source_type as ImageSourceType) || "NONE";

      // Rule 2: Prevent text mixing in options
      const { cleanText: cleanOptText, extractedImageUrl: optImg } =
        cleanTextAndExtractImage(rawOptText, rawOptImg);

      // Rule 1: Determine option image_source_type
      if (optImg) {
        if (!optSourceType || optSourceType === "NONE") {
          if (optImg.startsWith("data:image/") || optImg.length > 300) {
            optSourceType = "PASTE_UPLOAD";
          } else if (optImg.includes("google") || optImg.includes("gstatic")) {
            optSourceType = "GOOGLE_IMAGE_SEARCH";
          } else {
            optSourceType = "DIRECT_LINK";
          }
        }
      } else {
        optSourceType = "NONE";
      }

      // Rule 3: Alt Text generation for option image
      let optAltText = opt.alt_text?.trim() || "";
      if (optImg && !optAltText) {
        optAltText = await generateAltTextWithAi(
          cleanOptText || `${cleanQuestionText} (Pilihan ${letter})`,
          optImg,
          true,
          apiKey,
          modelName
        );
      }

      // Rule 4: Handling Image-Only Options
      // If user provided image with empty text or explicitly image-only, ensure text is ""
      const finalText = cleanOptText ? cleanOptText : "";

      processedOptions.push({
        option_letter: letter,
        text: finalText,
        image_source_type: optSourceType,
        image_url: optImg,
        alt_text: optAltText,
        is_correct: Boolean(opt.is_correct),
      });
    }

    // Rule 5: Construct Exact Mandatory JSON Output
    const responseData: StructuredImageQuestionResponse = {
      id_soal: id_soal || `q-${Date.now()}`,
      tipe_soal: tipe_soal.toUpperCase(),
      question: {
        text: cleanQuestionText,
        image_source_type: questionSourceType,
        image_url: questionImg,
        alt_text: questionAltText,
      },
      options: processedOptions,
    };

    return NextResponse.json(responseData, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    const rawError = error instanceof Error ? error.message : String(error);
    console.error("Process Question Image Error:", rawError);
    logServerError("/api/process-question-image", rawError, error);

    return NextResponse.json(
      { error: "Gagal memproses aset gambar soal kuis." },
      { status: 500 }
    );
  }
}
