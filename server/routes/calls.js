import express from 'express';
import {
  recordCall,
  getCallCount,
  getCallLogs,
  getCallStats
} from '../controllers/callController.js';

const router = express.Router();

/**
 * Record a call
 */
router.post('/record', recordCall);

/**
 * Get the global call count
 */
router.get('/count', getCallCount);

/**
 * Get call logs with filtering options
 */
router.get('/logs', getCallLogs);

/**
 * Get call statistics
 */
router.get('/stats', getCallStats);

export default router;