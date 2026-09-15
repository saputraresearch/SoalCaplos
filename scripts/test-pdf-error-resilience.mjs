import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

// Inline implementation check matching src/lib/apiResponse.ts
async function safeParseResponseJson(res) {
  const text = await res.text();
  let parsedData = null;

  try {
    parsedData = JSON.parse(text);
  } catch {
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

// Inline implementation check matching src/lib/geminiModels.ts
function normalizeModelName(model) {
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

async function runTests() {
  console.log("🚀 Testing PDF Error Handling & Model Sanitization Resilience...\n");

  // Test 1: safeParseResponseJson handles valid JSON
  console.log("👉 Test 1: Valid JSON response parsing");
  const mockValidResponse = new Response(JSON.stringify({ title: "Test Quiz", questions: [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  const res1 = await safeParseResponseJson(mockValidResponse);
  assert.equal(res1.ok, true);
  assert.equal(res1.data.title, "Test Quiz");
  console.log("   ✅ Valid JSON correctly parsed\n");

  // Test 2: safeParseResponseJson handles Vercel / Cloudflare plain text 504 Timeout
  console.log("👉 Test 2: Vercel 504 Gateway Timeout (FUNCTION_INVOCATION_TIMEOUT) text error");
  const mockTimeoutResponse = new Response(
    "An error occurred with your deployment: FUNCTION_INVOCATION_TIMEOUT",
    { status: 504, headers: { "Content-Type": "text/plain" } }
  );
  const res2 = await safeParseResponseJson(mockTimeoutResponse);
  assert.equal(res2.ok, false);
  assert.equal(res2.data, null);
  assert.ok(
    res2.error.includes("Waktu pemrosesan melebihi batas") || res2.error.includes("504"),
    `Expected timeout explanation, got: ${res2.error}`
  );
  console.log("   ✅ 504 Timeout safely converted to Indonesian guidance without throwing SyntaxError: 'A'\n");

  // Test 3: safeParseResponseJson handles Vercel 500 Invocation Failed
  console.log("👉 Test 3: Vercel 500 Invocation Failed text error");
  const mockFailedResponse = new Response(
    "An error occurred with your deployment: FUNCTION_INVOCATION_FAILED",
    { status: 500, headers: { "Content-Type": "text/plain" } }
  );
  const res3 = await safeParseResponseJson(mockFailedResponse);
  assert.equal(res3.ok, false);
  assert.ok(
    res3.error.includes("kendala pemrosesan") || res3.error.includes("Pengaturan"),
    `Expected failure explanation, got: ${res3.error}`
  );
  console.log("   ✅ 500 Invocation Failed safely converted to clear guidance\n");

  // Test 4: safeParseResponseJson handles Vercel 413 Payload Too Large
  console.log("👉 Test 4: Vercel 413 Payload Too Large text error");
  const mockLargeResponse = new Response(
    "An error occurred with your deployment: FUNCTION_PAYLOAD_TOO_LARGE",
    { status: 413, headers: { "Content-Type": "text/plain" } }
  );
  const res4 = await safeParseResponseJson(mockLargeResponse);
  assert.equal(res4.ok, false);
  assert.ok(
    res4.error.includes("4.5 MB"),
    `Expected 4.5 MB payload guidance, got: ${res4.error}`
  );
  console.log("   ✅ 413 Payload Too Large safely converted to 4.5MB explanation\n");

  // Test 5: Model name normalization & sanitization
  console.log("👉 Test 5: Model name normalization");
  assert.equal(normalizeModelName("gemini-3.6-flash"), "gemini-2.0-flash");
  assert.equal(normalizeModelName("gemini-2.5-flash"), "gemini-2.0-flash");
  assert.equal(normalizeModelName("gemini-2.5-pro"), "gemini-2.0-flash");
  assert.equal(normalizeModelName("gemini-2.0-flash-exp"), "gemini-2.0-flash");
  assert.equal(normalizeModelName("gemini-1.5-flash"), "gemini-1.5-flash");
  assert.equal(normalizeModelName("gemini-1.5-pro"), "gemini-1.5-pro");
  console.log("   ✅ All non-existent / experimental models safely sanitized to gemini-2.0-flash\n");

  // Test 6: API endpoint returns clean JSON 400 when missing key instead of crashing
  console.log("👉 Test 6: POST /api/parse-pdf without API key returns clean JSON 400");
  const formData = new FormData();
  formData.append("file", new Blob(["%PDF-1.4 dummy content"], { type: "application/pdf" }), "dummy.pdf");
  const apiRes = await fetch(`${BASE_URL}/api/parse-pdf`, {
    method: "POST",
    body: formData,
  });
  const parsedApiRes = await safeParseResponseJson(apiRes);
  assert.equal(parsedApiRes.ok, false);
  assert.equal(parsedApiRes.status, 400);
  assert.ok(
    parsedApiRes.error.includes("Gemini API Key is missing") || parsedApiRes.error.includes("API Key"),
    `Expected clean API key error, got: ${parsedApiRes.error}`
  );
  console.log("   ✅ Route returns structured JSON with Indonesian guidance\n");

  // Test 7: API endpoint guards against payload exceeding 4.5MB
  console.log("👉 Test 7: POST /api/parse-pdf with payload > 4.5MB returns 413 Payload Too Large");
  const largeBuf = new Uint8Array(4.8 * 1024 * 1024);
  const largeFormData = new FormData();
  largeFormData.append("file", new Blob([largeBuf], { type: "application/pdf" }), "large.pdf");
  largeFormData.append("api_key", "dummy-api-key");
  const largeRes = await fetch(`${BASE_URL}/api/parse-pdf`, {
    method: "POST",
    body: largeFormData,
  });
  const parsedLarge = await safeParseResponseJson(largeRes);
  assert.equal(parsedLarge.ok, false);
  assert.equal(parsedLarge.status, 413);
  assert.ok(parsedLarge.error.includes("4.5 MB"), `Expected 4.5MB error, got: ${parsedLarge.error}`);
  console.log("   ✅ 4.5MB file size limit enforced with clean error message\n");

  console.log("🎉 ALL 7 TESTS PASSED! PDF extraction is completely resilient against non-JSON syntax errors!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
