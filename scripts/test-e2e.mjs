// End-to-End automated validation script
import fs from "fs";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("🚀 Starting End-to-End Verification Suite for QuizCaplos...\n");
  let passed = 0;
  let failed = 0;

  async function assert(testName, fn) {
    try {
      process.stdout.write(`⏳ Testing: ${testName}... `);
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (err) {
      console.log("❌ FAILED");
      console.error("   Error:", err.message);
      failed++;
    }
  }

  // Test 1: Home page
  await assert("GET / (Landing page)", async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (!text.includes("QuizCaplos")) throw new Error("Brand title missing in response");
  });

  // Test 2: Admin Create page
  await assert("GET /admin/create (PDF OCR Uploader & Review Dashboard)", async () => {
    const res = await fetch(`${BASE_URL}/admin/create`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (!text.includes("Create Quiz from PDF OCR")) throw new Error("Create quiz heading missing");
  });

  // Test 3: Admin Quizzes page
  await assert("GET /admin/quizzes (Teacher Dashboard)", async () => {
    const res = await fetch(`${BASE_URL}/admin/quizzes`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // Test 4: Parse PDF API validation without file
  await assert("POST /api/parse-pdf (Validation: missing file)", async () => {
    const formData = new FormData();
    formData.append("api_key", "test-key");
    const res = await fetch(`${BASE_URL}/api/parse-pdf`, {
      method: "POST",
      body: formData,
    });
    if (res.status !== 400) throw new Error(`Expected 400 but got ${res.status}`);
    const data = await res.json();
    if (!data.error) throw new Error("Expected error message for missing file");
  });

  // Test 5: Parse PDF API validation without API key
  await assert("POST /api/parse-pdf (Validation: missing API key)", async () => {
    const formData = new FormData();
    const blob = new Blob(["%PDF-1.4 dummy content"], { type: "application/pdf" });
    formData.append("file", blob, "sample.pdf");
    const res = await fetch(`${BASE_URL}/api/parse-pdf`, {
      method: "POST",
      body: formData,
    });
    if (res.status !== 400) throw new Error(`Expected 400 but got ${res.status}`);
    const data = await res.json();
    if (!data.error?.includes("API Key is missing")) throw new Error(`Unexpected error message: ${data.error}`);
  });

  // Test 6: Create Quiz API validation
  await assert("POST /api/quizzes (Validation: empty payload)", async () => {
    const res = await fetch(`${BASE_URL}/api/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", questions: [] }),
    });
    if (res.status !== 400) throw new Error(`Expected 400 but got ${res.status}`);
  });

  // Test 7: Submit Quiz API validation
  await assert("POST /api/submit-quiz (Validation: missing fields)", async () => {
    const res = await fetch(`${BASE_URL}/api/submit-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_name: "" }),
    });
    if (res.status !== 400) throw new Error(`Expected 400 but got ${res.status}`);
  });

  // Test 8: Student Quiz Runner (/quiz/demo)
  await assert("GET /quiz/demo (Student Interactive Quiz Runner)", async () => {
    const res = await fetch(`${BASE_URL}/quiz/demo`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (!text.includes("Start Quiz")) throw new Error("Welcome start quiz screen missing");
  });

  console.log(`\n========================================`);
  console.log(`E2E Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
