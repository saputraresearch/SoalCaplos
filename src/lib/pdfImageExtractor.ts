import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import type { ImageSourceType, ParsedQuestion, QuestionOptionItem, QuestionType } from "./types";

const execFileAsync = promisify(execFile);

export interface RawOptionData {
  option_letter?: string;
  text?: string;
  has_image?: boolean;
  image_box?: [number, number, number, number] | null; // [ymin, xmin, ymax, xmax] 0-1000
  image_description?: string;
  page_number?: number;
}

export interface RawQuestionData {
  question_text: string;
  question_type?: QuestionType | string;
  page_number?: number;
  has_diagram?: boolean;
  diagram_box?: [number, number, number, number] | null; // [ymin, xmin, ymax, xmax] 0-1000
  diagram_description?: string;
  options?: Array<string | RawOptionData>;
  correct_answer_index?: number;
  correct_answers?: number[];
  blanks_keywords?: string[];
  rubric?: string[];
  explanation?: string;
}

/**
 * Check whether poppler binaries (pdftoppm, pdfimages) are available
 */
async function checkPopplerAvailable(): Promise<{ pdftoppm: boolean; pdfimages: boolean }> {
  let pdftoppm = false;
  let pdfimages = false;
  try {
    await execFileAsync("pdftoppm", ["-v"]);
    pdftoppm = true;
  } catch {
    pdftoppm = false;
  }
  try {
    await execFileAsync("pdfimages", ["-v"]);
    pdfimages = true;
  } catch {
    pdfimages = false;
  }
  return { pdftoppm, pdfimages };
}

/**
 * Render a single page of a PDF file to a PNG Buffer using pdftoppm
 */
export async function renderPdfPage(
  pdfBuffer: Buffer,
  pageNumber: number,
  dpi = 150
): Promise<Buffer | null> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pdf-page-"));
  const tmpPdfPath = path.join(tmpDir, "document.pdf");
  const tmpOutPrefix = path.join(tmpDir, "page");

  try {
    await fs.promises.writeFile(tmpPdfPath, pdfBuffer);

    // Call pdftoppm with strict page bounds: -f <page> -l <page>
    const safePage = Math.max(1, Math.floor(pageNumber));
    await execFileAsync("pdftoppm", [
      "-png",
      "-r",
      dpi.toString(),
      "-f",
      safePage.toString(),
      "-l",
      safePage.toString(),
      tmpPdfPath,
      tmpOutPrefix,
    ]);

    // pdftoppm outputs files named like 'page-1.png', 'page-01.png', or 'page-001.png'
    const files = await fs.promises.readdir(tmpDir);
    const pngFiles = files.filter(
      (f) => f.startsWith("page") && f.endsWith(".png")
    );

    if (pngFiles.length === 0) {
      console.warn(`[pdfImageExtractor] No rendered PNG found for page ${safePage}`);
      return null;
    }

    // Sort to pick the closest match
    const targetFile = path.join(tmpDir, pngFiles[0]);
    const buffer = await fs.promises.readFile(targetFile);
    return buffer;
  } catch (err) {
    console.warn(`[pdfImageExtractor] Failed to render PDF page ${pageNumber} via pdftoppm:`, err);
    return null;
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Crop an image region from a rendered page buffer using normalized coordinates [ymin, xmin, ymax, xmax] (0-1000)
 */
export async function cropImageFromPage(
  pageBuffer: Buffer,
  box: [number, number, number, number],
  options: { maxWidth?: number; quality?: number } = {}
): Promise<string | null> {
  try {
    const maxWidth = options.maxWidth || 800;
    const quality = options.quality || 85;

    const [ymin, xmin, ymax, xmax] = box;

    // Validate box dimensions
    if (ymax <= ymin || xmax <= xmin) {
      console.warn("[pdfImageExtractor] Invalid crop box dimensions:", box);
      return null;
    }

    const metadata = await sharp(pageBuffer).metadata();
    const pageWidth = metadata.width || 0;
    const pageHeight = metadata.height || 0;

    if (pageWidth === 0 || pageHeight === 0) {
      return null;
    }

    // Convert 0-1000 normalized coordinates to pixel values
    // Add a slight 1.5% padding around the bounding box for comfortable framing
    const paddingX = Math.round(((xmax - xmin) * 0.015 * pageWidth) / 1000);
    const paddingY = Math.round(((ymax - ymin) * 0.015 * pageHeight) / 1000);

    const rawLeft = Math.round((xmin / 1000) * pageWidth) - paddingX;
    const rawTop = Math.round((ymin / 1000) * pageHeight) - paddingY;
    const rawRight = Math.round((xmax / 1000) * pageWidth) + paddingX;
    const rawBottom = Math.round((ymax / 1000) * pageHeight) + paddingY;

    // Clamp coordinates safely within page boundaries
    const left = Math.max(0, Math.min(rawLeft, pageWidth - 10));
    const top = Math.max(0, Math.min(rawTop, pageHeight - 10));
    const width = Math.min(Math.max(10, rawRight - left), pageWidth - left);
    const height = Math.min(Math.max(10, rawBottom - top), pageHeight - top);

    if (width < 15 || height < 15) {
      console.warn("[pdfImageExtractor] Cropped region too small:", { left, top, width, height });
      return null;
    }

    let pipeline = sharp(pageBuffer).extract({ left, top, width, height });

    // Resize if oversized to keep quiz payload compact and fast
    if (width > maxWidth) {
      pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
    }

    const outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${outputBuffer.toString("base64")}`;
  } catch (err) {
    console.warn("[pdfImageExtractor] Error cropping image from page:", err);
    return null;
  }
}

/**
 * Extract raw embedded raster images from PDF using pdfimages
 */
export async function extractEmbeddedImages(pdfBuffer: Buffer): Promise<string[]> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pdf-images-"));
  const tmpPdfPath = path.join(tmpDir, "document.pdf");
  const tmpOutPrefix = path.join(tmpDir, "img");

  try {
    await fs.promises.writeFile(tmpPdfPath, pdfBuffer);
    await execFileAsync("pdfimages", ["-png", tmpPdfPath, tmpOutPrefix]);

    const files = await fs.promises.readdir(tmpDir);
    const imageFiles = files
      .filter((f) => f.startsWith("img-") && (f.endsWith(".png") || f.endsWith(".jpg")))
      .sort();

    const dataUris: string[] = [];

    for (const f of imageFiles) {
      const filePath = path.join(tmpDir, f);
      const buf = await fs.promises.readFile(filePath);

      // Filter out micro icons/artifacts (< 35px)
      try {
        const meta = await sharp(buf).metadata();
        if ((meta.width && meta.width < 35) || (meta.height && meta.height < 35)) {
          continue;
        }

        // Compress to compact JPEG
        const optimized = await sharp(buf)
          .resize({ width: 800, withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();

        dataUris.push(`data:image/jpeg;base64,${optimized.toString("base64")}`);
      } catch {
        // If sharp cannot process, skip
      }
    }

    return dataUris;
  } catch (err) {
    console.warn("[pdfImageExtractor] Error running pdfimages:", err);
    return [];
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

/**
 * Detect the genuine question type from document structure or Gemini hints
 */
export function detectQuestionType(rawQ: RawQuestionData): QuestionType {
  const normalizedType = (rawQ.question_type || "").toUpperCase().trim();
  const qText = rawQ.question_text || "";

  // 1. Explicit type from Gemini
  if (
    normalizedType === "FILL_IN_THE_BLANKS" ||
    normalizedType === "ISIAN" ||
    normalizedType === "ISIAN_SINGKAT" ||
    normalizedType === "ISIAN_RUMPANG"
  ) {
    return "FILL_IN_THE_BLANKS";
  }
  if (normalizedType === "OPEN_ENDED" || normalizedType === "URAIAN" || normalizedType === "ESAI") {
    return "OPEN_ENDED";
  }
  if (normalizedType === "TRUE_OR_FALSE" || normalizedType === "BENAR_SALAH") {
    return "TRUE_OR_FALSE";
  }
  if (normalizedType === "MULTIPLE_SELECT") {
    return "MULTIPLE_SELECT";
  }
  if (normalizedType === "REORDER" || normalizedType === "PENGURUTAN") {
    return "REORDER";
  }
  if (normalizedType === "MATCHING" || normalizedType === "MENJODOHKAN") {
    return "MATCHING";
  }

  // 2. Multiple select check
  if (Array.isArray(rawQ.correct_answers) && rawQ.correct_answers.length > 1) {
    return "MULTIPLE_SELECT";
  }

  // 3. Fill in the blanks heuristics
  const hasBlankMarker = /\[(?:_{2,}|\.{2,}|\s*_{2,}\s*)\]|_{3,}|\.{3,}/.test(qText);
  const hasBlanksKeywords = Array.isArray(rawQ.blanks_keywords) && rawQ.blanks_keywords.length > 0;

  const isDummyOptions = (opts: any[]) => {
    if (!Array.isArray(opts) || opts.length === 0) return true;
    const genericCount = opts.filter((o) => {
      const str = typeof o === "string" ? o : o.text || "";
      return /^(Option\s*[A-D]|Pilihan\s*[A-D])$/i.test(str.trim());
    }).length;
    return genericCount >= opts.length;
  };

  const optionsEmptyOrDummy = !rawQ.options || rawQ.options.length === 0 || isDummyOptions(rawQ.options);

  if (hasBlanksKeywords) {
    return "FILL_IN_THE_BLANKS";
  }

  if (hasBlankMarker && optionsEmptyOrDummy) {
    return "FILL_IN_THE_BLANKS";
  }

  if (
    optionsEmptyOrDummy &&
    (/^(isilah|lengkapilah|titik-titik|sebutkan)/i.test(qText.trim()) || qText.includes("....") || qText.includes("____"))
  ) {
    return "FILL_IN_THE_BLANKS";
  }

  // If no options exist at all
  if (!rawQ.options || rawQ.options.length === 0) {
    if (qText.length > 80 || /^(jelaskan|bagaimanakah|mengapa|uraikan)/i.test(qText.trim())) {
      return "OPEN_ENDED";
    }
    return "FILL_IN_THE_BLANKS";
  }

  return "MULTIPLE_CHOICE";
}

/**
 * Enriches parsed questions from Gemini with real extracted images for questions and options
 */
export async function enrichQuestionsWithImages(
  rawQuestions: RawQuestionData[],
  pdfBuffer: Buffer
): Promise<ParsedQuestion[]> {
  const { pdftoppm, pdfimages } = await checkPopplerAvailable();

  // If poppler is unavailable, return basic mapping without crashing
  if (!pdftoppm && !pdfimages) {
    console.warn("[pdfImageExtractor] Neither pdftoppm nor pdfimages is installed on host.");
    return rawQuestions.map((q, idx) => mapToBasicParsedQuestion(q, idx));
  }

  // Page buffer cache so each page is rendered at most once per request
  const pageCache = new Map<number, Buffer | null>();

  const getRenderedPage = async (pageNum: number): Promise<Buffer | null> => {
    const pageKey = Math.max(1, pageNum);
    if (pageCache.has(pageKey)) {
      return pageCache.get(pageKey)!;
    }
    const buf = await renderPdfPage(pdfBuffer, pageKey);
    pageCache.set(pageKey, buf);
    return buf;
  };

  // Pre-extract embedded images if needed as fallback
  let embeddedImages: string[] | null = null;
  let embeddedImgIndex = 0;

  const result: ParsedQuestion[] = [];

  for (let qIdx = 0; qIdx < rawQuestions.length; qIdx++) {
    const rawQ = rawQuestions[qIdx];
    const pageNum = rawQ.page_number || 1;
    const detectedType = detectQuestionType(rawQ);

    let questionImageUrl: string | null = null;
    let questionSourceType: ImageSourceType = "NONE";
    let questionAltText: string | null = rawQ.diagram_description || null;

    // 1. Extract Question Diagram Image
    if (rawQ.has_diagram) {
      // Try Bounding Box Cropping first
      if (rawQ.diagram_box && Array.isArray(rawQ.diagram_box) && rawQ.diagram_box.length === 4) {
        const pageBuf = await getRenderedPage(pageNum);
        if (pageBuf) {
          const croppedUri = await cropImageFromPage(pageBuf, rawQ.diagram_box, { maxWidth: 800 });
          if (croppedUri) {
            questionImageUrl = croppedUri;
            questionSourceType = "PASTE_UPLOAD";
            questionAltText = rawQ.diagram_description || `Diagram Soal #${qIdx + 1}`;
          }
        }
      }

      // If bounding box crop was not available or failed, try embedded images fallback
      if (!questionImageUrl && pdfimages) {
        if (!embeddedImages) {
          embeddedImages = await extractEmbeddedImages(pdfBuffer);
        }
        if (embeddedImages.length > embeddedImgIndex) {
          questionImageUrl = embeddedImages[embeddedImgIndex++];
          questionSourceType = "PASTE_UPLOAD";
          questionAltText = rawQ.diagram_description || `Gambar Soal #${qIdx + 1}`;
        }
      }
    }

    // 2. Handle options and question type logic
    let questionText = rawQ.question_text || `Soal #${qIdx + 1}`;
    const optionStrings: string[] = [];
    const optionItems: QuestionOptionItem[] = [];
    let blanksKeywords: string[] = rawQ.blanks_keywords || [];
    let rubric: string[] = rawQ.rubric || [];

    if (detectedType === "FILL_IN_THE_BLANKS") {
      // Standardize blank marker to [___]
      if (/\[(?:_{2,}|\.{2,}|\s*_{2,}\s*)\]|_{3,}|\.{3,}/.test(questionText)) {
        questionText = questionText.replace(/\[(?:_{2,}|\.{2,}|\s*_{2,}\s*)\]|_{3,}|\.{3,}/g, "[___]");
      } else if (!questionText.includes("[___]")) {
        questionText = `${questionText.trim()} [___]`;
      }

      // Extract keywords if empty
      if (blanksKeywords.length === 0) {
        if (rawQ.explanation) {
          const match = rawQ.explanation.match(/(?:jawaban|kunci|jawabannya|isinya)[\s:]+([^\n.,;]+)/i);
          if (match && match[1]) {
            blanksKeywords = [match[1].trim()];
          }
        }
        if (blanksKeywords.length === 0 && Array.isArray(rawQ.options) && rawQ.options.length > 0) {
          const correctIdx = rawQ.correct_answer_index ?? 0;
          const optVal = rawQ.options[correctIdx];
          const optStr = typeof optVal === "string" ? optVal : optVal?.text || "";
          if (optStr && !/^(Option\s*[A-D]|Pilihan\s*[A-D])$/i.test(optStr.trim())) {
            blanksKeywords = [optStr.trim()];
          }
        }
      }
      // DO NOT FORCE MULTIPLE CHOICE: options and option_items remain []
    } else if (detectedType === "OPEN_ENDED") {
      if (rubric.length === 0 && rawQ.explanation) {
        rubric = [rawQ.explanation.trim()];
      }
      // options and option_items remain []
    } else {
      // MULTIPLE_CHOICE, MULTIPLE_SELECT, TRUE_OR_FALSE
      const rawOptions = Array.isArray(rawQ.options) && rawQ.options.length > 0
        ? rawQ.options
        : (detectedType === "TRUE_OR_FALSE" ? ["Benar", "Salah"] : ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]);

      for (let oIdx = 0; oIdx < rawOptions.length; oIdx++) {
        const rawOpt = rawOptions[oIdx];
        const optLetter = String.fromCharCode(65 + oIdx);
        const isCorrect = Array.isArray(rawQ.correct_answers)
          ? rawQ.correct_answers.includes(oIdx)
          : rawQ.correct_answer_index === oIdx;

        if (typeof rawOpt === "string") {
          // Plain string option
          optionStrings.push(rawOpt);
          optionItems.push({
            option_letter: optLetter,
            text: rawOpt,
            image_source_type: "NONE",
            image_url: "",
            alt_text: "",
            is_correct: isCorrect,
          });
        } else {
          // Structured option object
          const optText = rawOpt.text || "";
          let optImageUrl = "";
          let optSourceType: ImageSourceType = "NONE";
          let optAltText = rawOpt.image_description || "";

          const optPage = rawOpt.page_number || pageNum;

          // Try Bounding Box Cropping for Option Image
          if (rawOpt.has_image && rawOpt.image_box && Array.isArray(rawOpt.image_box) && rawOpt.image_box.length === 4) {
            const pageBuf = await getRenderedPage(optPage);
            if (pageBuf) {
              const croppedUri = await cropImageFromPage(pageBuf, rawOpt.image_box, { maxWidth: 500 });
              if (croppedUri) {
                optImageUrl = croppedUri;
                optSourceType = "PASTE_UPLOAD";
                optAltText = rawOpt.image_description || `Gambar Opsi ${optLetter}`;
              }
            }
          }

          // If option has_image was true but bounding box failed, check embedded images
          if (rawOpt.has_image && !optImageUrl && pdfimages) {
            if (!embeddedImages) {
              embeddedImages = await extractEmbeddedImages(pdfBuffer);
            }
            if (embeddedImages.length > embeddedImgIndex) {
              optImageUrl = embeddedImages[embeddedImgIndex++];
              optSourceType = "PASTE_UPLOAD";
              optAltText = rawOpt.image_description || `Gambar Opsi ${optLetter}`;
            }
          }

          optionStrings.push(optText);
          optionItems.push({
            option_letter: rawOpt.option_letter || optLetter,
            text: optText,
            image_source_type: optSourceType,
            image_url: optImageUrl,
            alt_text: optAltText,
            is_correct: isCorrect,
          });
        }
      }
    }

    result.push({
      question_text: questionText,
      question_type: detectedType,
      options: optionStrings,
      option_items: optionItems,
      correct_answer_index: typeof rawQ.correct_answer_index === "number" ? rawQ.correct_answer_index : 0,
      correct_answers: Array.isArray(rawQ.correct_answers) ? rawQ.correct_answers : [rawQ.correct_answer_index ?? 0],
      blanks_keywords: blanksKeywords,
      rubric: rubric,
      explanation: rawQ.explanation || "",
      has_diagram: rawQ.has_diagram || !!questionImageUrl,
      image_url: questionImageUrl,
      image_source_type: questionSourceType,
      alt_text: questionAltText,
    });
  }

  return result;
}

function mapToBasicParsedQuestion(rawQ: RawQuestionData, idx: number): ParsedQuestion {
  const detectedType = detectQuestionType(rawQ);
  let questionText = rawQ.question_text || `Soal #${idx + 1}`;

  if (detectedType === "FILL_IN_THE_BLANKS") {
    if (/\[(?:_{2,}|\.{2,}|\s*_{2,}\s*)\]|_{3,}|\.{3,}/.test(questionText)) {
      questionText = questionText.replace(/\[(?:_{2,}|\.{2,}|\s*_{2,}\s*)\]|_{3,}|\.{3,}/g, "[___]");
    } else if (!questionText.includes("[___]")) {
      questionText = `${questionText.trim()} [___]`;
    }

    return {
      question_text: questionText,
      question_type: "FILL_IN_THE_BLANKS",
      options: [],
      option_items: [],
      blanks_keywords: rawQ.blanks_keywords || [],
      correct_answer_index: 0,
      explanation: rawQ.explanation || "",
      has_diagram: !!rawQ.has_diagram,
      image_url: null,
    };
  }

  if (detectedType === "OPEN_ENDED") {
    return {
      question_text: questionText,
      question_type: "OPEN_ENDED",
      options: [],
      option_items: [],
      rubric: rawQ.rubric || [],
      correct_answer_index: 0,
      explanation: rawQ.explanation || "",
      has_diagram: !!rawQ.has_diagram,
      image_url: null,
    };
  }

  const options = Array.isArray(rawQ.options) && rawQ.options.length > 0
    ? rawQ.options.map((opt) => (typeof opt === "string" ? opt : opt.text || ""))
    : (detectedType === "TRUE_OR_FALSE" ? ["Benar", "Salah"] : ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]);

  return {
    question_text: questionText,
    question_type: detectedType,
    options,
    correct_answer_index: typeof rawQ.correct_answer_index === "number" ? rawQ.correct_answer_index : 0,
    correct_answers: Array.isArray(rawQ.correct_answers) ? rawQ.correct_answers : [rawQ.correct_answer_index ?? 0],
    explanation: rawQ.explanation || "",
    has_diagram: !!rawQ.has_diagram,
    image_url: null,
  };
}
