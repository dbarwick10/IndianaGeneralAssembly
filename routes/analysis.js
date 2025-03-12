import express from 'express';
import { analyzeBills } from '../controllers/analysisController.js';

const router = express.Router();

/**
 * Endpoint for analyzing bills data
 * This endpoint accepts an array of bills and legislator names
 * and returns statistics, word cloud data, and other processed information
 */
router.post('/analyze-bills', analyzeBills);

export default router;