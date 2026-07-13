import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

const startServer = async () => {
  // 1. Connect to Database
  await connectDB();

  // 2. Start server
  const server = app.listen(env.PORT, () => {
    console.log(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err: Error) => {
    console.error(`Unhandled Rejection Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
};

startServer();
