// scripts/test-image-assets-e2e.mjs
import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("🚀 Starting Image Asset Management & Core AI Engine E2E Verification...\n");

  let passed = 0;
  let failed = 0;

  // TEST 1: PASTE_UPLOAD with Base64 data string + Rule 2 (No Text Mixing) & Rule 3 (Alt Text)
  try {
    console.log("TEST 1: PASTE_UPLOAD (Base64 string) & Structural Separation...");
    const sampleBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    // Simulating user typing question text that accidentally contains the base64 URL
    const payload = {
      id_soal: "soal-img-001",
      tipe_soal: "MULTIPLE_CHOICE",
      question_text: `Perhatikan diagram sel berikut ini: ${sampleBase64} Bagian manakah yang berfungsi sebagai penghasil energi?`,
      image_source_type: "PASTE_UPLOAD",
      options: [
        { text: "Mitokondria", is_correct: true },
        { text: "Ribosom", is_correct: false },
        { text: "Badan Golgi", is_correct: false },
        { text: "Nukleus", is_correct: false },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/process-question-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();

    // Check mandatory JSON schema keys
    assert.strictEqual(data.id_soal, "soal-img-001");
    assert.strictEqual(data.tipe_soal, "MULTIPLE_CHOICE");
    assert.ok(data.question, "Missing question object");
    assert.ok(Array.isArray(data.options), "options must be an array");

    // Rule 1: Identification
    assert.strictEqual(data.question.image_source_type, "PASTE_UPLOAD");

    // Rule 2: Pemisahan Data Struktur (No Text Mixing)
    assert.ok(!data.question.text.includes("data:image/png;base64"), "Question text must NOT contain base64 string");
    assert.ok(data.question.image_url.startsWith("data:image/png;base64"), "image_url must contain the extracted base64");

    // Rule 3: Otomatisasi Aksesibilitas (Alt Text)
    assert.ok(data.question.alt_text.length > 5, "alt_text must be automatically populated with educational description");
    console.log(`   Generated alt_text: "${data.question.alt_text}"`);

    // Check options
    assert.strictEqual(data.options.length, 4);
    assert.strictEqual(data.options[0].option_letter, "A");
    assert.strictEqual(data.options[0].is_correct, true);
    assert.strictEqual(data.options[1].is_correct, false);

    console.log("   ✅ TEST 1 PASSED\n");
    passed++;
  } catch (err) {
    console.error("   ❌ TEST 1 FAILED:", err.message);
    failed++;
  }

  // TEST 2: DIRECT_LINK with Internet URL & Explicit Alt Text
  try {
    console.log("TEST 2: DIRECT_LINK (Direct URL) with explicit alt text...");
    const sampleUrl = "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800";
    
    const payload = {
      id_soal: "soal-img-002",
      tipe_soal: "MULTIPLE_CHOICE",
      question_text: "Perhatikan peta persebaran flora dan fauna berikut. Garis Wallace memisahkan tipe fauna apa?",
      image_source_type: "DIRECT_LINK",
      image_url: sampleUrl,
      alt_text: "Peta biogeografi Indonesia dengan garis pembagi Wallace dan Weber",
      options: [
        { text: "Asiatis dan Peralihan", is_correct: true },
        { text: "Australis dan Peralihan", is_correct: false },
        { text: "Asiatis dan Australis", is_correct: false },
        { text: "Hanya tipe sabana", is_correct: false },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/process-question-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.question.image_source_type, "DIRECT_LINK");
    assert.strictEqual(data.question.image_url, sampleUrl);
    assert.strictEqual(data.question.alt_text, "Peta biogeografi Indonesia dengan garis pembagi Wallace dan Weber");
    assert.strictEqual(data.options[0].is_correct, true);

    console.log("   ✅ TEST 2 PASSED\n");
    passed++;
  } catch (err) {
    console.error("   ❌ TEST 2 FAILED:", err.message);
    failed++;
  }

  // TEST 3: GOOGLE_IMAGE_SEARCH simulation
  try {
    console.log("TEST 3: GOOGLE_IMAGE_SEARCH method tracking...");
    const sampleSearchUrl = "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800";

    const payload = {
      id_soal: "soal-img-003",
      tipe_soal: "MULTIPLE_SELECT",
      question_text: "Berdasarkan gambar siklus hidrologi, pilihlah dua tahapan penguapan air ke atmosfer!",
      image_source_type: "GOOGLE_IMAGE_SEARCH",
      image_url: sampleSearchUrl,
      options: [
        { text: "Evaporasi", is_correct: true },
        { text: "Transpirasi", is_correct: true },
        { text: "Kondensasi", is_correct: false },
        { text: "Presipitasi", is_correct: false },
        { text: "Infiltrasi", is_correct: false },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/process-question-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.question.image_source_type, "GOOGLE_IMAGE_SEARCH");
    assert.strictEqual(data.question.image_url, sampleSearchUrl);
    assert.ok(data.question.alt_text.length > 0, "Alt text should be present");
    assert.strictEqual(data.options.length, 5);
    assert.strictEqual(data.options[0].is_correct, true);
    assert.strictEqual(data.options[1].is_correct, true);

    console.log("   ✅ TEST 3 PASSED\n");
    passed++;
  } catch (err) {
    console.error("   ❌ TEST 3 FAILED:", err.message);
    failed++;
  }

  // TEST 4: Rule 4 - HANDLING OPSI GAMBAR MURNI (Image-Only Options)
  try {
    console.log("TEST 4: Image-Only Options (text: \"\", image_url populated, is_correct boolean)...");

    const payload = {
      id_soal: "soal-img-004",
      tipe_soal: "MULTIPLE_CHOICE",
      question_text: "Manakah di antara bangun geometri berikut yang memiliki simetri putar tingkat empat?",
      image_source_type: "NONE",
      image_url: "",
      options: [
        {
          option_letter: "A",
          text: "", // PURE IMAGE OPTION
          image_source_type: "PASTE_UPLOAD",
          image_url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400",
          alt_text: "Gambar bujur sangkar / persegi sempurna",
          is_correct: true,
        },
        {
          option_letter: "B",
          text: "", // PURE IMAGE OPTION
          image_source_type: "DIRECT_LINK",
          image_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400",
          alt_text: "Gambar segitiga sama sisi",
          is_correct: false,
        },
        {
          option_letter: "C",
          text: "Lingkaran tanpa sudut", // Hybrid option (text + image)
          image_source_type: "GOOGLE_IMAGE_SEARCH",
          image_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400",
          alt_text: "Gambar lingkaran sempurna",
          is_correct: false,
        },
        {
          option_letter: "D",
          text: "Trapesium sama kaki", // Text only option
          image_source_type: "NONE",
          image_url: "",
          alt_text: "",
          is_correct: false,
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/process-question-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();

    // Verify pure image option A
    assert.strictEqual(data.options[0].text, "", "Pure image option text MUST be empty string");
    assert.strictEqual(data.options[0].image_source_type, "PASTE_UPLOAD");
    assert.ok(data.options[0].image_url.includes("unsplash"), "Option image_url preserved");
    assert.strictEqual(data.options[0].is_correct, true);

    // Verify pure image option B
    assert.strictEqual(data.options[1].text, "", "Pure image option text MUST be empty string");
    assert.strictEqual(data.options[1].is_correct, false);

    // Verify hybrid option C
    assert.strictEqual(data.options[2].text, "Lingkaran tanpa sudut");
    assert.strictEqual(data.options[2].image_source_type, "GOOGLE_IMAGE_SEARCH");

    // Verify text-only option D
    assert.strictEqual(data.options[3].text, "Trapesium sama kaki");
    assert.strictEqual(data.options[3].image_source_type, "NONE");

    console.log("   ✅ TEST 4 PASSED\n");
    passed++;
  } catch (err) {
    console.error("   ❌ TEST 4 FAILED:", err.message);
    failed++;
  }

  // TEST 5: Rule 5 - RETENSI DATA SAAT KONVERSI (Lossless Asset Migration) via convert-question API
  try {
    console.log("TEST 5: Lossless Asset Migration on Question Conversion...");

    const sourceQuestion = {
      id: "q-conv-test",
      quiz_id: "quiz-test",
      question_type: "MULTIPLE_CHOICE",
      question_text: "Perhatikan struktur organel sel kloroplas berikut. Di manakah terjadinya reaksi gelap?",
      image_url: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800",
      image_source_type: "DIRECT_LINK",
      alt_text: "Diagram kloroplas memperlihatkan stroma dan tilakoid",
      options: ["Stroma", "Grana", "Tilakoid", "Membran Luar"],
      correct_answer_index: 0,
      order_index: 0,
    };

    const convRes = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: sourceQuestion,
        target_type: "MULTIPLE_SELECT",
      }),
    });

    assert.strictEqual(convRes.status, 200);
    const convData = await convRes.json();

    assert.strictEqual(convData.converted_question.question_type, "MULTIPLE_SELECT");
    // Rule 5 validation
    assert.strictEqual(convData.converted_question.image_url, sourceQuestion.image_url, "image_url MUST be retained lossless");
    assert.strictEqual(convData.converted_question.image_source_type, "DIRECT_LINK", "image_source_type MUST be retained");
    assert.strictEqual(convData.converted_question.alt_text, sourceQuestion.alt_text, "alt_text MUST be retained");

    console.log("   ✅ TEST 5 PASSED\n");
    passed++;
  } catch (err) {
    console.error("   ❌ TEST 5 FAILED:", err.message);
    failed++;
  }

  // TEST 6: Strict JSON Output Schema Compliance
  try {
    console.log("TEST 6: Strict JSON Output Schema Compliance...");
    const testPayload = {
      id_soal: "SCHEMA_VERIFY_999",
      tipe_soal: "MULTIPLE_CHOICE",
      question_text: "Apa nama organ tumbuhan penyerap air?",
      options: [
        { text: "Akar", is_correct: true },
        { text: "Batang", is_correct: false },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/process-question-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    const json = await res.json();
    const expectedRootKeys = ["id_soal", "tipe_soal", "question", "options"];
    assert.deepStrictEqual(Object.keys(json).sort(), expectedRootKeys.sort(), "Root keys must strictly match schema");

    const expectedQuestionKeys = ["text", "image_source_type", "image_url", "alt_text"];
    assert.deepStrictEqual(Object.keys(json.question).sort(), expectedQuestionKeys.sort(), "Question keys must strictly match schema");

    const expectedOptionKeys = ["option_letter", "text", "image_source_type", "image_url", "alt_text", "is_correct"];
    assert.deepStrictEqual(Object.keys(json.options[0]).sort(), expectedOptionKeys.sort(), "Option keys must strictly match schema");

    console.log("   ✅ TEST 6 PASSED\n");
    passed++;
  } catch (err) {
    console.error("   ❌ TEST 6 FAILED:", err.message);
    failed++;
  }

  console.log("=========================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test runner failure:", err);
  process.exit(1);
});
