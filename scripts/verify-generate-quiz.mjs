const BASE_URL = "http://localhost:3000";

async function testGenerateQuiz() {
  console.log("Testing POST /api/generate-quiz with invalid / missing keys...\n");

  // Test Case A: Missing API key
  const resMissing = await fetch(`${BASE_URL}/api/generate-quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: "Fotosintesis", count: 2 }),
  });
  const dataMissing = await resMissing.json();
  console.log("Missing Key Response Status:", resMissing.status);
  console.log("Missing Key Response Body:", JSON.stringify(dataMissing, null, 2));

  // Test Case B: Invalid API key
  const resInvalid = await fetch(`${BASE_URL}/api/generate-quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gemini-api-key": "AIzaSyFakeKeyInvalid12345",
    },
    body: JSON.stringify({ topic: "Fotosintesis", count: 2 }),
  });
  const dataInvalid = await resInvalid.json();
  console.log("\nInvalid Key Response Status:", resInvalid.status);
  console.log("Invalid Key Response Body:", JSON.stringify(dataInvalid, null, 2));
}

testGenerateQuiz().catch(console.error);
