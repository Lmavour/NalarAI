<div align="center">
<img width="1200" height="475" alt="NalarAI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Nalar.ai — Active AI Learning

**Nalar.ai** adalah tutor AI untuk pembelajaran aktif yang mendorong siswa berpikir kritis melalui metode sokratik, tantangan praktis, dan eksplorasi informasi. Alih-alih memberikan jawaban langsung, Nalar.ai memandu siswa menemukan jawaban sendiri melalui dialog interaktif.

## ✨ Fitur

- **Metode Sokratik** — AI tidak langsung memberikan jawaban, tapi mengarahkan melalui pertanyaan bertahap
- **Interactive Blocks** — Setiap respons diakhiri dengan kuis, gap-fill, atau paraphrase challenge
- **Gamifikasi** — Sistem XP, streak, hearts, dan level (Rookie → Apprentice → Master)
- **Sertifikat** — Modal sertifikat yang muncul saat mencapai 100 XP
- **Markdown + LaTeX** — Support formatting lengkap untuk penjelasan matematis
- **Sound & Haptic** — Feedback suara dan haptic untuk interaksi yang lebih immersive

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19, Vite 6, TailwindCSS 4, Framer Motion |
| Backend | Express, TypeScript (tsx/esbuild) |
| AI API | GLM-4-7B Flash via external API endpoint |
| Rendering | react-markdown, remark-math, rehype-katex |

## 📁 Struktur Project

```
NalarAI/
├── server.ts              # Express server + AI API proxy
├── vite.config.ts         # Vite + TailwindCSS config
├── src/
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   ├── types.ts           # TypeScript interfaces
│   ├── components/
│   │   ├── ChatInterface.tsx      # Main chat UI + gamification logic
│   │   ├── WelcomeScreen.tsx      # Landing screen with suggestions
│   │   ├── MessageItem.tsx        # Individual message renderer
│   │   ├── CertificateModal.tsx   # Level-up certificate popup
│   │   ├── InteractionDispatcher.tsx  # Routes interactive block types
│   │   └ interactions/
│   │     ├── Quiz.tsx             # Multiple choice quiz block
│   │     ├── GapFill.tsx          # Fill-in-the-blank block
│   │     └ Paraphrase.tsx         # Paraphrase challenge block
```

## 🚀 Run Locally

**Prerequisites:** Node.js (v18+)

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd NalarAI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open in browser:
   ```
   http://localhost:3000
   ```

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm run start
```

Production build outputs to `dist/` with a bundled Express server (`dist/server.cjs`).

## 🎮 Cara Kerja Gamifikasi

| Mekanik | Detail |
|---------|--------|
| **XP** | +15 XP per interaksi berhasil |
| **Hearts** | -1 heart per jawaban salah (max 5) |
| **Streak** | +1 per jawaban benar berturut-turut, reset saat salah |
| **Level** | `Math.floor(xp / 100) + 1` |
| **Certificate** | Muncul setiap kali mencapai 100 XP threshold |

## 📝 Interactive Blocks

AI response selalu diakhiri dengan satu interactive block:

- **`[[QUIZ:...]]`** — Kuis pilihan ganda dengan explanation
- **`[[GAP_FILL:...]]`** — Melengkapi kalimat kosong
- **`[[PARAPHRASE:...]]`** — Menjelaskan ulang materi dengan kata-kata sendiri

## License

Apache-2.0
