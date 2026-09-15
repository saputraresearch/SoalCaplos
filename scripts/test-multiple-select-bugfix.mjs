// scripts/test-multiple-select-bugfix.mjs
import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("🚀 Starting Multiple Select Bugfix Verification Suite...\n");

  let passed = 0;
  let failed = 0;

  // TEST 1: Create a quiz with MULTIPLE_SELECT and verify API preserves MULTIPLE_SELECT
  let testQuizSlug = "";
  try {
    console.log("TEST 1: Create Quiz with MULTIPLE_SELECT and verify question_type preservation...");
    const payload = {
      title: "Uji Pilihan Ganda Kompleks " + Date.now(),
      status: "published",
      questions: [
        {
          question_text: "Pilihlah semua organ pencernaan yang menghasilkan enzim amilase:",
          question_type: "MULTIPLE_SELECT",
          options: ["Mulut (Kelenjar Ludah)", "Lambung", "Pankreas", "Usus Besar", "Hati"],
          correct_answer_index: 0,
          correct_answers: [0, 2], // 2 correct answers (A & C)
          explanation: "Amilase dihasilkan oleh kelenjar ludah di mulut dan oleh pankreas.",
        },
        {
          // Question created with multiple correct answers but question_type was left as MULTIPLE_CHOICE
          question_text: "Pilihlah 2 bilangan prima:",
          question_type: "MULTIPLE_CHOICE",
          options: ["2", "4", "5", "9"],
          correct_answer_index: 0,
          correct_answers: [0, 2], // Multiple answers: 2 and 5
          explanation: "2 dan 5 adalah bilangan prima.",
        },
      ],
    };

    const res = await fetch(`${BASE_URL}/api/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.quiz, "Quiz record must be returned");
    testQuizSlug = data.quiz.slug;

    // Fetch back by slug
    const getRes = await fetch(`${BASE_URL}/api/quizzes/${testQuizSlug}`);
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();

    // Verify Question 1 is MULTIPLE_SELECT
    assert.strictEqual(getData.questions[0].question_type, "MULTIPLE_SELECT");
    assert.deepStrictEqual(getData.questions[0].correct_answers, [0, 2]);

    // Verify Question 2 (which had multi answers) is automatically elevated to MULTIPLE_SELECT
    assert.strictEqual(getData.questions[1].question_type, "MULTIPLE_SELECT", "Questions with multiple answers MUST be saved as MULTIPLE_SELECT");
    assert.deepStrictEqual(getData.questions[1].correct_answers, [0, 2]);

    console.log("   ✅ TEST 1 PASSED\n");
    passed++;
  } catch (err) {
    console.error("   ❌ TEST 1 FAILED:", err.message);
    failed++;
  }

  // TEST 2: Student answer submission for MULTIPLE_SELECT
  try {
    console.log("TEST 2: Submit student answer for MULTIPLE_SELECT quiz...");
    // Fetch quiz to get question IDs
    const qRes = await fetch(`${BASE_URL}/api/quizzes/${testQuizSlug}`);
    const qData = await qRes.json();
    const q1 = qData.questions[0];
    const q2 = qData.questions[1];

    const submitPayload = {
      quiz_id: qData.quiz.id,
      student_name: "Ahmad Siswa",
      score: 2,
      total_questions: 2,
      answers: [
        {
          question_id: q1.id,
          question_text: q1.question_text,
          question_type: "MULTIPLE_SELECT",
          selected_indices: [0, 2], // Student chose both correct answers
          correct_answers: [0, 2],
          is_correct: true,
        },
        {
          question_id: q2.id,
          question_text: q2.question_text,
          question_type: "MULTIPLE_SELECT",
          selected_indices: [0, 2], // Student chose both correct answers
          correct_answers: [0, 2],
          is_correct: true,
        },
      ],
    };

    const subRes = await fetch(`${BASE_URL}/api/submit-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitPayload),
    });

    assert.strictEqual(subRes.status, 200);
    const subData = await subRes.json();
    assert.strictEqual(subData.success, true);
    assert.strictEqual(subData.submission.score, 2);

    console.log("   ✅ TEST 2 PASSED\n");
    passed++;
  } catch (err) {
    console.error("   ❌ TEST 2 FAILED:", err.message);
    failed++;
  }

  // Clean up
  try {
    const qRes = await fetch(`${BASE_URL}/api/quizzes/${testQuizSlug}`);
    const qData = await qRes.json();
    if (qData.quiz?.id) {
      await fetch(`${BASE_URL}/api/quizzes/${qData.quiz.id}`, { method: "DELETE" });
    }
  } catch {}

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
