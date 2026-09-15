# 🎓 SoalCaplos - AI Quiz Engine & Interactive Student Runner

<div align="center">

![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_AI-8E75B2?style=for-the-badge&logo=google)
![Vercel Ready](https://img.shields.io/badge/Vercel-Ready_24%2F7-black?style=for-the-badge&logo=vercel)

**Platform Pembuat Kuis & Asesmen Interaktif Cerdas Berbasis AI yang Ramah Anak (Khususnya Tingkat Sekolah Dasar / SD).**  
*Mendukung ekstraksi soal otomatis dari PDF lengkap dengan pemotongan gambar diagram, opsi bergambar, dan 11 tipe soal gamifikasi interaktif.*

</div>

---

## 📖 Daftar Isi
- [Tentang Project](#-tentang-project)
- [Fitur Utama](#-fitur-utama)
  - [1. Ekstraksi Cerdas PDF (OCR & Multimodal Vision)](#1-ekstraksi-cerdas-pdf-ocr--multimodal-vision)
  - [2. 11 Jenis Soal Interaktif Lengkap](#2-11-jenis-soal-interaktif-lengkap)
  - [3. Ergonomi Bacaan Ramah Anak SD (Kid-Friendly UI)](#3-ergonomi-bacaan-ramah-anak-sd-kid-friendly-ui)
  - [4. Dashboard Guru & Editor Modal Interaktif](#4-dashboard-guru--editor-modal-interaktif)
  - [5. Arsitektur Dual Storage (Supabase Cloud + Local Backup)](#5-arsitektur-dual-storage-supabase-cloud--local-backup)
- [Tech Stack](#-tech-stack)
- [Struktur Folder](#-struktur-folder)
- [Panduan Instalasi & Menjalankan Lokal](#-panduan-instalasi--menjalankan-lokal)
- [Panduan Deployment ke Vercel (Online 24/7)](#-panduan-deployment-ke-vercel-online-247)
- [Lisensi & Kontribusi](#-lisensi)

---

## 💡 Tentang Project

**SoalCaplos** lahir untuk menyelesaikan masalah umum dalam pembuatan kuis digital di sekolah:
1. **Guru menghabiskan waktu berjam-jam** menyalin soal dari lembar PDF ujian cetak ke aplikasi kuis.
2. **Diagram gambar dan stimulus visual sering tertinggal** atau sulit dipotong satu per satu.
3. **Siswa (terutama anak SD) cepat jenuh dan lelah** melihat tampilan soal teks hitam pekat tanpa spasi paragraf atau tanpa interaktivitas.

Dengan **SoalCaplos**, guru cukup mengunggah file PDF ujian atau mengetik topik soal. AI Google Gemini akan mengekstrak butir soal, mendeteksi kunci jawaban, memotong diagram stimulus & pilihan bergambar secara presisi, lalu menyajikannya ke dalam tampilan gamifikasi yang menyenangkan bagi siswa.

---

## ✨ Fitur Utama

### 1. Ekstraksi Cerdas PDF (OCR & Multimodal Vision)
- **Ekstraksi Otomatis dari PDF**: Membaca naskah ujian resmi sekolah, bank soal, maupun buku teks.
- **Pemotongan Diagram Soal Otomatis**: Mendeteksi bounding-box diagram (`[ymin, xmin, ymax, xmax]`) dan memotong stimulus gambar langsung dari PDF dengan resolusi tinggi menggunakan `pdftoppm` & `sharp`.
- **Ekstraksi Opsi Bergambar**: Jika pilihan jawaban A, B, C, D berupa gambar/simbol, sistem secara otomatis memotong masing-masing opsi menjadi pilihan jawaban bergambar mandiri.
- **Auto-Deteksi Soal Isian**: Soal isian rumpang atau soal tanpa opsi tidak akan dipaksa menjadi pilihan ganda, melainkan otomatis dikonversi ke tipe **Isian Singkat / Isian Rumpang**.
- **Generator Pengecoh AI (Smart Distractor)**: Membantu guru membuat pilihan jawaban pengecoh yang masuk akal dan mendidik sesuai jenjang kelas siswa.

---

### 2. 11 Jenis Soal Interaktif Lengkap

Siswa tidak hanya disuguhi pilihan ganda biasa, melainkan 11 mekanisme interaktif:

| No | Tipe Soal | Mekanisme Interaktif Siswa |
| :---: | :--- | :--- |
| 1 | **Pilihan Ganda (MCQ)** | Tombol pilihan warna-warni dinamis (2 hingga 6 opsi). |
| 2 | **Pilihan Ganda Kompleks (Multi-Select)** | Siswa dapat memilih lebih dari satu jawaban benar dengan kotak centang sebelum mengirim jawaban. |
| 3 | **Benar / Salah (True/False)** | Dua tombol taktil besar dengan ikon verifikasi visual. |
| 4 | **Menjodohkan (Matching)** | **Drag & Drop** dan **Tap-to-Slot** interaktif. Dilengkapi validasi 1-to-1 (opsi yang sudah dipasangkan tidak bisa dipilih ganda). |
| 5 | **Urutan Kronologis (Reorder)** | **Ramah Anak SD**: Mode **Tap-to-Swap** (ketuk kartu A lalu ketuk kartu B untuk bertukar posisi secara instan), drag handle, dan nomor langkah berurutan dengan alur panah. |
| 6 | **Isian Rumpang (Fill in the Blanks)** | **Dukungan Multi-Blank**: Teks kalimat memiliki kapsul pratinjau langsung (①, ②) yang terisi otomatis saat siswa mengetik di kolom isian bernomor. |
| 7 | **Soal Terbuka (Open Ended / Esai)** | Kotak esai lapang dengan kriteria rubrik penilaian transparan. |
| 8 | **Jawaban Matematika (Math Response)** | Input numerik dan formula matematika dengan visualisasi langkah penyelesaian. |
| 9 | **Label Diagram (Image Labeling)** | Pin interaktif pada kanvas diagram gambar yang dapat dipasangkan dengan label kata. |
| 10 | **Titik Fokus Gambar (Image Hotspot)** | Siswa mengetuk bagian tertentu pada gambar (contoh: "Tunjukkan letak paru-paru") dengan deteksi radius presisi. |
| 11 | **Pengelompokan Kategori (Categorize Items)** | Wadah kategori warna-warni untuk mengelompokkan kartu item (contoh: Karnivora vs Herbivora). |

---

### 3. Ergonomi Bacaan Ramah Anak SD (Kid-Friendly UI)
- **Pemisahan Teks Cerita/Wacana Otomatis**: Naskah bacaan panjang dianalisis secara linguistik dan dipisahkan dari kalimat pertanyaan utama.
- **Kartu Wacana Hangat (`amber-50`)**: Ditampilkan dalam kartu buku cerita berwarna lembut dengan spasi antarparagraf yang lapang (`leading-relaxed`) agar mata anak tidak lelah.
- **Kartu Pertanyaan Terpisah (`indigo-50`)**: Kalimat tanya diletakkan di kotak sorot tersendiri sehingga siswa langsung memahami apa yang ditanyakan.

---

### 4. Dashboard Guru & Editor Modal Interaktif
- **Mode Pratinjau Guru vs Mode Resmi Siswa**:
  - `Draft`: Menampilkan banner pratinjau untuk guru agar bisa mengecek soal terlebih dahulu.
  - `Published`: Tampilan kuis resmi dan bersih 100% untuk siswa.
  - **Toggle 1-Klik**: Ubah status Draft ⇄ Published langsung dari Dashboard atau saat sedang preview kuis.
- **Editor Soal Terfokus (Modal-Based Editor)**: Edit soal tanpa terganggu form panjang; dilengkapi fitur *Batal & Kembalikan (Revert)* jika tidak ingin menyimpan perubahan.
- **Konversi Tipe Soal Otomatis**: Ubah tipe soal (misal dari Pilihan Ganda ke Isian) secara fleksibel tanpa kehilangan teks dan aset gambar (*lossless*).
- **Rekap Nilai Siswa**: Melihat daftar nama siswa yang telah mengumpulkan, perolehan skor, akurasi, dan rincian jawaban per nomor.

---

### 5. Arsitektur Dual Storage (Supabase Cloud + Local Backup)
- **Supabase Cloud (PostgreSQL)**: Menyimpan kuis, soal, gambar, dan submission siswa secara persisten di cloud (cocok untuk deployment Vercel 24/7).
- **Local Fallback (`local_quizzes.json`)**: Memastikan aplikasi tetap dapat digunakan secara offline di komputer lokal tanpa internet.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/)
- **Icon**: [Lucide React](https://lucide.dev/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL dengan Row Level Security)
- **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`@google/generative-ai`)
- **Image & PDF Processing**: [Sharp](https://sharp.pixelplumbing.com/) & Poppler Utilities (`pdftoppm`, `pdfimages`)

---

## 📁 Struktur Folder

```text
SoalCaplos/
├── data/                       # Penyimpanan data lokal (offline fallback)
│   ├── local_quizzes.json
│   └── local_submissions.json
├── public/                     # Aset statis & logo
├── scripts/                    # Script pengujian E2E otomatis (17+ test suites)
│   ├── test-all-11-types-runner-logic.mjs
│   ├── test-kid-friendly-typography.mjs
│   ├── test-multiple-select-bugfix.mjs
│   ├── test-pdf-image-extractor-e2e.mjs
│   └── test-pdf-isian-extraction.mjs
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── create/         # Halaman pembuatan kuis (Upload PDF / AI / Manual)
│   │   │   └── quizzes/        # Dashboard daftar kuis, edit, & hasil siswa
│   │   ├── api/                # Next.js API Route Handlers
│   │   │   ├── generate-quiz/
│   │   │   ├── parse-pdf/
│   │   │   ├── quizzes/
│   │   │   └── submit-quiz/
│   │   ├── quiz/[slug]/        # Runner kuis siswa (Antarmuka interaktif)
│   │   ├── layout.tsx
│   │   └── page.tsx            # Halaman beranda kuis
│   ├── components/             # Komponen UI modular
│   │   ├── EditQuestionModal.tsx
│   │   ├── KidFriendlyQuestionText.tsx
│   │   ├── QuestionCardEditor.tsx
│   │   ├── QuestionPreviewCard.tsx
│   │   └── SettingsModal.tsx
│   └── lib/                    # Utilitas & logika bisnis
│       ├── geminiModels.ts
│       ├── localStorageData.ts
│       ├── pdfImageExtractor.ts
│       ├── storyQuestionParser.ts
│       ├── supabase.ts
│       └── types.ts
├── supabase/
│   └── schema.sql              # Skema lengkap PostgreSQL Supabase
├── .env.example
├── package.json
└── README.md
```

---

## 💻 Panduan Instalasi & Menjalankan Lokal

### 1. Prasyarat Sistem
- **Node.js** v18.0.0 ke atas
- **Poppler** (diperlukan untuk pemotongan gambar PDF pada macOS/Linux):
  ```bash
  # macOS (via Homebrew):
  brew install poppler
  ```

### 2. Kloning & Install Dependencies
```bash
git clone https://github.com/saputraresearch/SoalCaplos.git
cd SoalCaplos
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env.local` di root folder:
```env
# Google Gemini API Key (Dapatkan gratis di https://aistudio.google.com/)
GEMINI_API_KEY=AIzaSy...

# Supabase Credentials (Opsional untuk lokal, Wajib untuk Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Jalankan Aplikasi
```bash
# Mode Produksi (Cepat & Stabil):
npm run build
npm run start

# Atau Mode Pengembangan (Development):
npm run dev
```
Buka browser di: **[http://localhost:3000](http://localhost:3000)**

---

## 🚀 Panduan Deployment ke Vercel (Online 24/7)

Agar kuis dapat diakses oleh siswa kapan saja tanpa bergantung pada laptop yang menyala:

1. **Jalankan Skema Database di Supabase**:
   - Buka project Supabase Anda ➜ masuk ke **SQL Editor**.
   - Tempel isi file [`supabase/schema.sql`](./supabase/schema.sql) dan klik **Run**.
2. **Sambungkan ke Vercel**:
   - Buka [vercel.com](https://vercel.com) dan login dengan GitHub.
   - Klik **Add New...** ➜ **Project** ➜ pilih repository `SoalCaplos`.
3. **Tambahkan Environment Variables di Vercel**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
4. **Deploy**:
   - Klik tombol **Deploy**. Website Anda akan aktif permanen di domain `https://soal-caplos.vercel.app`.

---

## 📄 Lisensi

Project ini dikembangkan untuk kebutuhan edukasi dan asesmen pembelajaran interaktif. Bebas digunakan dan dimodifikasi untuk memajukan pendidikan yang ramah anak.