import { ParsedQuestion, QuestionType } from "./types";

export function createDefaultQuestion(type: QuestionType): ParsedQuestion {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return {
        question_type: "MULTIPLE_CHOICE",
        question_text: "",
        options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
        correct_answer_index: 0,
        explanation: "",
      };
    case "MULTIPLE_SELECT":
      return {
        question_type: "MULTIPLE_SELECT",
        question_text: "",
        options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D", "Pilihan E"],
        correct_answer_index: 0,
        correct_answers: [0, 1],
        explanation: "",
      };
    case "TRUE_OR_FALSE":
      return {
        question_type: "TRUE_OR_FALSE",
        question_text: "",
        options: ["Benar", "Salah"],
        correct_answer_index: 0,
        explanation: "",
      };
    case "MATCHING":
      return {
        question_type: "MATCHING",
        question_text: "Pasangkan pernyataan di kolom kiri dengan jawaban yang sesuai di kolom kanan.",
        options: [],
        correct_answer_index: 0,
        matching_pairs: [
          { left: "Istilah / Konsep 1", right: "Definisi / Pasangan 1" },
          { left: "Istilah / Konsep 2", right: "Definisi / Pasangan 2" },
          { left: "Istilah / Konsep 3", right: "Definisi / Pasangan 3" },
        ],
        explanation: "",
      };
    case "REORDER":
      return {
        question_type: "REORDER",
        question_text: "Urutkan tahapan-tahapan berikut dari awal hingga akhir dengan benar.",
        options: [],
        correct_answer_index: 0,
        reorder_items: ["Tahap Persiapan", "Tahap Pelaksanaan", "Tahap Evaluasi", "Tahap Laporan"],
        correct_order: [0, 1, 2, 3],
        explanation: "",
      };
    case "FILL_IN_THE_BLANKS":
      return {
        question_type: "FILL_IN_THE_BLANKS",
        question_text: "Proses tumbuhan hijau mengolah makanan dengan bantuan cahaya matahari dinamakan [___].",
        options: [],
        correct_answer_index: 0,
        blanks_keywords: ["Fotosintesis"],
        explanation: "",
      };
    case "OPEN_ENDED":
      return {
        question_type: "OPEN_ENDED",
        question_text: "Jelaskan bagaimana dampak perubahan iklim terhadap ekosistem laut dan berikan solusi nyata.",
        options: [],
        correct_answer_index: 0,
        rubric: [
          "Menjelaskan kenaikan suhu air laut dan pengasaman samudra",
          "Menyebutkan dampak pemutihan karang (coral bleaching)",
          "Memberikan solusi konservasi atau reduksi emisi karbon",
        ],
        explanation: "",
      };
    case "MATH_RESPONSE":
      return {
        question_type: "MATH_RESPONSE",
        question_text: "Tentukan himpunan penyelesaian dari persamaan kuadrat x^2 - 5x + 6 = 0.",
        options: [],
        correct_answer_index: 0,
        math_solution: "x = 2 atau x = 3",
        explanation: "Faktorisasi: (x - 2)(x - 3) = 0 sehingga x = 2 atau x = 3.",
      };
    case "IMAGE_LABELING":
      return {
        question_type: "IMAGE_LABELING",
        question_text: "Pasangkan setiap label bagian tumbuhan ke titik penanda (pin) yang tepat pada gambar!",
        image_context: "Diagram Anatomi Struktur Bagian Tumbuhan (Akar, Batang, Daun, Bunga)",
        image_url: "https://images.unsplash.com/photo-1545241047-6083a3684587?w=800&auto=format&fit=crop&q=80",
        options: ["Bunga", "Daun", "Batang", "Akar"],
        correct_answer_index: 0,
        label_targets: [
          { id: "pin-1", label: "Bunga", x: 50, y: 15, target_name: "Bagian Pucuk / Bunga" },
          { id: "pin-2", label: "Daun", x: 75, y: 40, target_name: "Helai Daun" },
          { id: "pin-3", label: "Batang", x: 50, y: 55, target_name: "Batang Utama" },
          { id: "pin-4", label: "Akar", x: 50, y: 85, target_name: "Sistem Perakaran Bawah Tanah" },
        ],
        explanation: "Struktur tumbuhan terdiri dari bunga di pucuk, daun, batang penyokong, dan akar di bawah tanah.",
      };
    case "IMAGE_HOTSPOT":
      return {
        question_type: "IMAGE_HOTSPOT",
        question_text: "Ketuk/klik pada area daun yang menjadi tempat utama berlangsungnya fotosintesis!",
        image_context: "Foto Detail Struktur Tumbuhan Hijau",
        image_url: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80",
        options: ["Zona Daun Hijau"],
        correct_answer_index: 0,
        hotspot_zone: {
          x: 50,
          y: 45,
          radius: 18,
          description: "Area helai daun hijau yang mengandung klorofil",
        },
        explanation: "Fotosintesis berlangsung di jaringan mesofil daun yang kaya akan kloroplas penangkap cahaya.",
      };
    case "CATEGORIZE_ITEMS":
      return {
        question_type: "CATEGORIZE_ITEMS",
        question_text: "Kelompokkan setiap item berikut ke dalam kategori Makhluk Hidup atau Benda Mati yang tepat!",
        options: [],
        correct_answer_index: 0,
        categories: ["Makhluk Hidup", "Benda Mati"],
        categorize_items: [
          { text: "Kucing", category: "Makhluk Hidup" },
          { text: "Pohon Kelapa", category: "Makhluk Hidup" },
          { text: "Bakteri", category: "Makhluk Hidup" },
          { text: "Batu Kali", category: "Benda Mati" },
          { text: "Buku Tulis", category: "Benda Mati" },
          { text: "Air Sungai", category: "Benda Mati" },
        ],
        explanation: "Makhluk hidup bernapas, tumbuh, dan berkembang biak; sedangkan benda mati tidak memiliki ciri kehidupan tersebut.",
      };
    default:
      return {
        question_type: "MULTIPLE_CHOICE",
        question_text: "",
        options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
        correct_answer_index: 0,
        explanation: "",
      };
  }
}
