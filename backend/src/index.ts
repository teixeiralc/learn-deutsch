import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/database.js';
import vocabularyRouter from './routes/vocabulary.js';
import sentencesRouter from './routes/sentences.js';
import grammarRouter from './routes/grammar.js';
import exercisesRouter from './routes/exercises.js';
import progressRouter from './routes/progress.js';
import ttsRouter from './routes/tts.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Run DB migrations on startup
runMigrations();

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// Routes
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/sentences', sentencesRouter);
app.use('/api/grammar-topics', grammarRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/progress', progressRouter);
app.use('/api/tts', ttsRouter);
app.use('/api', progressRouter); // for /api/stats

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Learn Deutsch backend running on http://localhost:${PORT}`);
});
