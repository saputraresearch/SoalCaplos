import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedQuestion } from "@/lib/types";
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
    const pdfBuffer = Buffer.from(arrayBuffer);
    const base64Data = pdfBuffer.toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);

    const userModel = req.headers.get("x-gemini-model") || (formData.get("model") as string | null);

    // List of candidate model names with automatic fallback
    const candidateModels = [
      userModel,
      "gemini-1.5-flash-latest",
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-1.5-pro-latest",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash-exp",
    ].filter(Boolean) as string[];

    const modelsToTry = Array.from(new Set(candidateModels));

    const systemPrompt = `Act strictly as a transcriber. Extract the existing questions, options, and diagram information from the uploaded PDF document exactly as written. Return structured JSON matching the quiz schema. Do not generate or invent new questions.

Return JSON in this EXACT structure:
{
  "title": "Title or subject header from the quiz sheet",
  "questions": [
    {
      "question_text": "Clean exact text of the question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer_index": 0,
      "explanation": "Explanation or answer key reference if present",
      "has_diagram": false,
      "image_url": null
    }
  ]
}

Rules:
- Extract all questions and multiple-choice options verbatim.
- "correct_answer_index" should be the 0-based index of the correct answer (default to 0 if not explicitly indicated).
- Do NOT generate or invent new questions.
- If a question references a diagram, figure, chart, or image present in the document, set "has_diagram": true.`;

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
    const questions: ParsedQuestion[] = Array.isArray(parsed.questions)
      ? parsed.questions.map((q: Partial<ParsedQuestion>, idx: number) => ({
          question_text: q.question_text || `Question ${idx + 1}`,
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
          correct_answer_index: typeof q.correct_answer_index === "number" ? q.correct_answer_index : 0,
          explanation: q.explanation || "",
          image_url: q.image_url || null,
        }))
      : [];

    return NextResponse.json({
      title: detectedTitle,
      modelUsed: successfulModel,
      questions,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in parse-pdf API route:", errorMessage);
    logServerError("/api/parse-pdf", errorMessage, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
