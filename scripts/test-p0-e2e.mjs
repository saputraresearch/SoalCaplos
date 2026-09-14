// Automated End-to-End P0 Test Suite
const BASE_URL = "http://localhost:3000";

async function runP0Suite() {
  console.log("🚀 Running Prioritas P0 Automated Verification Suite...\n");
  let passed = 0;
  let failed = 0;

  async function assert(testName, fn) {
    try {
      process.stdout.write(`⏳ [P0-TEST] ${testName}... `);
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (err) {
      console.log("❌ FAILED");
      console.error("   Error details:", err.message);
      failed++;
    }
  }

  let createdQuizId = "";
  let createdSlug = "";
  let createdSubId = "";

  // Test 1: Create Quiz via POST /api/quizzes
  await assert("1. Create new quiz via API", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "P0 Algebra Test 2026",
        questions: [
          {
            question_text: "Find x: 2x + 4 = 10",
            options: ["x = 2", "x = 3", "x = 4", "x = 5"],
            correct_answer_index: 1,
            explanation: "2x = 6, so x = 3",
          },
          {
            question_text: "Find y: 3y - 9 = 0",
            options: ["y = 1", "y = 2", "y = 3", "y = 4"],
            correct_answer_index: 2,
            explanation: "3y = 9, so y = 3",
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.quiz?.id || !data.quiz?.slug) throw new Error("Missing quiz id or slug");
    createdQuizId = data.quiz.id;
    createdSlug = data.quiz.slug;
  });

  // Test 2: Fetch Quiz by ID via GET /api/quizzes/[id]
  await assert("2. Fetch single quiz details by ID", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.quiz?.title !== "P0 Algebra Test 2026") throw new Error("Title mismatch");
    if (!Array.isArray(data.questions) || data.questions.length !== 2) throw new Error("Questions array invalid");
  });

  // Test 3: Edit Quiz via PUT /api/quizzes/[id]
  await assert("3. Update quiz title and reorder questions (Edit API)", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "P0 Algebra Test 2026 - REVISED",
        questions: [
          // Reordered: question 2 now first
          {
            question_text: "Find y: 3y - 9 = 0",
            options: ["y = 1", "y = 2", "y = 3", "y = 4"],
            correct_answer_index: 2,
            explanation: "3y = 9, so y = 3",
          },
          {
            question_text: "Find x: 2x + 4 = 10",
            options: ["x = 2", "x = 3", "x = 4", "x = 5"],
            correct_answer_index: 1,
            explanation: "2x = 6, so x = 3",
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("PUT failed");
  });

  // Test 4: Verify Edited Quiz via GET /api/quizzes/[slug]
  await assert("4. Verify edited quiz reflects changes on student runner route", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes/${createdSlug}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.quiz?.title !== "P0 Algebra Test 2026 - REVISED") throw new Error("Title was not updated");
    if (data.questions[0].question_text !== "Find y: 3y - 9 = 0") throw new Error("Question order was not updated");
  });

  // Test 5: Submit student answers via POST /api/submit-quiz
  await assert("5. Submit student answer with detailed breakdown", async () => {
    const res = await fetch(`${BASE_URL}/api/submit-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_id: createdQuizId,
        student_name: "Ahmad Rizky",
        score: 2,
        total_questions: 2,
        answers: [
          {
            question_text: "Find y: 3y - 9 = 0",
            selected_index: 2,
            correct_index: 2,
            is_correct: true,
          },
          {
            question_text: "Find x: 2x + 4 = 10",
            selected_index: 1,
            correct_index: 1,
            is_correct: true,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.submission?.id) throw new Error("Missing submission ID");
    createdSubId = data.submission.id;
  });

  // Test 6: Verify student answer breakdown for modal inspection
  await assert("6. Fetch submissions and verify answer breakdown for StudentAnswerModal", async () => {
    const res = await fetch(`${BASE_URL}/api/submit-quiz?quiz_id=${createdQuizId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const sub = data.submissions.find((s) => s.id === createdSubId);
    if (!sub) throw new Error("Created submission not found in list");
    if (sub.answers.length !== 2) throw new Error("Answers array not stored properly");
  });

  // Test 7: Delete Single Submission via DELETE /api/submit-quiz?id=...
  await assert("7. Delete single student submission", async () => {
    const res = await fetch(`${BASE_URL}/api/submit-quiz?id=${createdSubId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const verifyRes = await fetch(`${BASE_URL}/api/submit-quiz?quiz_id=${createdQuizId}`);
    const verifyData = await verifyRes.json();
    const found = verifyData.submissions.some((s) => s.id === createdSubId);
    if (found) throw new Error("Submission was not deleted");
  });

  // Test 8: Delete Quiz via DELETE /api/quizzes/[id]
  await assert("8. Delete quiz permanently (cascade deletion)", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const verifyRes = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`);
    if (verifyRes.status !== 404) throw new Error("Quiz still accessible after deletion");
  });

  // Test 9: Verify Next.js edit page renders
  await assert("9. Render /admin/quizzes dashboard with Edit/Delete buttons", async () => {
    const res = await fetch(`${BASE_URL}/admin/quizzes`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes("Teacher Quiz Dashboard")) throw new Error("Dashboard text missing");
  });

  // Test 10: Render /admin/create page
  await assert("10. Render /admin/create page", async () => {
    const res = await fetch(`${BASE_URL}/admin/create`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes("QuizCaplos") && !text.includes("Create Blank Quiz")) throw new Error("Create page content missing");
  });

  // Test 11: Create manual quiz with MCQ & True/False questions and verify
  await assert("11. Manual Quiz creation with MCQ & True/False questions", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Manual Chemistry & Biology Quiz",
        questions: [
          {
            question_text: "What is the chemical symbol for Gold?",
            options: ["Au", "Ag", "Fe", "Cu"],
            correct_answer_index: 0,
            explanation: "Au comes from the Latin word Aurum.",
          },
          {
            question_text: "Water boils at 100 degrees Celsius at sea level.",
            options: ["True", "False"],
            correct_answer_index: 0,
            explanation: "Standard boiling point of water is 100°C.",
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.quiz?.id) throw new Error("Failed to create manual quiz");

    // Clean up
    await fetch(`${BASE_URL}/api/quizzes/${data.quiz.id}`, { method: "DELETE" });
  });

  // Test 12: Draft vs Published Status Lifecycle
  await assert("12. Save Draft vs Save & Publish lifecycle", async () => {
    // 1. Create Draft
    const draftRes = await fetch(`${BASE_URL}/api/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Physics Mechanics Draft Quiz",
        status: "draft",
        questions: [
          {
            question_text: "What is Newton's first law of motion?",
            options: ["Inertia", "F=ma", "Action-Reaction", "Gravity"],
            correct_answer_index: 0,
            explanation: "Newton's first law is the law of inertia.",
          },
        ],
      }),
    });

    if (!draftRes.ok) throw new Error(`HTTP ${draftRes.status}`);
    const draftData = await draftRes.json();
    const draftId = draftData.quiz?.id;
    if (!draftId) throw new Error("Missing draft quiz ID");

    // Verify status is draft
    const getDraftRes = await fetch(`${BASE_URL}/api/quizzes/${draftId}`);
    const getDraftData = await getDraftRes.json();
    if (getDraftData.quiz?.status !== "draft") throw new Error("Quiz status is not 'draft'");

    // 2. Publish the draft
    const pubRes = await fetch(`${BASE_URL}/api/quizzes/${draftId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Physics Mechanics Draft Quiz - Final",
        status: "published",
        questions: getDraftData.questions,
      }),
    });
    if (!pubRes.ok) throw new Error(`HTTP ${pubRes.status}`);

    // Verify status is published
    const getPubRes = await fetch(`${BASE_URL}/api/quizzes/${draftId}`);
    const getPubData = await getPubRes.json();
    if (getPubData.quiz?.status !== "published") throw new Error("Quiz status is not 'published'");

    // Clean up
    await fetch(`${BASE_URL}/api/quizzes/${draftId}`, { method: "DELETE" });
  });

  // Test 13: UI Elements check for Save Draft and Auto-Save indicators
  await assert("13. UI Elements check for Save Draft and Auto-Save", async () => {
    const res = await fetch(`${BASE_URL}/admin/create`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes("Save Draft")) throw new Error("Save Draft button missing from create page");
    if (!text.includes("Auto-save every 5m")) throw new Error("Auto-save indicator missing from create page");
  });

  // Test 14: All 11 Question Types Creation & Retrieval
  await assert("14. Create, persist, and fetch quiz with all 11 question types", async () => {
    const elevenQuestions = [
      {
        question_text: "Apa ibukota Indonesia?",
        question_type: "MULTIPLE_CHOICE",
        options: ["Jakarta", "Surabaya", "Bandung", "Medan"],
        correct_answer_index: 0,
        explanation: "Jakarta adalah ibukota saat ini.",
      },
      {
        question_text: "Pilih hewan mamalia (pilih 2-4 yang benar):",
        question_type: "MULTIPLE_SELECT",
        options: ["Kucing", "Lumba-lumba", "Ayam", "Paus", "Katak"],
        correct_answer_index: 0,
        correct_answers: [0, 1, 3],
        explanation: "Kucing, lumba-lumba, dan paus adalah mamalia.",
      },
      {
        question_text: "Matahari terbit dari sebelah barat.",
        question_type: "TRUE_OR_FALSE",
        options: ["Benar", "Salah"],
        correct_answer_index: 1,
        explanation: "Matahari terbit dari sebelah timur.",
      },
      {
        question_text: "Jodohkan negara dengan ibukotanya:",
        question_type: "MATCHING",
        matching_pairs: [
          { left: "Jepang", right: "Tokyo" },
          { left: "Prancis", right: "Paris" },
          { left: "Inggris", right: "London" },
        ],
        options: [],
        correct_answer_index: 0,
        explanation: "Pasangan negara dan ibukota.",
      },
      {
        question_text: "Urutkan siklus metamorfosis kupu-kupu:",
        question_type: "REORDER",
        reorder_items: ["Telur", "Ulat (Larva)", "Kepompong (Pupa)", "Kupu-kupu"],
        correct_order: [1, 2, 3, 4],
        options: [],
        correct_answer_index: 0,
        explanation: "Siklus metamorfosis sempurna.",
      },
      {
        question_text: "Proses fotosintesis menghasilkan zat gula dan gas [___].",
        question_type: "FILL_IN_THE_BLANKS",
        blanks_keywords: ["oksigen", "O2"],
        options: ["oksigen"],
        correct_answer_index: 0,
        explanation: "Fotosintesis menghasilkan oksigen.",
      },
      {
        question_text: "Jelaskan mengapa keanekaragaman hayati penting bagi keseimbangan ekosistem!",
        question_type: "OPEN_ENDED",
        rubric: ["Rantai makanan stabil", "Ketahanan ekosistem", "Siklus biogeokimia"],
        options: [],
        correct_answer_index: 0,
        explanation: "Keanekaragaman menjaga rantai makanan dan kestabilan ekosistem.",
      },
      {
        question_text: "Hitunglah nilai x dari persamaan: 4x + 12 = 36",
        question_type: "MATH_RESPONSE",
        options: ["x = 6"],
        correct_answer_index: 0,
        math_solution: "4x = 24 => x = 6",
        explanation: "Penyelesaian aljabar linier satu variabel.",
      },
      {
        question_text: "Pasangkan label anatomi tumbuhan ke pin yang sesuai:",
        question_type: "IMAGE_LABELING",
        image_context: "Diagram Struktur Anatomi Tumbuhan",
        options: ["Akar", "Batang", "Daun"],
        correct_answer_index: 0,
        label_targets: [
          { id: "pin-1", label: "Daun", x: 60, y: 30, target_name: "Helai Daun" },
          { id: "pin-2", label: "Batang", x: 50, y: 50, target_name: "Batang Utama" },
          { id: "pin-3", label: "Akar", x: 50, y: 80, target_name: "Bagian Bawah Tanah" },
        ],
        explanation: "Labeling struktur tumbuhan.",
      },
      {
        question_text: "Ketuk zona daun tempat berlangsungnya fotosintesis:",
        question_type: "IMAGE_HOTSPOT",
        image_context: "Foto Makro Daun Hijau",
        options: [],
        correct_answer_index: 0,
        hotspot_zone: { x: 55, y: 40, radius: 15, description: "Area klorofil mesofil daun" },
        explanation: "Hotspot kloroplas daun.",
      },
      {
        question_text: "Kelompokkan item ke Makhluk Hidup atau Benda Mati:",
        question_type: "CATEGORIZE_ITEMS",
        categories: ["Makhluk Hidup", "Benda Mati"],
        categorize_items: [
          { text: "Kucing", category: "Makhluk Hidup" },
          { text: "Batu", category: "Benda Mati" },
          { text: "Pohon", category: "Makhluk Hidup" },
          { text: "Buku", category: "Benda Mati" },
        ],
        options: [],
        correct_answer_index: 0,
        explanation: "Pengelompokan makhluk hidup vs benda mati.",
      },
    ];

    const createRes = await fetch(`${BASE_URL}/api/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Kuis 11 Tipe Soal Lengkap",
        status: "published",
        questions: elevenQuestions,
      }),
    });

    if (!createRes.ok) throw new Error(`HTTP ${createRes.status}`);
    const createData = await createRes.json();
    const quizId = createData.quiz?.id;
    if (!quizId) throw new Error("Missing 11-type quiz ID");

    // Retrieve and verify all 11 types preserved
    const getRes = await fetch(`${BASE_URL}/api/quizzes/${quizId}`);
    if (!getRes.ok) throw new Error(`Fetch failed HTTP ${getRes.status}`);
    const getData = await getRes.json();
    if (getData.questions.length !== 11) throw new Error(`Expected 11 questions, got ${getData.questions.length}`);

    // Verify types present
    const types = getData.questions.map((q) => q.question_type);
    if (!types.includes("MULTIPLE_SELECT")) throw new Error("Missing MULTIPLE_SELECT");
    if (!types.includes("MATCHING")) throw new Error("Missing MATCHING");
    if (!types.includes("REORDER")) throw new Error("Missing REORDER");
    if (!types.includes("FILL_IN_THE_BLANKS")) throw new Error("Missing FILL_IN_THE_BLANKS");
    if (!types.includes("OPEN_ENDED")) throw new Error("Missing OPEN_ENDED");
    if (!types.includes("MATH_RESPONSE")) throw new Error("Missing MATH_RESPONSE");
    if (!types.includes("IMAGE_LABELING")) throw new Error("Missing IMAGE_LABELING");
    if (!types.includes("IMAGE_HOTSPOT")) throw new Error("Missing IMAGE_HOTSPOT");
    if (!types.includes("CATEGORIZE_ITEMS")) throw new Error("Missing CATEGORIZE_ITEMS");

    // Clean up
    await fetch(`${BASE_URL}/api/quizzes/${quizId}`, { method: "DELETE" });
  });

  // Test 15: Student Submission with multi-type answers
  await assert("15. Submit student answers for multiple question types", async () => {
    const subRes = await fetch(`${BASE_URL}/api/submit-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_id: "demo-quiz-id",
        student_name: "Budi Santoso",
        score: 7,
        total_questions: 7,
        answers: [
          {
            question_text: "Pilih hewan mamalia",
            question_type: "MULTIPLE_SELECT",
            selected_indices: [0, 1, 3],
            is_correct: true,
          },
          {
            question_text: "Jodohkan negara",
            question_type: "MATCHING",
            user_matches: { Jepang: "Tokyo", Prancis: "Paris" },
            is_correct: true,
          },
          {
            question_text: "Urutkan proses",
            question_type: "REORDER",
            user_order: [1, 2, 3, 4],
            is_correct: true,
          },
          {
            question_text: "Gas fotosintesis",
            question_type: "FILL_IN_THE_BLANKS",
            user_text: "oksigen",
            is_correct: true,
          },
          {
            question_text: "Labeling struktur tumbuhan",
            question_type: "IMAGE_LABELING",
            user_label_matches: { "pin-1": "Daun", "pin-2": "Batang" },
            is_correct: true,
          },
          {
            question_text: "Hotspot daun",
            question_type: "IMAGE_HOTSPOT",
            user_hotspot_coords: { x: 55, y: 42 },
            is_correct: true,
          },
          {
            question_text: "Pengelompokan makhluk",
            question_type: "CATEGORIZE_ITEMS",
            user_categorization: { "Makhluk Hidup": ["Kucing", "Pohon"], "Benda Mati": ["Batu"] },
            is_correct: true,
          },
        ],
      }),
    });

    if (!subRes.ok) throw new Error(`Submission failed HTTP ${subRes.status}`);
    const subData = await subRes.json();
    if (!subData.submission?.id) throw new Error("Missing submission ID");

    // Clean up submission
    await fetch(`${BASE_URL}/api/submit-quiz?id=${subData.submission.id}`, { method: "DELETE" });
  });

  // Test 16: Smart Question Type Conversion
  await assert("16. Smart Question Type Conversion rules & structured report validation", async () => {
    // Test conversion from MULTIPLE_SELECT to MULTIPLE_CHOICE
    const convRes = await fetch(`${BASE_URL}/api/convert-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: "MULTIPLE_CHOICE",
        question: {
          question_text: "Pilih hewan mamalia:",
          question_type: "MULTIPLE_SELECT",
          options: ["Kucing", "Lumba-lumba", "Elang", "Katak"],
          correct_answers: [0, 1],
        },
      }),
    });
    if (!convRes.ok) throw new Error(`HTTP ${convRes.status}`);
    const convData = await convRes.json();
    if (convData.converted_question.question_type !== "MULTIPLE_CHOICE") throw new Error("Conversion type mismatch");
    if (convData.converted_question.correct_answer_index !== 0) throw new Error("Primary key mismatch");
    if (convData.report.status !== "Sukses") throw new Error("Report status must be Sukses");
    if (!convData.report.uxChange || !convData.report.adjustedQuestionText || !convData.report.editorNotes) {
      throw new Error("Report is missing required fields");
    }
  });

  // Test 17: Smart Options & Distractor Generator (Core AI Engine)
  await assert("17. Smart Options & Distractor Generator AI Engine validation", async () => {
    const distractorRes = await fetch(`${BASE_URL}/api/generate-distractors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_text: "Proses pembuatan makanan pada tumbuhan hijau dengan bantuan cahaya matahari adalah...",
        correct_answer: "Fotosintesis",
        option_count: 4,
        target_age: "SMP (12-15 tahun)",
      }),
    });

    if (!distractorRes.ok) throw new Error(`HTTP ${distractorRes.status}`);
    const data = await distractorRes.json();
    if (data.status !== "success") throw new Error(`Expected status success, got ${data.status}`);
    if (!Array.isArray(data.generated_options) || data.generated_options.length !== 4) {
      throw new Error("Expected array of 4 generated_options");
    }

    const correctOptions = data.generated_options.filter((o) => o.is_correct);
    if (correctOptions.length !== 1) throw new Error(`Expected exactly 1 correct option, got ${correctOptions.length}`);

    // Verify schema properties
    for (const opt of data.generated_options) {
      if (!opt.option_letter || !opt.option_text || typeof opt.is_correct !== "boolean" || !opt.distractor_analysis) {
        throw new Error("Generated option missing required schema properties");
      }
    }
  });

  console.log(`\n========================================`);
  console.log(`P0 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runP0Suite();

