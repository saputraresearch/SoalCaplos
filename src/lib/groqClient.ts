/**
 * Groq Cloud AI Client
 * Provides ultra-fast inference (<1s) and high rate limits (30 RPM free tier).
 * Uses LLaMA 3.3 70B for text extraction and LLaMA 3.2 11B Vision for scanned documents.
 */

export async function parseQuizWithGroqText(
  fullText: string,
  systemPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `DOKUMEN SOAL (Teks digital resmi hasil ekstraksi dokumen PDF):\n\n${fullText}\n\nInstruksi: Ekstrak seluruh butir soal, pilihan jawaban (A, B, C, D), nomor soal, dan kunci jawaban/pembahasan ke dalam struktur JSON yang diminta. Wajib kembalikan format JSON murni.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return { success: false, error: `Groq API returned HTTP ${response.status}: ${errBody}` };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: "Groq returned empty response." };
    }

    const parsed = JSON.parse(content);
    return { success: true, data: parsed };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function parseQuizWithGroqVision(
  jpegBase64Images: string[],
  systemPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const contentParts: any[] = [
      {
        type: "text",
        text: "Ekstrak seluruh soal, opsi jawaban (A, B, C, D), nomor soal, dan kunci jawaban dari halaman-halaman dokumen ujian berikut ke dalam struktur JSON yang diminta.",
      },
    ];

    for (const b64 of jpegBase64Images) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`,
        },
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentParts },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(50000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return { success: false, error: `Groq Vision returned HTTP ${response.status}: ${errBody}` };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: "Groq Vision returned empty response." };
    }

    const parsed = JSON.parse(content);
    return { success: true, data: parsed };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function generateQuizWithGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return { success: false, error: `Groq API returned HTTP ${response.status}: ${errBody}` };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: "Groq returned empty response." };
    }

    const parsed = JSON.parse(content);
    return { success: true, data: parsed };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
