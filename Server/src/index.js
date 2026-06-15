import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routers
import authRouter from './routes/auth.js';
import groupsRouter from './routes/groups.js';
import expensesRouter from './routes/expenses.js';
import settlementsRouter from './routes/settlements.js';
import balancesRouter from './routes/balances.js';
import importRouter from './routes/import.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors({
  origin: '*', // Allow all origins for local evaluation development ease
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test health-check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Settly shared expenses API server is healthy.' });
});

// Route registration
app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api', expensesRouter);
app.use('/api', settlementsRouter);
app.use('/api', balancesRouter);
app.use('/api', importRouter);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error handler:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'An internal server error occurred.'
  });
});

// Boot server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`   SETTLY API SERVER RUNNING ON PORT ${PORT} `);
  console.log(`=========================================`);
});
