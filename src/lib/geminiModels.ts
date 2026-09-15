/**
 * Helper to dynamically list and resolve active Gemini models for a given API key.
 * Calls ModelService.ListModels so we never get 404 Model Not Found errors.
 */
export async function getActiveGeminiModels(
  apiKey: string,
  preferredModel?: string | null
): Promise<string[]> {
  const discovered: string[] = [];

  if (apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          for (const m of data.models) {
            if (
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes("generateContent")
            ) {
              const name = (m.name || "").replace(/^models\//, "");
              if (name) {
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
      console.warn("[GeminiModels] Could not dynamically list models:", err);
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

    const cleanPreferred = preferredModel?.trim().replace(/^models\//, "");
    if (cleanPreferred && discovered.includes(cleanPreferred)) {
      return [cleanPreferred, ...sorted.filter((m) => m !== cleanPreferred)];
    }
    return sorted;
  }

  // Fallback list prioritizing recommended newer models
  const fallback = [
    preferredModel?.trim().replace(/^models\//, ""),
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro",
  ].filter(Boolean) as string[];

  return Array.from(new Set(fallback));
}
