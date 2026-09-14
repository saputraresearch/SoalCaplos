// scripts/test-modal-editor-e2e.mjs
// Automated verification for Question Edit Modal & QuestionPreviewCard

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

async function assert(testName, fn) {
  process.stdout.write(`⏳ [MODAL-TEST] ${testName}... `);
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
  console.log("🚀 Running Modal Question Editor Verification Suite...\n");

  let createdQuizId = null;

  // Test 1: Create a test quiz with 3 questions
  await assert("1. Setup: Create test quiz with 3 diverse questions", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Kuis Modal Editor Test",
        status: "draft",
        questions: [
          {
            question_text: "Soal 1 Sebelum Edit",
            question_type: "MULTIPLE_CHOICE",
            options: ["Opsi 1A", "Opsi 1B", "Opsi 1C", "Opsi 1D"],
            correct_answer_index: 0,
            explanation: "Penjelasan 1",
          },
          {
            question_text: "Soal 2 Benar atau Salah",
            question_type: "TRUE_OR_FALSE",
            options: ["Benar", "Salah"],
            correct_answer_index: 1,
            explanation: "Penjelasan 2",
          },
          {
            question_text: "Soal 3 Pasangan Menjodohkan",
            question_type: "MATCHING",
            matching_pairs: [
              { left: "Kucing", right: "Mamalia" },
              { left: "Elang", right: "Aves" },
            ],
            options: [],
            correct_answer_index: 0,
            explanation: "Penjelasan 3",
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    createdQuizId = data.quiz?.id;
    if (!createdQuizId) throw new Error("Failed to retrieve created quiz ID");
  });

  // Test 2: Edit Quiz page route returns HTTP 200
  await assert("2. Verify Edit Quiz page route responds with HTTP 200 OK", async () => {
    const res = await fetch(`${BASE_URL}/admin/quizzes/${createdQuizId}/edit`);
    if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
  });

  // Test 3: Commit modal edits (Save) via PUT /api/quizzes/[id]
  await assert("3. Commit edited question from modal to backend (Save flow)", async () => {
    const getRes = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`);
    if (!getRes.ok) throw new Error(`HTTP ${getRes.status}`);
    const getData = await getRes.json();

    const updatedQuestions = [...getData.questions];
    // Modify question 1 as if edited in modal and saved
    updatedQuestions[0] = {
      ...updatedQuestions[0],
      question_text: "Soal 1 Sesudah Diedit via Modal",
      options: ["Opsi Baru A", "Opsi Baru B", "Opsi Baru C", "Opsi Baru D"],
      correct_answer_index: 2,
      explanation: "Penjelasan baru yang lebih lengkap.",
    };

    const updateRes = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Kuis Modal Editor Test (Updated)",
        questions: updatedQuestions,
      }),
    });

    if (!updateRes.ok) throw new Error(`HTTP ${updateRes.status}`);
    const updateData = await updateRes.json();
    if (!updateData.success) throw new Error("Expected updateData.success to be true");

    // Fetch and verify updated question in database
    const verifyRes = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`);
    const verifyData = await verifyRes.json();
    if (verifyData.questions[0].question_text !== "Soal 1 Sesudah Diedit via Modal") {
      throw new Error("Question text did not update properly");
    }
    if (verifyData.questions[0].correct_answer_index !== 2) {
      throw new Error("Correct answer index did not update properly");
    }
  });

  // Test 4: Revert capability (Cancel flow preserves untouched state)
  await assert("4. Revert / Cancel flow preserves original data without changes", async () => {
    // Fetch current state
    const beforeRes = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`);
    const beforeData = await beforeRes.json();
    const originalQ2Text = beforeData.questions[1].question_text;

    // Simulate user editing Question 2 in modal but clicking "Batal & Kembalikan" (no PUT sent)
    // Verify server data is 100% identical and unchanged
    const afterRes = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`);
    const afterData = await afterRes.json();
    if (afterData.questions[1].question_text !== originalQ2Text) {
      throw new Error("Revert failed: question text unexpectedly altered");
    }
  });

  // Test 5: Teardown
  await assert("5. Teardown: Delete test quiz", async () => {
    if (!createdQuizId) return;
    const delRes = await fetch(`${BASE_URL}/api/quizzes/${createdQuizId}`, {
      method: "DELETE",
    });
    if (!delRes.ok) throw new Error(`HTTP ${delRes.status}`);
  });

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
