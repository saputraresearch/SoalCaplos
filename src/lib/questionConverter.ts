import { Question, ParsedQuestion, QuestionType, MatchingPair, CategorizeItem } from "./types";

export interface ConversionReport {
  status: "Sukses" | "Gagal";
  oldType: QuestionType;
  newType: QuestionType;
  uxChange: string;
  adjustedQuestionText: string;
  newDataStructure: string;
  newAnswerKey: string;
  editorNotes: string;
}

export interface ConversionResult {
  convertedQuestion: ParsedQuestion;
  report: ConversionReport;
}

// Helper: Convert question sentence from interrogative to declarative statement
function questionToDeclarative(text: string, correctAnsText: string): string {
  let cleaned = text.trim();
  // Remove question mark
  if (cleaned.endsWith("?")) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Handle Indonesian question words
  const prefixes = [
    { regex: /^apakah\s+/i, replace: "" },
    { regex: /^siapakah\s+/i, replace: "" },
    { regex: /^dimanakah\s+/i, replace: "Tempat " },
    { regex: /^dimana\s+/i, replace: "Tempat " },
    { regex: /^kapankah\s+/i, replace: "Waktu " },
    { regex: /^kapan\s+/i, replace: "Waktu " },
    { regex: /^mengapa\s+/i, replace: "Penyebab " },
    { regex: /^bagaimanakah\s+/i, replace: "Cara " },
    { regex: /^bagaimana\s+/i, replace: "Cara " },
    { regex: /^apa\s+yang\s+dimaksud\s+dengan\s+/i, replace: "" },
    { regex: /^apa\s+/i, replace: "" },
  ];

  for (const p of prefixes) {
    if (p.regex.test(cleaned)) {
      cleaned = cleaned.replace(p.regex, p.replace);
      break;
    }
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // If correct answer text is available, create a definitive statement
  if (correctAnsText && !cleaned.toLowerCase().includes(correctAnsText.toLowerCase())) {
    return `${cleaned} adalah ${correctAnsText}.`;
  }

  return `${cleaned}.`;
}

export function convertQuestionType(
  source: Question | ParsedQuestion,
  targetType: QuestionType
): ConversionResult {
  const oldType: QuestionType = source.question_type || "MULTIPLE_CHOICE";
  const cloned: ParsedQuestion = JSON.parse(JSON.stringify(source));
  cloned.question_type = targetType;

  // Extract old correct answer text
  let oldCorrectText = "";
  if (source.options && source.correct_answer_index !== undefined && source.options[source.correct_answer_index]) {
    oldCorrectText = source.options[source.correct_answer_index];
  }

  let uxChange = "";
  let newDataStructure = "";
  let newAnswerKey = "";
  let editorNotes = "";

  // 1. TARGET: MULTIPLE_CHOICE
  if (targetType === "MULTIPLE_CHOICE") {
    if (oldType === "MULTIPLE_SELECT") {
      uxChange = "Komponen input diubah dari multi-select checkbox menjadi radio button tunggal.";
      const oldKeys = cloned.correct_answers || [cloned.correct_answer_index || 0];
      const primaryKeyIndex = oldKeys[0] || 0;
      cloned.correct_answer_index = primaryKeyIndex;
      cloned.correct_answers = undefined;
      // Ensure exactly 4 options
      if (!cloned.options || cloned.options.length < 4) {
        cloned.options = cloned.options || [];
        while (cloned.options.length < 4) {
          cloned.options.push(`Pengecoh tambahan ${cloned.options.length + 1}`);
        }
      } else if (cloned.options.length > 4) {
        // Keep primary correct and 3 others
        const correctOpt = cloned.options[primaryKeyIndex];
        const others = cloned.options.filter((_, idx) => idx !== primaryKeyIndex).slice(0, 3);
        cloned.options = [correctOpt, ...others];
        cloned.correct_answer_index = 0;
      }
      newDataStructure = `4 Opsi (A, B, C, D): [${cloned.options.join(", ")}]`;
      newAnswerKey = `Opsi ${String.fromCharCode(65 + cloned.correct_answer_index)} (${cloned.options[cloned.correct_answer_index]})`;
      editorNotes = `Dari beberapa kunci jawaban benar sebelumnya, dipilih SATU kunci utama (${newAnswerKey}), dan opsi lainnya dialihkan sebagai pengecoh logis.`;
    } else if (oldType === "MATCHING" && cloned.matching_pairs && cloned.matching_pairs.length > 0) {
      uxChange = "Komponen dropdown pasangan diubah menjadi 4 opsi radio button tunggal.";
      const firstPair = cloned.matching_pairs[0];
      cloned.question_text = `Pasangan atau deskripsi yang tepat untuk "${firstPair.left}" adalah:`;
      const correctOpt = firstPair.right;
      const distractors = cloned.matching_pairs
        .slice(1)
        .map((p) => p.right);
      while (distractors.length < 3) {
        distractors.push(`Alternatif relevan ${distractors.length + 1}`);
      }
      cloned.options = [correctOpt, ...distractors.slice(0, 3)];
      cloned.correct_answer_index = 0;
      cloned.matching_pairs = undefined;
      newDataStructure = `Stimulus dari pasangan ke-1, 4 Opsi: [${cloned.options.join(", ")}]`;
      newAnswerKey = `Opsi A (${cloned.options[0]})`;
      editorNotes = `Diambil pasangan stimulus pertama ("${firstPair.left}") sebagai stimulus soal, pasangannya sebagai kunci jawaban benar, dan pasangan lain dijadikan pengecoh.`;
    } else if (oldType === "CATEGORIZE_ITEMS" && cloned.categorize_items && cloned.categorize_items.length > 0) {
      uxChange = "Komponen keranjang pengelompokan diubah menjadi radio button pilihan ganda.";
      const item = cloned.categorize_items[0];
      cloned.question_text = `Termasuk ke dalam kelompok atau kategori manakah "${item.text}"?`;
      const correctCat = item.category;
      const otherCats = (cloned.categories || []).filter((c) => c !== correctCat);
      const options = [correctCat, ...otherCats];
      while (options.length < 4) {
        options.push(`Kelompok ${String.fromCharCode(65 + options.length)}`);
      }
      cloned.options = options.slice(0, 4);
      cloned.correct_answer_index = 0;
      cloned.categorize_items = undefined;
      cloned.categories = undefined;
      newDataStructure = `4 Pilihan Kategori: [${cloned.options.join(", ")}]`;
      newAnswerKey = `Opsi A (${cloned.options[0]})`;
      editorNotes = `Diambil item pertama ("${item.text}") sebagai subjek soal, kategori aslinya sebagai kunci benar, dan kategori lainnya sebagai opsi pengecoh.`;
    } else {
      uxChange = "Komponen input disesuaikan menjadi radio button pilihan ganda 4 opsi (A, B, C, D).";
      if (!cloned.options || cloned.options.length < 4) {
        cloned.options = [
          oldCorrectText || "Jawaban Tepat",
          "Pengecoh 1",
          "Pengecoh 2",
          "Pengecoh 3",
        ];
        cloned.correct_answer_index = 0;
      }
      newDataStructure = `4 Opsi: [${cloned.options.slice(0, 4).join(", ")}]`;
      newAnswerKey = `Opsi ${String.fromCharCode(65 + (cloned.correct_answer_index || 0))}`;
      editorNotes = "Menyesuaikan struktur opsi menjadi tepat 4 pilihan dengan 1 kunci jawaban benar tunggal.";
    }
  }

  // 2. TARGET: MULTIPLE_SELECT
  else if (targetType === "MULTIPLE_SELECT") {
    uxChange = "Komponen input radio button diubah menjadi checkbox seleksi multi-opsi.";
    // Ensure 5 options (A, B, C, D, E)
    let opts = cloned.options ? [...cloned.options] : [];
    while (opts.length < 5) {
      opts.push(`Pilihan relevan ${opts.length + 1}`);
    }
    opts = opts.slice(0, 5);
    cloned.options = opts;

    const firstKey = cloned.correct_answer_index !== undefined ? cloned.correct_answer_index : 0;
    // Pick or generate second correct answer
    const secondKey = (firstKey + 1) % 5;
    cloned.correct_answers = [firstKey, secondKey].sort((a, b) => a - b);
    cloned.correct_answer_index = firstKey;

    newDataStructure = `5 Opsi (A, B, C, D, E): [${opts.join(", ")}]`;
    newAnswerKey = `Opsi ${cloned.correct_answers.map((k) => String.fromCharCode(65 + k)).join(" & ")}`;
    editorNotes = `Kunci jawaban lama (Opsi ${String.fromCharCode(65 + firstKey)}) dipertahankan sebagai kunci pertama, dan direkomendasikan 1 opsi benar tambahan (Opsi ${String.fromCharCode(65 + secondKey)}) untuk memenuhi syarat pilihan ganda kompleks (minimal 2 kunci benar).`;
  }

  // 3. TARGET: TRUE_OR_FALSE
  else if (targetType === "TRUE_OR_FALSE") {
    uxChange = "Seluruh opsi/kontrol interaktif lama dihapus, digantikan 2 tombol tegas 'Benar' dan 'Salah'.";
    // Convert question text to a declarative affirmative statement
    cloned.question_text = questionToDeclarative(cloned.question_text, oldCorrectText);
    cloned.options = ["Benar", "Salah"];
    cloned.correct_answer_index = 0; // "Benar" based on affirmative statement
    // Clear unused fields
    cloned.correct_answers = undefined;
    cloned.matching_pairs = undefined;
    cloned.reorder_items = undefined;
    cloned.blanks_keywords = undefined;
    cloned.categories = undefined;
    cloned.categorize_items = undefined;
    cloned.label_targets = undefined;
    cloned.hotspot_zone = undefined;

    newDataStructure = "2 Opsi Standar: ['Benar', 'Salah']";
    newAnswerKey = "Benar (Nilai 0)";
    editorNotes = "Kalimat pertanyaan diubah menjadi kalimat pernyataan deklaratif tegas. Seluruh opsi lama dibersihkan dan disederhanakan menjadi penilaian Benar/Salah secara faktual.";
  }

  // 4. TARGET: FILL_IN_THE_BLANKS
  else if (targetType === "FILL_IN_THE_BLANKS") {
    uxChange = "Opsi tombol/pilihan digantikan dengan kotak input teks isian rumpang [___].";
    const keyword = oldCorrectText || "jawaban";
    let text = cloned.question_text.trim();
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      const reg = new RegExp(keyword, "i");
      text = text.replace(reg, "[___]");
    } else {
      if (text.endsWith("?")) text = text.slice(0, -1).trim();
      text = `${text} adalah [___].`;
    }
    cloned.question_text = text;
    cloned.blanks_keywords = [keyword];
    cloned.options = [];
    cloned.correct_answer_index = 0;
    cloned.correct_answers = undefined;

    newDataStructure = `Kalimat Rumpang dengan tag [___] & Kata Kunci: ["${keyword}"]`;
    newAnswerKey = `Kata Kunci Eksak: "${keyword}"`;
    editorNotes = `Kata kunci dari jawaban benar lama ("${keyword}") diekstrak dan disubstitusikan ke dalam posisi rumpang [___]. Guru dapat menambahkan variasi sinonim jika diperlukan.`;
  }

  // 5. TARGET: MATCHING
  else if (targetType === "MATCHING") {
    uxChange = "Komponen pilihan diubah menjadi antarmuka penjodohan kolom stimulus (kiri) dan target (kanan).";
    let pairs: MatchingPair[] = [];
    if (cloned.options && cloned.options.length >= 2) {
      pairs = cloned.options.slice(0, 4).map((opt, idx) => ({
        left: `Stimulus ${idx + 1} (${opt.slice(0, 20)})`,
        right: opt,
      }));
      if (oldCorrectText) {
        pairs[0] = { left: cloned.question_text.slice(0, 35) || "Konsep Utama", right: oldCorrectText };
      }
    } else {
      pairs = [
        { left: "Konsep A", right: "Definisi A" },
        { left: "Konsep B", right: "Definisi B" },
        { left: "Konsep C", right: "Definisi C" },
      ];
    }
    cloned.matching_pairs = pairs;
    cloned.options = [];
    cloned.correct_answer_index = 0;
    cloned.correct_answers = undefined;

    newDataStructure = `${pairs.length} Pasangan Stimulus-Respon: [${pairs.map((p) => `${p.left} ➔ ${p.right}`).join(", ")}]`;
    newAnswerKey = "Pemetaan 1-ke-1 dari seluruh pasangan yang dibuat";
    editorNotes = "Informasi soal diekstrak dan dipecah menjadi pasangan fakta stimulus-respon yang seimbang dan logis.";
  }

  // 6. TARGET: CATEGORIZE_ITEMS
  else if (targetType === "CATEGORIZE_ITEMS") {
    uxChange = "Komponen diubah menjadi kartu-kartu item dan keranjang kolom kelompok kategori.";
    const cat1 = "Kelompok Utama";
    const cat2 = "Kelompok Sekunder";
    const items: CategorizeItem[] = [];

    if (cloned.options && cloned.options.length >= 2) {
      cloned.options.forEach((opt, idx) => {
        items.push({
          text: opt,
          category: idx % 2 === 0 ? cat1 : cat2,
        });
      });
      // Add extra items to reach 6 items
      while (items.length < 6) {
        items.push({
          text: `Item Contoh ${items.length + 1}`,
          category: items.length % 2 === 0 ? cat1 : cat2,
        });
      }
    } else {
      items.push(
        { text: "Item 1", category: cat1 },
        { text: "Item 2", category: cat1 },
        { text: "Item 3", category: cat1 },
        { text: "Item 4", category: cat2 },
        { text: "Item 5", category: cat2 },
        { text: "Item 6", category: cat2 }
      );
    }

    cloned.categories = [cat1, cat2];
    cloned.categorize_items = items;
    cloned.options = [];
    cloned.correct_answer_index = 0;

    newDataStructure = `2 Kategori: [${cat1}, ${cat2}] & ${items.length} Kartu Item`;
    newAnswerKey = `Pengelompokan ${items.length} item ke dalam ${cloned.categories.join(" & ")}`;
    editorNotes = `Opsi dan materi lama dikelompokkan ke dalam 2 payung kategori ("${cat1}" & "${cat2}") dengan pemetaan tanpa ambiguitas.`;
  }

  // Fallback / Other Types (REORDER, OPEN_ENDED, MATH_RESPONSE)
  else if (targetType === "REORDER") {
    uxChange = "Komponen diubah menjadi kartu-kartu urutan kronologis yang dapat digeser naik/turun.";
    const steps = (cloned.options && cloned.options.length >= 3)
      ? cloned.options.slice(0, 4)
      : ["Tahap 1: Persiapan", "Tahap 2: Proses", "Tahap 3: Pengujian", "Tahap 4: Hasil"];
    cloned.reorder_items = steps;
    cloned.correct_order = steps.map((_, i) => i);
    cloned.options = [];
    newDataStructure = `${steps.length} Tahapan Urutan Kronologis`;
    newAnswerKey = `Urutan Indeks: [${cloned.correct_order.map((i) => i + 1).join(", ")}]`;
    editorNotes = "Menata elemen pilihan lama menjadi langkah-langkah tahapan kronologis.";
  } else if (targetType === "OPEN_ENDED") {
    uxChange = "Pilihan dibersihkan, digantikan textarea esai siswa dengan rubrik penilaian.";
    cloned.rubric = [
      oldCorrectText ? `Menyebutkan konsep ${oldCorrectText}` : "Penjelasan materi mendalam",
      "Memberikan argumen logis dan terstruktur",
      "Menggunakan terminologi ilmiah yang tepat",
    ];
    cloned.options = [];
    newDataStructure = `Rubrik Penilaian (${cloned.rubric.length} Kriteria)`;
    newAnswerKey = "Penilaian Subjektif / Evaluasi Guru berdasarkan Rubrik";
    editorNotes = "Opsi objektif dikonversi menjadi esai analitis dengan kriteria rubrik otomatis dari kunci jawaban lama.";
  } else if (targetType === "MATH_RESPONSE") {
    uxChange = "Pilihan dibersihkan, digantikan kotak input angka/formula matematika & langkah solusi.";
    cloned.math_solution = oldCorrectText ? `Hasil akhir: ${oldCorrectText}. Penyelesaian bertahap diuraikan secara analitis.` : "Penyelesaian bertahap";
    cloned.options = [];
    newDataStructure = "Solusi Formula / Langkah Matematis";
    newAnswerKey = oldCorrectText || "Formula Matematis";
    editorNotes = "Kunci jawaban objektif dialihkan menjadi solusi formula matematika eksak.";
  }

  // Rule 5: Lossless Asset Migration - Retain image objects safely
  cloned.image_url = source.image_url !== undefined ? source.image_url : null;
  cloned.image_source_type = source.image_source_type || "NONE";
  cloned.alt_text = source.alt_text || "";
  if (source.image_url) {
    editorNotes += ` Aset gambar (${source.image_source_type || "Tersimpan"}) berhasil dipertahankan secara lossless.`;
  }

  const report: ConversionReport = {
    status: "Sukses",
    oldType,
    newType: targetType,
    uxChange,
    adjustedQuestionText: cloned.question_text,
    newDataStructure,
    newAnswerKey,
    editorNotes,
  };

  return {
    convertedQuestion: cloned,
    report,
  };
}
