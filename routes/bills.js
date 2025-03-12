import express from 'express';
import { 
  getAllBills, 
  getBillDetails, 
  getBillActions,
  generateBillStats
} from '../controllers/billController.js';

const router = express.Router();

/**
 * Get all bills for a year
 */
router.get('/:year/bills', getAllBills);

/**
 * Get details for a specific bill
 */
router.get('/:year/bills/:name', getBillDetails);

/**
 * Get actions for a specific bill
 */
router.get('/:year/bills/:name/actions', getBillActions);

/**
 * Generate statistics for a set of bills
 */
router.post('/:year/bills/stats', generateBillStats);

export default router;