import pg from 'pg';
import 'dotenv/config';

// Create a connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to initialize the database
async function initializeDatabase() {
  try {
    try {
      await pool.query('ALTER DATABASE railway REFRESH COLLATION VERSION');
      console.log('✅ Collation version refreshed - warnings should stop');
    } catch (collationError) {
      console.log('⚠️ Could not refresh collation (this is usually fine):', collationError.message);
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS call_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        legislator_id VARCHAR(255),
        issue_id VARCHAR(255),
        result VARCHAR(50),
        client_ip VARCHAR(50),
        user_agent TEXT,
        additional_data JSONB
      )
    `);
    
    // Create call_counter table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS call_counter (
        id VARCHAR(20) PRIMARY KEY,
        count INTEGER NOT NULL
      )
    `);
    
    // Initialize the counter
    await pool.query(`
      INSERT INTO call_counter (id, count)
      VALUES ('global', 0)
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp ON call_logs(timestamp)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_legislator ON call_logs(legislator_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_issue ON call_logs(issue_id)`);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}


export { pool, initializeDatabase };
