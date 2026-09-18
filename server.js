import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';
import { extractUserRole } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { connectMongo } from './config/mongo.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(extractUserRole);

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CommunityKiHelp CivicSense Backend API',
    version: '1.0.0 (SRS Compliant)',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// Start server — MongoDB is optional (falls back to in-memory store)
async function startServer() {
  try {
    await connectMongo();
  } catch (err) {
    console.warn('⚠️  MongoDB unavailable — running with in-memory data store only.');
    console.warn('   Reason:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`🚀 CommunityKiHelp Backend Server running on http://localhost:${PORT}`);
  });
}

startServer();
