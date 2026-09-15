import assert from "assert";
import sharp from "sharp";

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("=== Testing PDF Isian (FILL_IN_THE_BLANKS) Detection & Preservation ===\n");

  // 1. Test direct logic via import
  const { detectQuestionType, enrichQuestionsWithImages } = await import("../src/lib/pdfImageExtractor.ts");

  console.log("⏳ [TEST 1] Testing detectQuestionType logic...");
  const isian1 = detectQuestionType({
    question_text: "Fotosintesis pada tumbuhan menghasilkan gas ....",
    options: [],
    blanks_keywords: ["oksigen"],
  });
  assert(isian1 === "FILL_IN_THE_BLANKS", "Detects isian from dots '....' and empty options");

  const isian2 = detectQuestionType({
    question_text: "Bagian bunga yang berfungsi sebagai alat kelamin jantan adalah [___].",
    options: ["Option A", "Option B", "Option C", "Option D"], // dummy options
    blanks_keywords: ["benang sari"],
  });
  assert(isian2 === "FILL_IN_THE_BLANKS", "Detects isian despite generic dummy options");

  const isianExplicit = detectQuestionType({
    question_text: "Ibu kota negara Indonesia adalah [___].",
    question_type: "FILL_IN_THE_BLANKS",
    options: [],
  });
  assert(isianExplicit === "FILL_IN_THE_BLANKS", "Preserves explicit FILL_IN_THE_BLANKS type");

  const mcq = detectQuestionType({
    question_text: "Berikut ini yang merupakan hewan mamalia adalah...",
    options: ["Ikan Hiu", "Lumba-lumba", "Ayam", "Katak"],
    correct_answer_index: 1,
  });
  assert(mcq === "MULTIPLE_CHOICE", "Preserves MULTIPLE_CHOICE for genuine options");
  console.log("✅ [TEST 1] PASSED: detectQuestionType accurately distinguishes isian and mcq!");

  // 2. Test enrichQuestionsWithImages does not force options into isian questions
  console.log("⏳ [TEST 2] Testing enrichQuestionsWithImages preserves empty options for isian...");
  const dummyBuffer = Buffer.from("%PDF-1.4 dummy buffer");
  const rawQuestions = [
    {
      question_text: "Gas yang dibutuhkan tumbuhan untuk fotosintesis adalah ....",
      question_type: "FILL_IN_THE_BLANKS",
      options: [],
      blanks_keywords: ["karbondioksida", "CO2"],
      explanation: "Kunci: karbondioksida",
    },
    {
      question_text: "Hewan pemakan rumput disebut...",
      question_type: "MULTIPLE_CHOICE",
      options: ["Karnivora", "Herbivora", "Omnivora", "Insektivora"],
      correct_answer_index: 1,
    },
  ];

  const enriched = await enrichQuestionsWithImages(rawQuestions, dummyBuffer);
  assert(enriched.length === 2, "Enriched 2 questions");

  // Question 1: Isian
  const q1 = enriched[0];
  assert(q1.question_type === "FILL_IN_THE_BLANKS", "Question 1 type is FILL_IN_THE_BLANKS");
  assert(q1.question_text.includes("[___]"), "Question 1 text normalized to contain [___]");
  assert(Array.isArray(q1.options) && q1.options.length === 0, "Question 1 options are EMPTY [] (not forced into MCQ)");
  assert(Array.isArray(q1.option_items) && q1.option_items.length === 0, "Question 1 option_items are EMPTY []");
  assert(Array.isArray(q1.blanks_keywords) && q1.blanks_keywords.includes("karbondioksida"), "Question 1 has correct keywords");
  console.log("✅ [TEST 2] PASSED: Isian questions are never forced into multiple choice!");

  // Question 2: MCQ
  const q2 = enriched[1];
  assert(q2.question_type === "MULTIPLE_CHOICE", "Question 2 type is MULTIPLE_CHOICE");
  assert(Array.isArray(q2.options) && q2.options.length === 4, "Question 2 options preserved with 4 options");
  console.log("✅ [TEST 3] PASSED: Multiple choice questions retain their 4 options!");

  // 3. Test Quiz Persistence & Runner Logic with Isian Question
  console.log("⏳ [TEST 4] Testing POST /api/quizzes with extracted isian question...");
  const createRes = await fetch(`${BASE_URL}/api/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Ujian Campuran Isian dan Pilihan Ganda",
      questions: enriched,
    }),
  });

  const createData = await createRes.json();
  assert(createRes.ok, "POST /api/quizzes succeeded");
  const quizId = createData.quiz.id;
  const slug = createData.quiz.slug;

  const getRes = await fetch(`${BASE_URL}/api/quizzes/${slug}`);
  const getData = await getRes.json();
  assert(getRes.ok, "GET /api/quizzes/[slug] succeeded");
  assert(getData.questions[0].question_type === "FILL_IN_THE_BLANKS", "Persisted question 1 is FILL_IN_THE_BLANKS");
  assert(getData.questions[0].options.length === 0, "Persisted question 1 has 0 multiple-choice options");
  assert(getData.questions[1].question_type === "MULTIPLE_CHOICE", "Persisted question 2 is MULTIPLE_CHOICE");
  console.log("✅ [TEST 4] PASSED: Isian question persisted and fetched from API cleanly!");

  // Clean up
  await fetch(`${BASE_URL}/api/quizzes/${quizId}`, { method: "DELETE" });
  console.log("✅ [TEST 5] Cleaned up test quiz.");

  console.log("\n========================================================");
  console.log("🎉 ALL ISIAN PRESERVATION TESTS PASSED SUCCESSFULLY!");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
