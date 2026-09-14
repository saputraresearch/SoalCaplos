// scripts/test-conversion-e2e.mjs
// Automated test suite for Smart Question Type Conversion rules 1-5

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

async function assert(testName, fn) {
  process.stdout.write(`⏳ [CONVERSION-TEST] ${testName}... `);
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
  console.log("🚀 Running Smart Question Conversion Verification Suite...\n");

  // Rule 1: Conversion to MULTIPLE_CHOICE from MULTIPLE_SELECT
  await assert("1. Rule 1: MULTIPLE_SELECT -> MULTIPLE_CHOICE (single primary key, 4 options)", async () => {
    const res = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "MULTIPLE_CHOICE",
        question: {
          question_text: "Pilihlah hewan mamalia:",
          question_type: "MULTIPLE_SELECT",
          options: ["Kucing", "Lumba-lumba", "Elang", "Katak", "Hiu"],
          correct_answers: [0, 1],
          correct_answer_index: 0,
        },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const q = data.converted_question;
    const r = data.report;

    if (q.question_type !== "MULTIPLE_CHOICE") throw new Error("target type mismatch");
    if (q.options.length !== 4) throw new Error(`Expected 4 options, got ${q.options.length}`);
    if (q.correct_answer_index === undefined || q.correct_answer_index < 0) throw new Error("Invalid correct_answer_index");
    if (q.correct_answers !== undefined) throw new Error("correct_answers should be cleared");
    if (!r.uxChange.includes("radio button")) throw new Error("UX report should mention radio button");
    if (r.status !== "Sukses") throw new Error("Status must be Sukses");
  });

  // Rule 1b: Conversion to MULTIPLE_CHOICE from MATCHING
  await assert("2. Rule 1b: MATCHING -> MULTIPLE_CHOICE (stimulus from pair, correct answer key)", async () => {
    const res = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "MULTIPLE_CHOICE",
        question: {
          question_text: "Jodohkan ibukota negara:",
          question_type: "MATCHING",
          matching_pairs: [
            { left: "Jepang", right: "Tokyo" },
            { left: "Prancis", right: "Paris" },
            { left: "Inggris", right: "London" },
            { left: "Italia", right: "Roma" },
          ],
        },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const q = data.converted_question;
    const r = data.report;

    if (q.question_type !== "MULTIPLE_CHOICE") throw new Error("target type mismatch");
    if (!q.question_text.includes("Jepang")) throw new Error("Question text should contain first stimulus");
    if (q.options[q.correct_answer_index] !== "Tokyo") throw new Error("Correct option should be Tokyo");
    if (q.options.length !== 4) throw new Error("Should have 4 options");
    if (!r.editorNotes.includes("stimulus")) throw new Error("Editor notes must document stimulus selection");
  });

  // Rule 2: Conversion to MULTIPLE_SELECT from MULTIPLE_CHOICE
  await assert("3. Rule 2: MULTIPLE_CHOICE -> MULTIPLE_SELECT (checkbox, recommended 2nd key)", async () => {
    const res = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "MULTIPLE_SELECT",
        question: {
          question_text: "Manakah planet dalam tata surya kita?",
          question_type: "MULTIPLE_CHOICE",
          options: ["Mars", "Bulan", "Matahari", "Komet Halley"],
          correct_answer_index: 0,
        },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const q = data.converted_question;
    const r = data.report;

    if (q.question_type !== "MULTIPLE_SELECT") throw new Error("target type mismatch");
    if (!q.correct_answers || q.correct_answers.length < 2) {
      throw new Error(`Expected at least 2 correct keys, got ${q.correct_answers?.length}`);
    }
    if (!q.correct_answers.includes(0)) throw new Error("Original key 0 must be preserved");
    if (q.options.length < 5) throw new Error("MULTIPLE_SELECT should have 5 options (A-E)");
    if (!r.uxChange.includes("checkbox")) throw new Error("UX report should mention checkbox");
  });

  // Rule 3: Conversion to TRUE_OR_FALSE
  await assert("4. Rule 3: Any -> TRUE_OR_FALSE (declarative sentence, only Benar/Salah)", async () => {
    const res = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "TRUE_OR_FALSE",
        question: {
          question_text: "Apakah fotosintesis menghasilkan oksigen bagi makhluk hidup?",
          question_type: "MULTIPLE_CHOICE",
          options: ["Ya, menghasilkan oksigen", "Tidak", "Hanya malam hari", "Menghasilkan nitrogen"],
          correct_answer_index: 0,
        },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const q = data.converted_question;
    const r = data.report;

    if (q.question_type !== "TRUE_OR_FALSE") throw new Error("target type mismatch");
    if (q.question_text.endsWith("?")) throw new Error("Question mark must be converted to declarative sentence");
    if (q.question_text.toLowerCase().startsWith("apakah")) throw new Error("'Apakah' prefix must be stripped");
    if (q.options.length !== 2 || q.options[0] !== "Benar" || q.options[1] !== "Salah") {
      throw new Error("Options must strictly be ['Benar', 'Salah']");
    }
    if (r.oldType !== "MULTIPLE_CHOICE" || r.newType !== "TRUE_OR_FALSE") {
      throw new Error("Report old/new type mismatch");
    }
  });

  // Rule 4: Conversion to FILL_IN_THE_BLANKS
  await assert("5. Rule 4: Objective -> FILL_IN_THE_BLANKS (substitute keyword with [___])", async () => {
    const res = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "FILL_IN_THE_BLANKS",
        question: {
          question_text: "Gas yang diserap oleh tumbuhan saat fotosintesis adalah Karbondioksida.",
          question_type: "MULTIPLE_CHOICE",
          options: ["Karbondioksida", "Oksigen", "Helium", "Metana"],
          correct_answer_index: 0,
        },
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const q = data.converted_question;
    const r = data.report;

    if (q.question_type !== "FILL_IN_THE_BLANKS") throw new Error("target type mismatch");
    if (!q.question_text.includes("[___]")) throw new Error("Question text must contain [___]");
    if (!q.blanks_keywords || !q.blanks_keywords.includes("Karbondioksida")) {
      throw new Error("Keyword must be Karbondioksida");
    }
    if (!r.uxChange.includes("[___]")) throw new Error("UX report should mention [___]");
  });

  // Rule 5: Conversion to MATCHING and CATEGORIZE_ITEMS
  await assert("6. Rule 5: Objective -> MATCHING & CATEGORIZE_ITEMS (pairs & umbrella categories)", async () => {
    // 5a. MATCHING
    const matchRes = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "MATCHING",
        question: {
          question_text: "Hubungkan organ ekskresi berikut:",
          question_type: "MULTIPLE_CHOICE",
          options: ["Ginjal", "Paru-paru", "Kulit", "Hati"],
          correct_answer_index: 0,
        },
      }),
    });
    if (!matchRes.ok) throw new Error(`HTTP ${matchRes.status}`);
    const matchData = await matchRes.json();
    if (!matchData.converted_question.matching_pairs || matchData.converted_question.matching_pairs.length < 3) {
      throw new Error("MATCHING must generate at least 3 pairs");
    }

    // 5b. CATEGORIZE_ITEMS
    const catRes = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "CATEGORIZE_ITEMS",
        question: {
          question_text: "Klasifikasikan benda dan makhluk berikut:",
          question_type: "MULTIPLE_CHOICE",
          options: ["Kucing", "Batu", "Pohon", "Meja"],
          correct_answer_index: 0,
        },
      }),
    });
    if (!catRes.ok) throw new Error(`HTTP ${catRes.status}`);
    const catData = await catRes.json();
    const catQ = catData.converted_question;
    if (!catQ.categories || catQ.categories.length < 2) {
      throw new Error("Must generate at least 2 categories");
    }
    if (!catQ.categorize_items || catQ.categorize_items.length < 4) {
      throw new Error("Must generate categorized items");
    }
  });

  // Verification of 8 Required Output Report Fields
  await assert("7. Report Completeness: All 8 required report fields present and formatted", async () => {
    const res = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "OPEN_ENDED",
        question: {
          question_text: "Jelaskan proses terjadinya gerhana matahari!",
          question_type: "MULTIPLE_CHOICE",
          options: ["Bulan di antara bumi dan matahari", "Bumi di antara bulan dan matahari"],
          correct_answer_index: 0,
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const r = data.report;

    const requiredFields = [
      "status",
      "oldType",
      "newType",
      "uxChange",
      "adjustedQuestionText",
      "newDataStructure",
      "newAnswerKey",
      "editorNotes",
    ];

    for (const field of requiredFields) {
      if (!r[field]) throw new Error(`Missing required report field: ${field}`);
    }

    if (r.status !== "Sukses") throw new Error("status must be 'Sukses'");
  });

  console.log("\n========================================");
  console.log(`Conversion Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
