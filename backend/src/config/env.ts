import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/timelog',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_key_timelog_2026_dev',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Simple check to warn about missing critical env variables in production
if (env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set in production environments! Using default key.');
  }
  if (!process.env.MONGO_URI) {
    console.warn('WARNING: MONGO_URI is not set in production environments! Using default MongoDB host.');
  }
}
