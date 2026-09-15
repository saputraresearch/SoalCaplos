/**
 * Safely parse JSON from fetch responses.
 * Prevents "Unexpected token 'A', 'An error o'... is not valid JSON" when servers (like Vercel or proxies)
 * return HTML or plain text error pages (504 Timeout, 413 Payload Too Large, 500 Invocation Failed).
 */
export async function safeParseResponseJson<T = any>(
  res: Response
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const text = await res.text();
  let parsedData: any = null;

  try {
    parsedData = JSON.parse(text);
  } catch {
    // Response is NOT valid JSON (HTML or plain text from Vercel / proxy / cloudflare)
    let errorMessage = `Server error (${res.status})`;

    if (
      res.status === 504 ||
      text.includes("FUNCTION_INVOCATION_TIMEOUT") ||
      text.includes("TIMEOUT") ||
      text.toLowerCase().includes("timed out")
    ) {
      errorMessage =
        "Waktu pemrosesan melebihi batas (Server Timeout 504). Dokumen PDF mungkin terlalu panjang atau kompleks. Coba gunakan dokumen dengan jumlah halaman lebih sedikit atau pastikan model 'Gemini 2.0 Flash' aktif di Pengaturan.";
    } else if (
      res.status === 413 ||
      text.includes("FUNCTION_PAYLOAD_TOO_LARGE") ||
      text.includes("PAYLOAD_TOO_LARGE")
    ) {
      errorMessage =
        "Ukuran dokumen PDF terlalu besar (Payload Too Large 413). Batas maksimal serverless adalah 4.5 MB. Silakan kompres atau perkecil PDF Anda terlebih dahulu.";
    } else if (
      text.includes("An error occurred with your deployment") ||
      text.includes("FUNCTION_INVOCATION_FAILED")
    ) {
      errorMessage =
        "Layanan server mengalami kendala pemrosesan (Function Invocation Failed). Pastikan API Key Gemini di Pengaturan valid dan aktif.";
    } else if (text.trim().length > 0) {
      errorMessage = `Respon server (${res.status}): ${text.replace(/<[^>]*>?/gm, "").slice(0, 160).trim()}`;
    }

    return {
      ok: false,
      status: res.status,
      data: null,
      error: errorMessage,
    };
  }

  if (!res.ok || parsedData?.error) {
    return {
      ok: false,
      status: res.status,
      data: parsedData,
      error: parsedData?.error || `Request gagal dengan kode status ${res.status}.`,
    };
  }

  return {
    ok: true,
    status: res.status,
    data: parsedData,
  };
}
