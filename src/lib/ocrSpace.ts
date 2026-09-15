/**
 * OCR.space Free API Client
 * Used as a fallback for scanned PDF documents that have no embedded digital text.
 * Generates plain text (25,000 free requests/month) which is then parsed by LLM as lightweight text.
 */
export async function extractScannedPdfWithOcrSpace(
  pdfBuffer: Buffer,
  apiKey?: string | null
): Promise<{ success: boolean; text: string; pageCount: number; error?: string }> {
  const key = (apiKey || process.env.OCR_SPACE_API_KEY || "helloworld").trim();

  try {
    const form = new FormData();
    form.append("apikey", key);
    form.append("isOverlayRequired", "false");
    form.append("OCREngine", "2"); // Engine 2 is optimized for numbers, English & Latin characters
    form.append("detectOrientation", "true");
    form.append("scale", "true");

    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
    form.append("file", blob, "scanned_document.pdf");

    console.log(`[OCR.space] Submitting scanned PDF buffer (${(pdfBuffer.length / 1024).toFixed(1)} KB) to OCR.space...`);
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(35000), // 35-second timeout
    });

    if (!res.ok) {
      return { success: false, text: "", pageCount: 0, error: `OCR.space returned HTTP ${res.status}` };
    }

    const data = await res.json();

    if (data.IsErroredOnProcessing && Array.isArray(data.ErrorMessage)) {
      const errStr = data.ErrorMessage.join("; ");
      console.warn("[OCR.space] Processing error:", errStr);
      return { success: false, text: "", pageCount: 0, error: errStr };
    }

    if (Array.isArray(data.ParsedResults)) {
      const pages = data.ParsedResults.map((p: any, idx: number) => {
        const pageText = (p.ParsedText || "").trim();
        return `[--- Halaman ${idx + 1} ---]\n${pageText}`;
      }).filter(Boolean);

      const fullText = pages.join("\n\n").trim();
      if (fullText.length >= 20) {
        console.log(`[OCR.space] Successfully extracted ${fullText.length} characters from scanned PDF across ${pages.length} pages.`);
        return { success: true, text: fullText, pageCount: pages.length };
      }
    }

    return { success: false, text: "", pageCount: 0, error: "Tidak ada teks yang dapat dikenali dari gambar scan." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[OCR.space] Fetch error:", msg);
    return { success: false, text: "", pageCount: 0, error: msg };
  }
}
