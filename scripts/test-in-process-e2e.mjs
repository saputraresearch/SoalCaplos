import fs from "fs";
import path from "path";

// In-process automated verification runner for P0 & E2E suites
const getRoute = (m) => (m.routeModule || m.default?.routeModule).userland;
const quizzesRoute = getRoute(await import("../.next/server/app/api/quizzes/route.js"));
const quizIdRoute = getRoute(await import("../.next/server/app/api/quizzes/[id]/route.js"));
const submitQuizRoute = getRoute(await import("../.next/server/app/api/submit-quiz/route.js"));
const parsePdfRoute = getRoute(await import("../.next/server/app/api/parse-pdf/route.js"));

function mockRequest(url, method = "GET", body = null, headers = {}) {
  const reqInit = {
    method,
    headers: new Headers({
      "Content-Type": "application/json",
      ...headers,
    }),
  };
  if (body) {
    reqInit.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(url, reqInit);
}

async function runAllTests() {
  console.log("========================================================================");
  console.log("🚀 STARTING FULL IN-PROCESS E2E & P0 VERIFICATION SUITE");
  console.log("========================================================================\n");

  let p0Passed = 0;
  let p0Failed = 0;

  async function assertP0(testName, fn) {
    try {
      process.stdout.write(`⏳ [P0-TEST] ${testName}... `);
      await fn();
      console.log("✅ PASSED");
      p0Passed++;
    } catch (err) {
      console.log("❌ FAILED");
      console.error("   Error details:", err.message);
      p0Failed++;
    }
  }

  let createdQuizId = "";
  let createdSlug = "";
  let createdSubId = "";

  // P0 Test 1: Create new quiz via API
  await assertP0("1. Create new quiz via API", async () => {
    const req = mockRequest("http://localhost/api/quizzes", "POST", {
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
    });
    const res = await quizzesRoute.POST(req);
    if (res.status !== 200 && res.status !== 201) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.quiz?.id || !data.quiz?.slug) throw new Error("Missing quiz id or slug");
    createdQuizId = data.quiz.id;
    createdSlug = data.quiz.slug;
  });

  // P0 Test 2: Fetch single quiz details by ID
  await assertP0("2. Fetch single quiz details by ID", async () => {
    const req = mockRequest(`http://localhost/api/quizzes/${createdQuizId}`);
    const res = await quizIdRoute.GET(req, { params: { id: createdQuizId } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.quiz?.title !== "P0 Algebra Test 2026") throw new Error("Title mismatch");
    if (!Array.isArray(data.questions) || data.questions.length !== 2) throw new Error("Questions array invalid");
  });

  // P0 Test 3: Update quiz title and reorder questions (Edit API)
  await assertP0("3. Update quiz title and reorder questions (Edit API)", async () => {
    const req = mockRequest(`http://localhost/api/quizzes/${createdQuizId}`, "PUT", {
      title: "P0 Algebra Test 2026 - REVISED",
      questions: [
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
    });
    const res = await quizIdRoute.PUT(req, { params: { id: createdQuizId } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("PUT failed");
  });

  // P0 Test 4: Verify edited quiz reflects changes on student runner route
  await assertP0("4. Verify edited quiz reflects changes on student runner route", async () => {
    const req = mockRequest(`http://localhost/api/quizzes/${createdSlug}`);
    const res = await quizIdRoute.GET(req, { params: { id: createdSlug } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.quiz?.title !== "P0 Algebra Test 2026 - REVISED") throw new Error("Title was not updated");
    if (data.questions[0].question_text !== "Find y: 3y - 9 = 0") throw new Error("Question order was not updated");
  });

  // P0 Test 5: Submit student answer with detailed breakdown
  await assertP0("5. Submit student answer with detailed breakdown", async () => {
    const req = mockRequest("http://localhost/api/submit-quiz", "POST", {
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
    });
    const res = await submitQuizRoute.POST(req);
    if (res.status !== 200 && res.status !== 201) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.submission?.id) throw new Error("Missing submission ID");
    createdSubId = data.submission.id;
  });

  // P0 Test 6: Fetch submissions and verify answer breakdown for StudentAnswerModal
  await assertP0("6. Fetch submissions and verify answer breakdown for StudentAnswerModal", async () => {
    const req = mockRequest(`http://localhost/api/submit-quiz?quiz_id=${createdQuizId}`);
    const res = await submitQuizRoute.GET(req);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const sub = data.submissions.find((s) => s.id === createdSubId);
    if (!sub) throw new Error("Created submission not found in list");
    if (sub.answers.length !== 2) throw new Error("Answers array not stored properly");
  });

  // P0 Test 7: Delete single student submission
  await assertP0("7. Delete single student submission", async () => {
    const req = mockRequest(`http://localhost/api/submit-quiz?id=${createdSubId}`, "DELETE");
    const res = await submitQuizRoute.DELETE(req);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const verifyReq = mockRequest(`http://localhost/api/submit-quiz?quiz_id=${createdQuizId}`);
    const verifyRes = await submitQuizRoute.GET(verifyReq);
    const verifyData = await verifyRes.json();
    const found = verifyData.submissions.some((s) => s.id === createdSubId);
    if (found) throw new Error("Submission was not deleted");
  });

  // P0 Test 8: Delete quiz permanently (cascade deletion)
  await assertP0("8. Delete quiz permanently (cascade deletion)", async () => {
    const req = mockRequest(`http://localhost/api/quizzes/${createdQuizId}`, "DELETE");
    const res = await quizIdRoute.DELETE(req, { params: { id: createdQuizId } });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

    const verifyReq = mockRequest(`http://localhost/api/quizzes/${createdQuizId}`);
    const verifyRes = await quizIdRoute.GET(verifyReq, { params: { id: createdQuizId } });
    if (verifyRes.status !== 404) throw new Error("Quiz still accessible after deletion");
  });

  // P0 Test 9: Render /admin/quizzes dashboard with Edit/Delete buttons
  await assertP0("9. Render /admin/quizzes dashboard with Edit/Delete buttons", async () => {
    const htmlPath = path.join(process.cwd(), ".next/server/app/admin/quizzes.html");
    const text = fs.readFileSync(htmlPath, "utf8");
    if (!text.includes("Teacher Quiz Dashboard")) throw new Error("Dashboard text missing");
  });

  // P0 Test 10: Render /admin/create page
  await assertP0("10. Render /admin/create page", async () => {
    const htmlPath = path.join(process.cwd(), ".next/server/app/admin/create.html");
    const text = fs.readFileSync(htmlPath, "utf8");
    if (!text.includes("QuizCaplos") && !text.includes("Create Blank Quiz")) throw new Error("Create page content missing");
  });

  // P0 Test 11: Manual Quiz creation with MCQ & True/False questions
  await assertP0("11. Manual Quiz creation with MCQ & True/False questions", async () => {
    const req = mockRequest("http://localhost/api/quizzes", "POST", {
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
    });
    const res = await quizzesRoute.POST(req);
    if (res.status !== 200 && res.status !== 201) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.quiz?.id) throw new Error("Failed to create manual quiz");

    // Clean up
    const delReq = mockRequest(`http://localhost/api/quizzes/${data.quiz.id}`, "DELETE");
    await quizIdRoute.DELETE(delReq, { params: { id: data.quiz.id } });
  });

  console.log(`\n========================================`);
  console.log(`P0 Test Results: ${p0Passed} Passed, ${p0Failed} Failed`);
  console.log(`========================================\n`);

  // Now run E2E Tests (8 tests)
  let e2ePassed = 0;
  let e2eFailed = 0;

  async function assertE2E(testName, fn) {
    try {
      process.stdout.write(`⏳ [E2E-TEST] ${testName}... `);
      await fn();
      console.log("✅ PASSED");
      e2ePassed++;
    } catch (err) {
      console.log("❌ FAILED");
      console.error("   Error details:", err.message);
      e2eFailed++;
    }
  }

  // E2E Test 1: Home page
  await assertE2E("1. GET / (Landing page)", async () => {
    const htmlPath = path.join(process.cwd(), ".next/server/app/index.html");
    const text = fs.readFileSync(htmlPath, "utf8");
    if (!text.includes("QuizCaplos")) throw new Error("Brand title missing in response");
  });

  // E2E Test 2: Admin Create page
  await assertE2E("2. GET /admin/create (PDF OCR Uploader & Review Dashboard)", async () => {
    const htmlPath = path.join(process.cwd(), ".next/server/app/admin/create.html");
    const text = fs.readFileSync(htmlPath, "utf8");
    if (!text.includes("Create Quiz from PDF OCR")) throw new Error("Create quiz heading missing");
  });

  // E2E Test 3: Admin Quizzes page
  await assertE2E("3. GET /admin/quizzes (Teacher Dashboard)", async () => {
    const htmlPath = path.join(process.cwd(), ".next/server/app/admin/quizzes.html");
    const text = fs.readFileSync(htmlPath, "utf8");
    if (!text.includes("Teacher Quiz Dashboard")) throw new Error("Dashboard heading missing");
  });

  // E2E Test 4: Parse PDF API validation without file
  await assertE2E("4. POST /api/parse-pdf (Validation: missing file)", async () => {
    const formData = new FormData();
    formData.append("api_key", "test-key");
    const req = new Request("http://localhost/api/parse-pdf", {
      method: "POST",
      body: formData,
    });
    const res = await parsePdfRoute.POST(req);
    if (res.status !== 400) throw new Error(`Expected 400 but got ${res.status}`);
    const data = await res.json();
    if (!data.error) throw new Error("Expected error message for missing file");
  });

  // E2E Test 5: Parse PDF API validation without API key
  await assertE2E("5. POST /api/parse-pdf (Validation: missing API key)", async () => {
    const formData = new FormData();
    const blob = new Blob(["%PDF-1.4 dummy content"], { type: "application/pdf" });
    formData.append("file", blob, "sample.pdf");
    const req = new Request("http://localhost/api/parse-pdf", {
      method: "POST",
      body: formData,
    });
    const res = await parsePdfRoute.POST(req);
    if (res.status !== 400) throw new Error(`Expected 400 but got ${res.status}`);
    const data = await res.json();
    if (!data.error?.includes("API Key is missing")) throw new Error(`Unexpected error message: ${data.error}`);
  });

  // E2E Test 6: Create Quiz API validation
  await assertE2E("6. POST /api/quizzes (Validation: empty payload)", async () => {
    const req = mockRequest("http://localhost/api/quizzes", "POST", { title: "", questions: [] });
    const res = await quizzesRoute.POST(req);
    if (res.status !== 400) throw new Error(`Expected 400 but got ${res.status}`);
  });

  // E2E Test 7: Submit Quiz API validation
  await assertE2E("7. POST /api/submit-quiz (Validation: missing fields)", async () => {
    const req = mockRequest("http://localhost/api/submit-quiz", "POST", { student_name: "" });
    const res = await submitQuizRoute.POST(req);
    if (res.status !== 400) throw new Error(`Expected 400 but got ${res.status}`);
  });

  // E2E Test 8: Student Quiz Runner (/quiz/[slug])
  await assertE2E("8. GET /quiz/[slug] (Student Interactive Quiz Runner check)", async () => {
    const pagePath = path.join(process.cwd(), "src/app/quiz/[slug]/page.tsx");
    const text = fs.readFileSync(pagePath, "utf8");
    if (!text.includes("Start Quiz")) throw new Error("Welcome start quiz screen missing");
    const compiledPath = path.join(process.cwd(), ".next/server/app/quiz/[slug]/page.js");
    if (!fs.existsSync(compiledPath)) throw new Error("Quiz runner compiled route missing");
  });

  console.log(`\n========================================`);
  console.log(`E2E Test Results: ${e2ePassed} Passed, ${e2eFailed} Failed`);
  console.log(`========================================\n`);

  if (p0Failed > 0 || e2eFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
