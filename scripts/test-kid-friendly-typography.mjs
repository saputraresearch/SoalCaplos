import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("=== Testing Kid-Friendly Elementary (SD) Typography & Story Separation ===\n");

  const { parseQuestionStimulus } = await import("../src/lib/storyQuestionParser.ts");

  // 1. Test exact text from user attachment
  console.log("⏳ [TEST 1] Testing exact reading passage from user attachment...");
  const userText =
    "Di SD Nusantara, para siswa berasal dari berbagai suku bangsa, seperti suku Jawa, Minang, Bugis, dan Batak. Meskipun berbeda latar belakang, mereka tetap hidup rukun dan saling menghargai. Sekolah juga sering mengadakan kegiatan seperti pentas seni budaya dan diskusi antar kelas untuk memperkenalkan kebudayaan daerah masing-masing. Guru selalu menanamkan sikap toleransi, menghormati perbedaan, dan kerja sama dalam kegiatan sehari-hari. Upaya yang dilakukan sekolah dalam menjaga keanekaragaman suku bangsa menurut teks di atas adalah ....";

  const result1 = parseQuestionStimulus(userText);
  assert(result1.isStory === true, "Detected as reading story stimulus");
  assert(result1.storyParagraphs.length >= 2, "Split into at least 2 airy paragraphs for children");
  assert(
    result1.questionPrompt.includes("Upaya yang dilakukan sekolah"),
    "Separated actual question prompt cleanly"
  );
  assert(
    !result1.storyParagraphs.join(" ").includes("Upaya yang dilakukan sekolah dalam menjaga"),
    "Story paragraphs do not contain question prompt"
  );
  console.log("✅ [TEST 1] PASSED: User text successfully split into story paragraphs and clean question prompt!");
  console.log("   • Paragraf 1:", result1.storyParagraphs[0]);
  console.log("   • Paragraf 2:", result1.storyParagraphs[1]);
  console.log("   • Pertanyaan Inti:", result1.questionPrompt);

  // 2. Test text with explicit newlines
  console.log("\n⏳ [TEST 2] Testing text with explicit newlines...");
  const multilineText = `Kancil berjalan di pinggir hutan mencari makanan segar. Tiba-tiba ia melihat pohon apel di seberang sungai yang deras.

Kancil kemudian memanggil para buaya untuk berbaris rapi agar bisa dihitung.

Bagaimanakah cara Kancil menyeberangi sungai?`;

  const result2 = parseQuestionStimulus(multilineText);
  assert(result2.isStory === true, "Detected as story");
  assert(result2.storyParagraphs.length === 2, "2 story paragraphs preserved");
  assert(result2.questionPrompt === "Bagaimanakah cara Kancil menyeberangi sungai?", "Prompt extracted");
  console.log("✅ [TEST 2] PASSED: Explicit paragraphs preserved!");

  // 3. Test short question (should NOT be classified as story)
  console.log("\n⏳ [TEST 3] Testing short direct question...");
  const shortText = "Berapakah hasil perkalian dari 12 x 5?";
  const result3 = parseQuestionStimulus(shortText);
  assert(result3.isStory === false, "Short question is not a story");
  assert(result3.questionPrompt === shortText, "Prompt matches full text");
  console.log("✅ [TEST 3] PASSED: Short questions stay clean and direct!");

  // 4. Test API Quiz creation with story question & retrieval
  console.log("\n⏳ [TEST 4] Testing Quiz API persistence with story question...");
  const createRes = await fetch(`${BASE_URL}/api/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Kuis PPKn SD Keberagaman Suku",
      questions: [
        {
          question_text: userText,
          question_type: "MULTIPLE_CHOICE",
          options: [
            "melarang siswa menampilkan budaya masing-masing",
            "menyuruh siswa hanya bergaul dengan teman satu suku",
            "mengadakan pentas seni budaya dan menanamkan sikap toleransi",
            "membatasi kegiatan agar tidak terjadi perbedaan pendapat",
          ],
          correct_answer_index: 2,
          explanation: "Kegiatan pentas seni budaya memupuk persatuan dalam keberagaman.",
        },
      ],
    }),
  });

  const createData = await createRes.json();
  assert(createRes.ok, "POST /api/quizzes succeeded");
  const quizId = createData.quiz.id;
  const slug = createData.quiz.slug;

  const runnerRes = await fetch(`${BASE_URL}/quiz/${slug}`);
  assert(runnerRes.ok, "Student runner route loads with HTTP 200 OK");

  // Clean up
  await fetch(`${BASE_URL}/api/quizzes/${quizId}`, { method: "DELETE" });
  console.log("✅ [TEST 4] PASSED: Student runner loads story question cleanly!");

  console.log("\n========================================================");
  console.log("🎉 ALL KID-FRIENDLY TYPOGRAPHY TESTS PASSED SUCCESSFULLY!");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
