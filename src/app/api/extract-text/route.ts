import { NextRequest, NextResponse } from "next/server";
import { extractPdfDigitalText } from "@/lib/pdfTextExtractor";
import { extractScannedPdfWithOcrSpace } from "@/lib/ocrSpace";

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const extractionSteps: Array<{
    id: string;
    label: string;
    status: "success" | "failed" | "skipped";
    detail: string;
  }> = [];

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File PDF tidak ditemukan dalam request." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // 1. Ekstraksi Teks Lokal (<50ms via pdf-parse)
    const digitalTextResult = await extractPdfDigitalText(pdfBuffer);
    console.log(
      `[extract-text] Local text extraction: hasDigitalText=${digitalTextResult.hasDigitalText}, chars=${digitalTextResult.charCount}, pages=${digitalTextResult.pageCount}`
    );

    extractionSteps.push({
      id: "local_text",
      label: "Ekstraksi Teks Lokal",
      status: digitalTextResult.hasDigitalText ? "success" : "failed",
      detail: digitalTextResult.hasDigitalText
        ? `${digitalTextResult.charCount} karakter dari ${digitalTextResult.pageCount} halaman`
        : "PDF scan/foto — tidak ada teks digital",
    });

    let finalText = digitalTextResult.fullText || "";
    let finalHasText = digitalTextResult.hasDigitalText;

    // 2. OCR Space fallback jika PDF scan/foto (tanpa teks digital)
    if (!finalHasText) {
      const ocrApiKey = (
        req.headers.get("x-ocrspace-api-key") ||
        (formData.get("ocr_api_key") as string | null)
      )?.trim();

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
            console.log(
              `[extract-text] OCR.space succeeded (${ocrResult.text.length} chars)`
            );
            finalText = ocrResult.text;
            finalHasText = true;
            extractionSteps.push({
              id: "ocr_space",
              label: "OCR Space",
              status: "success",
              detail: `${ocrResult.text.length} karakter berhasil diekstrak via OCR Space`,
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

    return NextResponse.json({
      success: true,
      hasDigitalText: finalHasText,
      fullText: finalText,
      charCount: finalText.length,
      pageCount: digitalTextResult.pageCount || 1,
      extractionSteps,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[extract-text] Error:", errorMsg);
    return NextResponse.json(
      {
        success: false,
        error: `Gagal mengekstrak teks dari PDF: ${errorMsg}`,
        extractionSteps,
      },
      { status: 500 }
    );
  }
}
