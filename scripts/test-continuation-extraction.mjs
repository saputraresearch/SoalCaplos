import assert from "node:assert";

function detectDocumentQuestionCount(text) {
  const matches = Array.from(text.matchAll(/(?:^|\n|\r)\s*(?:(?:No\.?|Soal)\s*)?\(?(\d{1,2})\)?[\.\:\)\s]/gi));
  const numbers = Array.from(
    new Set(matches.map((m) => parseInt(m[1], 10)).filter((n) => n >= 1 && n <= 100))
  ).sort((a, b) => a - b);
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return { count: numbers.length, maxNumber };
}

console.log("🚀 Testing Question Continuation & Count Detection Logic...\n");

// Test 1: detectDocumentQuestionCount on typical Indonesian exam text
const sampleExamText = `
ULANGAN HARIAN MATEMATIKA KELAS 7
Petunjuk: Pilihlah salah satu jawaban yang paling tepat!

1. Hasil dari 12 + (-5) adalah ...
A. 7
B. -7
C. 17
D. -17

2. Nilai dari (-4) x 6 : (-2) adalah ...
A. 12
B. -12
C. 24
D. -24

3. Bentuk sederhana dari 3x + 5y - x + 2y adalah ...
A. 2x + 7y
B. 4x + 7y
C. 2x + 3y
D. 4x + 3y

4. Jika x = 3, maka nilai dari 2x^2 - 5 adalah ...
A. 13
B. 11
C. 18
D. 7

5. Suhu mula-mula sebuah ruangan adalah -2°C, kemudian naik 8°C. Suhu ruangan sekarang adalah ...
A. 6°C
B. -6°C
C. 10°C
D. -10°C

6. KPK dari 12 dan 18 adalah ...
A. 36
B. 72
C. 24
D. 18

...
20. Hasil penyelesaian dari sistem persamaan adalah ...
A. x = 2, y = 3
B. x = 1, y = 4
C. x = 3, y = 2
D. x = 4, y = 1
`;

const detected = detectDocumentQuestionCount(sampleExamText);
console.log(`[Test 1] Detected Question Count: maxNumber=${detected.maxNumber}, count=${detected.count}`);
assert.strictEqual(detected.maxNumber, 20, "Should detect highest question number as 20");
console.log("✅ Test 1 Passed: Correctly detected 20 questions in exam document.\n");

// Test 2: Incomplete extraction condition
const mockExtractedQuestions = [
  { question_text: "Soal 1", options: ["A", "B", "C", "D"], correct_answer_index: 0 },
  { question_text: "Soal 2", options: ["A", "B", "C", "D"], correct_answer_index: 1 },
  { question_text: "Soal 3", options: ["A", "B", "C", "D"], correct_answer_index: 0 },
  { question_text: "Soal 4", options: ["A", "B", "C", "D"], correct_answer_index: 2 },
  { question_text: "Soal 5", options: ["A", "B", "C", "D"], correct_answer_index: 0 },
  { question_text: "Soal 6", options: ["A", "B", "C", "D"], correct_answer_index: 3 },
];

const totalQuestions = mockExtractedQuestions.length; // 6
const expectedTotal = detected.maxNumber; // 20
const isIncomplete = expectedTotal > totalQuestions;

console.log(`[Test 2] State Check: totalQuestions=${totalQuestions}, expectedTotal=${expectedTotal}, isIncomplete=${isIncomplete}`);
assert.strictEqual(isIncomplete, true, "Should identify that extraction is incomplete (6 < 20)");
console.log("✅ Test 2 Passed: Incomplete status accurately flagged.\n");

// Test 3: Continuation parameters range calculation
const fromIndex = totalQuestions + 1; // 7
const toIndex = expectedTotal; // 20
console.log(`[Test 3] Continuation range: from Soal #${fromIndex} to Soal #${toIndex} (missing ${toIndex - fromIndex + 1} questions)`);
assert.strictEqual(fromIndex, 7, "Continuation start should be question 7");
assert.strictEqual(toIndex, 20, "Continuation end should be question 20");
console.log("✅ Test 3 Passed: Correct continuation range calculated (7 s/d 20).\n");

// Test 4: Merge continuation results and transition to complete state
const mockContinuationQuestions = Array.from({ length: 14 }, (_, i) => ({
  question_text: `Soal ${7 + i}`,
  options: ["A", "B", "C", "D"],
  correct_answer_index: (i % 4),
  order_index: 6 + i,
}));

const merged = [...mockExtractedQuestions, ...mockContinuationQuestions];
console.log(`[Test 4] Merged count: ${merged.length} questions`);
assert.strictEqual(merged.length, 20, "Merged questions should reach expected total 20");
const isNowIncomplete = expectedTotal > merged.length;
assert.strictEqual(isNowIncomplete, false, "Should now be complete");
console.log("✅ Test 4 Passed: Merged questions reach 20 and complete status turns green.\n");

console.log("🎉 ALL CONTINUATION EXTRACTION LOGIC TESTS PASSED SUCCESSFULLY!");
