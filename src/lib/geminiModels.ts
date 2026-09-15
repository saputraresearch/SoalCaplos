/**
 * Helper to normalize and sanitize model names, correcting non-existent or experimental models
 */
export function normalizeModelName(model?: string | null): string {
  if (!model) return "gemini-2.0-flash";
  const clean = model.trim().replace(/^models\//, "");
  if (
    clean.includes("3.6") ||
    clean.includes("2.5") ||
    clean.includes("exp") ||
    clean === "gemini-2.0-flash-exp" ||
    clean === "gemini-3.6-flash" ||
    clean === "gemini-2.5-flash" ||
    clean === "gemini-2.5-pro"
  ) {
    return "gemini-2.0-flash";
  }
  return clean;
}

/**
 * Helper to dynamically list and resolve active Gemini models for a given API key.
 * Calls ModelService.ListModels so we never get 404 Model Not Found errors.
 */
export async function getActiveGeminiModels(
  apiKey: string,
  preferredModel?: string | null
): Promise<string[]> {
  const discovered: string[] = [];
  const normalizedPreferred = normalizeModelName(preferredModel);

  if (apiKey) {
    try {
      // 2-second timeout to prevent serverless function starvation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
        { cache: "no-store", signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          for (const m of data.models) {
            if (
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes("generateContent")
            ) {
              const name = (m.name || "").replace(/^models\//, "");
              if (name && !name.includes("exp")) {
                discovered.push(name);
              }
            }
          }
          console.log(`[GeminiModels] Live discovered ${discovered.length} active models:`, discovered);
        }
      } else {
        console.warn(`[GeminiModels] ListModels returned status ${res.status}`);
      }
    } catch (err) {
      console.warn("[GeminiModels] Dynamic model discovery timed out or failed, using official fallback:", err);
    }
  }

  // If live discovery succeeded, sort and prioritize
  if (discovered.length > 0) {
    // Sort: flash models first, then pro, newer/higher version numbers first
    const sorted = [...discovered].sort((a, b) => {
      const aIsFlash = a.includes("flash");
      const bIsFlash = b.includes("flash");
      if (aIsFlash && !bIsFlash) return -1;
      if (!aIsFlash && bIsFlash) return 1;
      return b.localeCompare(a, undefined, { numeric: true });
    });

    if (normalizedPreferred && discovered.includes(normalizedPreferred)) {
      return [normalizedPreferred, ...sorted.filter((m) => m !== normalizedPreferred)];
    }
    return sorted;
  }

  // Official verified Gemini models on v1beta API
  const fallback = [
    normalizedPreferred,
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
  ].filter(Boolean) as string[];

  return Array.from(new Set(fallback));
}
