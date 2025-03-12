import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';
import fs from 'fs';

// Import configurations
import corsConfig from './config/cors.js';
import { pool, initializeDatabase } from './config/database.js';
import { saveCallData, globalCallCounter } from './config/cache.js';

// Import routes
import apiRoutes from './routes/api.js';
import billRoutes from './routes/bills.js';
import legislatorRoutes from './routes/legislators.js';
import addressRoutes from './routes/address.js';
import callRoutes from './routes/calls.js';
import analysisRoutes from './routes/analysis.js';

// Import error handler
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Static files
app.use(express.static(__dirname));

// Enable CORS
app.use(cors(corsConfig));

// Parse JSON bodies
app.use(express.json());

// Test the database connection and initialize
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to PostgreSQL database:', res.rows[0]);
    // Initialize the database after successful connection
    initializeDatabase();
  }
});

// Check table structure
pool.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'call_logs'
`, (err, res) => {
  if (err) {
    console.error('Error checking table structure:', err);
  } else {
    console.log('call_logs table structure:');
    console.log(res.rows);
  }
});

// Mount routes
app.use('/api', apiRoutes);
app.use('/', billRoutes);
app.use('/', legislatorRoutes);
app.use('/', addressRoutes);
app.use('/api/calls', callRoutes);
app.use('/api', analysisRoutes);
app.use('/api/legislators', legislatorRoutes);

// Issues route (catch-all for /issues/)
app.use((req, res, next) => {
  console.log('Catch-all middleware hit:', req.path);
  
  if (req.path.startsWith('/issues/')) {
    console.log('Serving issues.html for path:', req.path);
    return res.sendFile(join(__dirname, 'issues', 'index.html'));
  }
  
  // For any other paths, continue to the next handler
  next();
});

// Error handling middleware
app.use(errorHandler);

// Save data every 5 minutes
setInterval(saveCallData, 5 * 60 * 1000);

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down, saving call data...');
  saveCallData();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} at ${new Date().toISOString()}`);
  console.log(`Server directory: ${__dirname}`);
  console.log('Ready to handle requests');
});