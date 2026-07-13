import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // For development. Can be restricted to specific frontend domains in production.
  credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api', routes);

// Base route for health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Centralized error handler
app.use(errorHandler);

export default app;
