/**
 * Fast digital text extractor for PDF documents.
 * Extracts embedded text stream in milliseconds without network calls or token consumption.
 */
export async function extractPdfDigitalText(pdfBuffer: Buffer): Promise<{
  hasDigitalText: boolean;
  fullText: string;
  charCount: number;
  pageCount: number;
  pageTexts: Array<{ pageNumber: number; text: string }>;
}> {
  // Method 1: Try pdfjs-dist
  try {
    // @ts-ignore
    const pdfjs = (await import("pdfjs-dist/build/pdf.js")) as any;
    if (pdfjs && typeof pdfjs.getDocument === "function") {
      const data = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjs.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
      });

      const doc = await loadingTask.promise;
      const pageTexts: Array<{ pageNumber: number; text: string }> = [];
      let fullText = "";

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        const strings = content.items
          .map((item: any) => (item && item.str ? item.str.trim() : ""))
          .filter(Boolean);
        const pageStr = strings.join(" ");
        pageTexts.push({ pageNumber: pageNum, text: pageStr });
        fullText += `\n[--- Halaman ${pageNum} ---]\n${pageStr}\n`;
      }

      const trimmed = fullText.trim();
      const cleanChars = trimmed.replace(/[^a-zA-Z0-9]/g, "");
      if (cleanChars.length >= 40) {
        return {
          hasDigitalText: true,
          fullText: trimmed,
          charCount: trimmed.length,
          pageCount: doc.numPages,
          pageTexts,
        };
      }
    }
  } catch (err) {
    console.warn("[pdfTextExtractor] pdfjs-dist extraction failed or unavailable, using fallback:", err);
  }

  // Method 2: Fast regex stream fallback for standard uncompressed / lightly compressed text
  try {
    const raw = pdfBuffer.toString("latin1");
    const tjMatches = raw.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g) || [];
    if (tjMatches.length >= 10) {
      const extractedWords = tjMatches
        .map((m) => m.replace(/^[(\s]+|[)\s'"]+$/g, "").trim())
        .filter((w) => w.length > 1 && !/^[\x00-\x1F]+$/.test(w));
      const text = extractedWords.join(" ");
      const cleanChars = text.replace(/[^a-zA-Z0-9]/g, "");
      if (cleanChars.length >= 50) {
        return {
          hasDigitalText: true,
          fullText: text,
          charCount: text.length,
          pageCount: (raw.match(/\/Type\s*\/Page[^s]/g) || []).length || 1,
          pageTexts: [{ pageNumber: 1, text }],
        };
      }
    }
  } catch (rawErr) {
    console.warn("[pdfTextExtractor] Raw stream fallback error:", rawErr);
  }

  return {
    hasDigitalText: false,
    fullText: "",
    charCount: 0,
    pageCount: 0,
    pageTexts: [],
  };
}
