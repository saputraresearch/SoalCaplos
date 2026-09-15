/**
 * Fast digital text extractor for PDF documents.
 * Extracts embedded text stream using pdfjs-dist in milliseconds without network calls or token consumption.
 */
export async function extractPdfDigitalText(pdfBuffer: Buffer): Promise<{
  hasDigitalText: boolean;
  fullText: string;
  charCount: number;
  pageCount: number;
  pageTexts: Array<{ pageNumber: number; text: string }>;
}> {
  try {
    // @ts-ignore
    const pdfjs = (await import("pdfjs-dist/build/pdf.js")) as any;
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
    // If more than 50 printable alphanumeric characters, consider it a digital text PDF
    const cleanChars = trimmed.replace(/[^a-zA-Z0-9]/g, "");
    const hasDigitalText = cleanChars.length >= 40;

    return {
      hasDigitalText,
      fullText: trimmed,
      charCount: trimmed.length,
      pageCount: doc.numPages,
      pageTexts,
    };
  } catch (err) {
    console.warn("[pdfTextExtractor] Could not extract digital text from PDF:", err);
    return {
      hasDigitalText: false,
      fullText: "",
      charCount: 0,
      pageCount: 0,
      pageTexts: [],
    };
  }
}
