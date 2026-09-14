// scripts/test-distractors-e2e.mjs
// Automated test suite for Smart Options & Distractor Generator

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

async function assert(testName, fn) {
  process.stdout.write(`⏳ [DISTRACTOR-TEST] ${testName}... `);
  try {
    await fn();
    console.log("✅ PASSED");
    passed++;
  } catch (err) {
    console.log("❌ FAILED");
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log("🚀 Running Smart Options & Distractor Generator Verification Suite...\n");

  // Test 1: Validation failure on missing fields
  await assert("1. Validation error on missing required fields", async () => {
    const res = await fetch(`${BASE_URL}/api/generate-distractors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_text: "Apa ibu kota Indonesia?",
        // missing correct_answer
      }),
    });

    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    if (!data.error) throw new Error("Expected error message in response");
  });

  // Test 2: Standard 4 options generation (Biology topic)
  await assert("2. Standard 4 options generation for Biology question", async () => {
    const res = await fetch(`${BASE_URL}/api/generate-distractors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_text: "Bagian sel tumbuhan yang berfungsi sebagai tempat berlangsungnya fotosintesis adalah...",
        correct_answer: "Kloroplas",
        option_count: 4,
        target_age: "SMP (12-15 tahun)"
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status !== "success") throw new Error(`Expected status 'success', got '${data.status}'`);
    if (!Array.isArray(data.generated_options)) throw new Error("generated_options must be an array");
    if (data.generated_options.length !== 4) throw new Error(`Expected 4 options, got ${data.generated_options.length}`);

    const letters = ["A", "B", "C", "D"];
    let correctCount = 0;

    data.generated_options.forEach((opt, idx) => {
      if (opt.option_letter !== letters[idx]) throw new Error(`Option letter mismatch: expected ${letters[idx]}, got ${opt.option_letter}`);
      if (!opt.option_text || typeof opt.option_text !== "string") throw new Error(`Option text missing at index ${idx}`);
      if (typeof opt.is_correct !== "boolean") throw new Error(`is_correct must be boolean at index ${idx}`);
      if (!opt.distractor_analysis || typeof opt.distractor_analysis !== "string") {
        throw new Error(`distractor_analysis missing or not string at index ${idx}`);
      }
      if (opt.is_correct) {
        correctCount++;
        if (!opt.option_text.toLowerCase().includes("kloroplas")) {
          console.warn(`[Note] Correct answer text '${opt.option_text}' might vary from input 'Kloroplas'`);
        }
      }
    });

    if (correctCount !== 1) throw new Error(`Expected exactly 1 correct answer, got ${correctCount}`);
  });

  // Test 3: Custom option count: 3 options (A, B, C)
  await assert("3. Custom option count (3 options: A, B, C)", async () => {
    const res = await fetch(`${BASE_URL}/api/generate-distractors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_text: "Planet terdekat dari Matahari dalam tata surya kita adalah...",
        correct_answer: "Merkurius",
        option_count: 3
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.generated_options.length !== 3) throw new Error(`Expected 3 options, got ${data.generated_options.length}`);
    if (data.generated_options[0].option_letter !== "A" ||
        data.generated_options[1].option_letter !== "B" ||
        data.generated_options[2].option_letter !== "C") {
      throw new Error("Option letters should be A, B, C");
    }

    const correctCount = data.generated_options.filter(o => o.is_correct).length;
    if (correctCount !== 1) throw new Error(`Expected 1 correct option, got ${correctCount}`);
  });

  // Test 4: Custom option count: 5 options (A, B, C, D, E)
  await assert("4. Custom option count (5 options: A, B, C, D, E)", async () => {
    const res = await fetch(`${BASE_URL}/api/generate-distractors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_text: "Gas utama yang menyebabkan efek rumah kaca di atmosfer bumi adalah...",
        correct_answer: "Karbon dioksida (CO2)",
        option_count: 5
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.generated_options.length !== 5) throw new Error(`Expected 5 options, got ${data.generated_options.length}`);
    if (data.generated_options[4].option_letter !== "E") {
      throw new Error("5th option should have letter E");
    }
  });

  // Test 5: Educational Analysis validation (must contain pedagogical reasoning)
  await assert("5. Distractor analysis contains pedagogical justification", async () => {
    const res = await fetch(`${BASE_URL}/api/generate-distractors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_text: "Proses perubahan wujud benda dari cair menjadi gas disebut...",
        correct_answer: "Menguap",
        option_count: 4
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const distractors = data.generated_options.filter(o => !o.is_correct);
    if (distractors.length !== 3) throw new Error("Expected 3 distractors");

    for (const d of distractors) {
      if (!d.distractor_analysis || d.distractor_analysis.length < 10) {
        throw new Error(`Distractor analysis too short or empty for '${d.option_text}': ${d.distractor_analysis}`);
      }
    }
  });

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
