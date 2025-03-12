import { pool } from '../config/database.js';
import { globalCallCounter } from '../config/cache.js';

/**
 * Record a call in the database
 */
const recordCall = async (req, res) => {
  try {
    // Get data from request
    const { legislatorId, result, issueID } = req.body;
    const timestamp = new Date();
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Additional data as JSON
    const additionalData = {
      originalRequest: req.body,
      source: req.get('Referer') || 'direct'
    };

    // Begin a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert the call log
      const insertLogQuery = `
        INSERT INTO call_logs (legislator_id, issue_id, result, client_ip, user_agent, additional_data)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, timestamp`;
      
      const logResult = await client.query(insertLogQuery, [
        legislatorId || null,
        issueID || null,
        result || null,
        clientIP,
        userAgent,
        JSON.stringify(additionalData)
      ]);
      
      // Increment the counter
      const updateCounterQuery = `
        UPDATE call_counter
        SET count = count + 1
        WHERE id = 'global'
        RETURNING count`;
      
      const counterResult = await client.query(updateCounterQuery);
      
      // If no rows were affected, the counter doesn't exist yet
      if (counterResult.rowCount === 0) {
        await client.query(`
          INSERT INTO call_counter (id, count) 
          VALUES ('global', 1)`
        );
      }
      
      await client.query('COMMIT');
      
      // Get the latest global count
      const getCountQuery = `SELECT count FROM call_counter WHERE id = 'global'`;
      const countResult = await pool.query(getCountQuery);
      const globalCallCount = countResult.rows[0]?.count || 1;
      
      // Log to console
      console.log(`=== CALL RECORDED ===`);
      console.log(`ID: ${logResult.rows[0].id}`);
      console.log(`Timestamp: ${logResult.rows[0].timestamp}`);
      console.log(`Global Counter: ${globalCallCount}`);
      console.log(`Legislator ID: ${legislatorId || 'Not specified'}`);
      console.log(`Issue ID: ${issueID || 'Not specified'}`);
      console.log(`Call Result: ${result || 'Not specified'}`);
      console.log(`====================`);
      
      // Return success response
      res.json({
        success: true,
        globalCallCount,
        timestamp: timestamp.toISOString(),
        id: logResult.rows[0].id
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error recording call:', error);
    res.status(500).json({
      error: "Failed to record call",
      details: error.message
    });
  }
};

/**
 * Get the global call count
 */
const getCallCount = async (req, res) => {
  try {
    const query = `SELECT count FROM call_counter WHERE id = 'global'`;
    const result = await pool.query(query);
    
    const globalCallCount = result.rows[0]?.count || 0;
    
    res.json({
      globalCallCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching call count:', error);
    res.status(500).json({
      error: "Failed to fetch call count",
      details: error.message
    });
  }
};

/**
 * Get call logs with filtering options
 */
const getCallLogs = async (req, res) => {
  try {
    // Get query parameters
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const legislatorId = req.query.legislatorId || null;
    const issueId = req.query.issueId || null;
    
    // Build where clause
    let whereClause = '';
    const queryParams = [];
    
    if (startDate) {
      whereClause += `${whereClause ? ' AND ' : 'WHERE '} timestamp >= $${queryParams.length + 1}`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereClause += `${whereClause ? ' AND ' : 'WHERE '} timestamp <= $${queryParams.length + 1}`;
      queryParams.push(endDate);
    }
    
    if (legislatorId) {
      whereClause += `${whereClause ? ' AND ' : 'WHERE '} legislator_id = $${queryParams.length + 1}`;
      queryParams.push(legislatorId);
    }
    
    if (issueId) {
      whereClause += `${whereClause ? ' AND ' : 'WHERE '} issue_id = $${queryParams.length + 1}`;
      queryParams.push(issueId);
    }
    
    // Count total matching rows
    const countQuery = `SELECT COUNT(*) as total FROM call_logs ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Add limit and offset params
    queryParams.push(limit);
    queryParams.push(offset);
    
    // Get the logs
    const logsQuery = `
      SELECT * FROM call_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${queryParams.length - 1}
      OFFSET $${queryParams.length}
    `;
    
    const logsResult = await pool.query(logsQuery, queryParams);
    
    res.json({
      total,
      limit,
      offset,
      logs: logsResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({
      error: "Failed to fetch call logs",
      details: error.message
    });
  }
};

/**
 * Get call statistics
 */
const getCallStats = async (req, res) => {
  try {
    // Get unique issues
    const issuesQuery = `
      SELECT issue_id, COUNT(*) as count
      FROM call_logs
      WHERE issue_id IS NOT NULL
      GROUP BY issue_id
      ORDER BY count DESC
    `;
    const issuesResult = await pool.query(issuesQuery);
    
    // Get unique legislators
    const legislatorsQuery = `
      SELECT legislator_id, COUNT(*) as count
      FROM call_logs
      WHERE legislator_id IS NOT NULL
      GROUP BY legislator_id
      ORDER BY count DESC
    `;
    const legislatorsResult = await pool.query(legislatorsQuery);
    
    // Get calls by result type
    const resultsQuery = `
      SELECT result, COUNT(*) as count
      FROM call_logs
      WHERE result IS NOT NULL
      GROUP BY result
      ORDER BY count DESC
    `;
    const resultsResult = await pool.query(resultsQuery);
    
    // Get calls by day
    const dailyQuery = `
      SELECT 
        DATE_TRUNC('day', timestamp) as day,
        COUNT(*) as count
      FROM call_logs
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `;
    const dailyResult = await pool.query(dailyQuery);
    
    res.json({
      totalCalls: (await pool.query('SELECT count FROM call_counter WHERE id = \'global\'')).rows[0]?.count || 0,
      byIssue: issuesResult.rows,
      byLegislator: legislatorsResult.rows,
      byResult: resultsResult.rows,
      byDay: dailyResult.rows
    });
  } catch (error) {
    console.error('Error fetching call stats:', error);
    res.status(500).json({
      error: "Failed to fetch call statistics",
      details: error.message
    });
  }
};

export {
  recordCall,
  getCallCount,
  getCallLogs,
  getCallStats
};