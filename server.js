import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import issueRoutes from './routes/issueRoutes.js';
import { initDatabase } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & body parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', issueRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CivicSense Backend API', timestamp: new Date() });
});

// Initialize database & start server
initDatabase().finally(() => {
  app.listen(PORT, () => {
    console.log(`🚀 CivicSense Backend Server running on http://localhost:${PORT}`);
  });
});
