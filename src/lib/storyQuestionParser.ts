/**
 * Story & Question Stimulus Parser for Elementary School (SD) Ergonomics
 * Splits dense reading passages (wacana/cerita) from the actual question prompt,
 * and formats long walls of text into clean, digestible paragraphs.
 */

export interface ParsedStimulus {
  isStory: boolean;
  storyParagraphs: string[];
  questionPrompt: string;
}

export function parseQuestionStimulus(fullText: string): ParsedStimulus {
  if (!fullText || !fullText.trim()) {
    return { isStory: false, storyParagraphs: [], questionPrompt: "" };
  }

  const cleanText = fullText.trim();

  // 1. If text already contains explicit newlines (\n\n or \n)
  const explicitLines = cleanText
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (explicitLines.length > 1) {
    const lastLine = explicitLines[explicitLines.length - 1];
    const isLastQuestion =
      lastLine.endsWith("?") ||
      lastLine.includes("....") ||
      lastLine.includes("____") ||
      lastLine.includes("[___]") ||
      /(?:menurut|berdasarkan|sesuai|adalah|upaya|manakah|mengapa|bagaimana|apa|siapa|pernyataan|kesimpulan)/i.test(lastLine);

    if (isLastQuestion && explicitLines.length >= 2) {
      return {
        isStory: true,
        storyParagraphs: explicitLines.slice(0, -1),
        questionPrompt: lastLine,
      };
    }

    return {
      isStory: true,
      storyParagraphs: explicitLines.slice(0, -1),
      questionPrompt: lastLine,
    };
  }

  // 2. If single dense string without newlines (common from PDF OCR)
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // If there are at least 2 sentences and text is > 100 chars
  if (sentences.length >= 2 && cleanText.length > 90) {
    const lastSentence = sentences[sentences.length - 1];
    const isQuestionPrompt =
      lastSentence.endsWith("?") ||
      lastSentence.includes("....") ||
      lastSentence.includes("____") ||
      lastSentence.includes("[___]") ||
      /(?:menurut|berdasarkan|sesuai|adalah|upaya|langkah|tujuan|sikap|hal|manakah|mengapa|bagaimana|apa|siapa|pernyataan|kesimpulan)/i.test(
        lastSentence
      );

    if (isQuestionPrompt) {
      const storySentences = sentences.slice(0, -1);
      const storyParagraphs: string[] = [];

      // Group sentences into bite-sized paragraphs (1-2 sentences each for easy reading by kids)
      for (let i = 0; i < storySentences.length; i += 2) {
        const chunk = storySentences.slice(i, i + 2).join(" ");
        storyParagraphs.push(chunk);
      }

      return {
        isStory: true,
        storyParagraphs,
        questionPrompt: lastSentence,
      };
    }
  }

  // 3. Fallback: single standard question
  return {
    isStory: false,
    storyParagraphs: [],
    questionPrompt: cleanText,
  };
}
