# Learn Deutsch 🇩🇪

A Duolingo-style German learning app with **zero external dependencies** — no AI, no cloud services, no API keys.

### Features
- 🧠 **SM-2 spaced repetition** — Anki-level scheduling
- 🎯 **6 exercise types** — MCQ, fill-blank, translation, sentence building, listening, speaking
- 🎧 **Browser TTS** — native `speechSynthesis` for listening exercises
- 🎤 **Web Speech API** — Chrome speech recognition for speaking
- 🔥 **XP & streak tracking**
- 📚 **Vocabulary browser** with progress scores
- 📊 **Dark, minimal UI** — Tailwind + glass morphism

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone & install

```bash
git clone <your-repo-url>
cd learn-deutsch

# Install all dependencies (backend + frontend)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure backend

```bash
cp backend/.env.example backend/.env
# No API keys needed — just check the path is correct
```

### 3. Setup database & seed data

```bash
# Run from the backend directory
cd backend
npm run migrate    # Creates learn-deutsch.db
npm run seed       # Seeds 19 grammar topics
cd ..

# Import vocabulary (97 words, A1–B2)
cd backend && npx tsx ../scripts/import-vocabulary.ts ../scripts/vocabulary.csv && cd ..

# Import example sentences (56 pairs, linked to vocabulary)
cd backend && npx tsx ../scripts/import-sentences.ts ../scripts/sentences.csv && cd ..
```

### 4. Run

```bash
# Terminal 1 — Backend on :3001
cd backend && npm run dev

# Terminal 2 — Frontend on :5173
cd frontend && npm run dev
```

Open **http://localhost:5173** 🎉

---

## Project Structure

```
learn-deutsch/
├── backend/
│   ├── src/
│   │   ├── db/          # SQLite schema, migration runner, DB singleton
│   │   ├── routes/      # vocabulary, sentences, grammar, exercises, progress
│   │   ├── services/    # exercise-generator, learning-engine (SM-2), levenshtein
│   │   └── types/       # TypeScript interfaces
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Layout, Sidebar, ProgressBar, loaders
│   │   ├── exercises/   # MCQ, FillBlank, Translation, SentenceBuilding, Listening, Speaking
│   │   ├── hooks/       # useSpeechRecognition
│   │   ├── pages/       # Dashboard, Lesson, Results, Vocabulary
│   │   ├── services/    # Axios API client
│   │   ├── stores/      # Zustand (appStore, lessonStore)
│   │   └── types/       # Shared TypeScript types
│   └── package.json
└── scripts/
    ├── vocabulary.csv          # 97 example words (A1–B2)
    ├── sentences.csv           # 56 sentence pairs
    ├── import-vocabulary.ts    # CSV importer
    ├── import-sentences.ts     # CSV importer with vocab linking
    └── seed-grammar.ts         # Grammar topics seeder
```

## Adding Your Own Vocabulary

Edit `scripts/vocabulary.csv` or create a new CSV following the format:
```
german,english,part_of_speech,gender,plural,level,frequency_rank
laufen,to run,verb,,,A2,
Baum,tree,noun,der,Bäume,A2,
```

Then import:
```bash
cd backend && npx tsx ../scripts/import-vocabulary.ts ../scripts/my-words.csv
```

## SM-2 Spaced Repetition

After each answer:
- ✅ Correct: `interval × ease_factor`, `ease_factor += 0.1`
- ❌ Wrong: `interval = 1`, `ease_factor -= 0.2` (min 1.3)

Words are sorted by `next_review_date`, so weak words always appear first.

## Speaking Feature

Requires **Chrome** (Web Speech API). The app gracefully degrades — a "Skip" button is shown if no mic is detected.

## XP System

| Action | XP |
|---|---|
| Correct answer | +10 |
| Complete lesson | +50 (+ bonus up to +50 based on score) |
