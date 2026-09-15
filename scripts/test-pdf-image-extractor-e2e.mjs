import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import sharp from "sharp";

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("=== Starting PDF Question & Option Image Extraction E2E Test Suite ===\n");

  // 1. Test Sharp Cropping with Normalized Coordinates [ymin, xmin, ymax, xmax] (0-1000)
  console.log("⏳ [TEST 1] Testing Sharp Normalized Bounding Box Cropping...");
  const svgContent = `
    <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="800" fill="#f8fafc" />
      <text x="50" y="50" font-family="Arial" font-size="20" font-weight="bold" fill="#0f172a">
        Soal Evaluasi Biologi &amp; Geometri
      </text>
      <!-- Diagram 1 (Question Diagram) around y=100..300, x=100..500 -->
      <rect x="100" y="100" width="400" height="200" rx="12" fill="#e0e7ff" stroke="#6366f1" stroke-width="3" />
      <circle cx="300" cy="200" r="60" fill="#4f46e5" />
      <text x="300" y="208" font-family="Arial" font-size="16" fill="#ffffff" text-anchor="middle">
        Diagram Daur Hidup
      </text>

      <!-- Option B Image around y=500..650, x=150..350 -->
      <rect x="150" y="500" width="200" height="150" rx="8" fill="#dcfce7" stroke="#22c55e" stroke-width="2" />
      <polygon points="250,520 200,620 300,620" fill="#16a34a" />
      <text x="250" y="640" font-family="Arial" font-size="14" fill="#15803d" text-anchor="middle">
        Pilihan B: Segitiga
      </text>
    </svg>
  `;

  const pngPageBuffer = await sharp(Buffer.from(svgContent)).png().toBuffer();
  const meta = await sharp(pngPageBuffer).metadata();
  assert(meta.width === 600 && meta.height === 800, "Rendered page has 600x800 dimensions");

  // Diagram coordinates in 0-1000 scale
  const diagramBox = [125, 166, 375, 833];
  const croppedDiagram = await sharp(pngPageBuffer)
    .extract({
      left: Math.round((diagramBox[1] / 1000) * meta.width),
      top: Math.round((diagramBox[0] / 1000) * meta.height),
      width: Math.round(((diagramBox[3] - diagramBox[1]) / 1000) * meta.width),
      height: Math.round(((diagramBox[2] - diagramBox[0]) / 1000) * meta.height),
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  const diagramDataUri = `data:image/jpeg;base64,${croppedDiagram.toString("base64")}`;
  assert(diagramDataUri.startsWith("data:image/jpeg;base64,"), "Diagram data URI is valid");
  console.log("✅ [TEST 1] PASSED: Diagram cropped into valid Data URI (size:", croppedDiagram.length, "bytes)");

  // 2. Test Option Image Cropping
  console.log("⏳ [TEST 2] Testing Option Image Cropping...");
  const optionBox = [625, 250, 812, 583];
  const croppedOption = await sharp(pngPageBuffer)
    .extract({
      left: Math.round((optionBox[1] / 1000) * meta.width),
      top: Math.round((optionBox[0] / 1000) * meta.height),
      width: Math.round(((optionBox[3] - optionBox[1]) / 1000) * meta.width),
      height: Math.round(((optionBox[2] - optionBox[0]) / 1000) * meta.height),
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  const optionDataUri = `data:image/jpeg;base64,${croppedOption.toString("base64")}`;
  assert(optionDataUri.startsWith("data:image/jpeg;base64,"), "Option image data URI is valid");
  console.log("✅ [TEST 2] PASSED: Option image cropped into valid Data URI (size:", croppedOption.length, "bytes)");

  // 3. Test Quiz Persistence with Question & Option Images via API
  console.log("⏳ [TEST 3] Testing POST /api/quizzes with Question Diagram & Option Images...");
  const quizPayload = {
    title: "Ujian Sains & Geometri dengan Gambar",
    status: "published",
    questions: [
      {
        question_text: "Perhatikan diagram berikut. Bagian yang ditunjukkan oleh warna ungu adalah...",
        question_type: "MULTIPLE_CHOICE",
        image_url: diagramDataUri,
        image_source_type: "PASTE_UPLOAD",
        alt_text: "Diagram Daur Hidup Lingkaran Ungu",
        options: ["Pilihan A (Teks)", "Pilihan B (Gambar Segitiga)", "Pilihan C (Teks)", "Pilihan D (Teks)"],
        option_items: [
          {
            option_letter: "A",
            text: "Pilihan A (Teks)",
            image_source_type: "NONE",
            image_url: "",
            alt_text: "",
            is_correct: false,
          },
          {
            option_letter: "B",
            text: "Pilihan B (Gambar Segitiga)",
            image_source_type: "PASTE_UPLOAD",
            image_url: optionDataUri,
            alt_text: "Gambar Bangun Segitiga Hijau",
            is_correct: true,
          },
          {
            option_letter: "C",
            text: "Pilihan C (Teks)",
            image_source_type: "NONE",
            image_url: "",
            alt_text: "",
            is_correct: false,
          },
          {
            option_letter: "D",
            text: "Pilihan D (Teks)",
            image_source_type: "NONE",
            image_url: "",
            alt_text: "",
            is_correct: false,
          },
        ],
        correct_answer_index: 1,
        explanation: "Pilihan B menampilkan segitiga hijau sesuai gambar.",
      },
    ],
  };

  const createRes = await fetch(`${BASE_URL}/api/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quizPayload),
  });

  const createData = await createRes.json();
  assert(createRes.ok, "POST /api/quizzes succeeded");
  assert(createData.quiz && createData.quiz.id, "Quiz created with ID");
  const quizId = createData.quiz.id;
  const slug = createData.quiz.slug;
  console.log("✅ [TEST 3] PASSED: Quiz created successfully with ID:", quizId);

  // 4. Test GET /api/quizzes/[id] or GET /api/quizzes/[slug] verifying image persistence
  console.log("⏳ [TEST 4] Testing GET /api/quizzes/[slug] to verify Question & Option Image retrieval...");
  const getRes = await fetch(`${BASE_URL}/api/quizzes/${slug}`);
  const getData = await getRes.json();
  assert(getRes.ok, "GET /api/quizzes/[slug] succeeded");
  assert(Array.isArray(getData.questions) && getData.questions.length === 1, "Returned 1 question");

  const q = getData.questions[0];
  assert(q.image_url && q.image_url.startsWith("data:image/jpeg;base64,"), "Question image_url preserved");
  assert(q.alt_text === "Diagram Daur Hidup Lingkaran Ungu", "Question alt_text preserved");
  assert(q.image_source_type === "PASTE_UPLOAD", "Question image_source_type preserved");

  assert(Array.isArray(q.option_items) && q.option_items.length === 4, "Option items preserved with 4 options");
  assert(q.option_items[1].image_url && q.option_items[1].image_url.startsWith("data:image/jpeg;base64,"), "Option B image_url preserved");
  assert(q.option_items[1].alt_text === "Gambar Bangun Segitiga Hijau", "Option B alt_text preserved");
  assert(q.option_items[1].is_correct === true, "Option B is_correct preserved");
  assert(q.option_items[0].image_url === "", "Option A has empty image_url as expected");
  console.log("✅ [TEST 4] PASSED: Question & Option Images verified on student runner endpoint!");

  // 5. Clean up quiz
  console.log("⏳ [TEST 5] Cleaning up created test quiz...");
  const delRes = await fetch(`${BASE_URL}/api/quizzes/${quizId}`, { method: "DELETE" });
  assert(delRes.ok, "Quiz deleted cleanly");
  console.log("✅ [TEST 5] PASSED: Test quiz deleted cleanly");

  console.log("\n========================================================");
  console.log("🎉 ALL 5 PDF QUESTION & OPTION IMAGE TESTS PASSED!");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
