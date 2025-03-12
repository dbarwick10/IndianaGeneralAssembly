import express from 'express';
import {
  getAllLegislators,
  getLegislatorBills,
  getAuthoredBills,
  getCoauthoredBills,
  getSponsoredBills,
  getCosponsoredBills,
  getCompleteBills,
  findLegislatorsByAddress
} from '../controllers/legislatorController.js';

const router = express.Router();

/**
 * Find legislators by address
 */
router.get('/address', findLegislatorsByAddress);

/**
 * Get all legislators
 */
router.get('/legislators', getAllLegislators);

/**
 * Get all bills for a legislator
 */
router.get('/:year/legislators/:userId/bills', getLegislatorBills);

/**
 * Get authored bills for a legislator
 */
router.get('/:year/legislators/:userId/bills/authored', getAuthoredBills);

/**
 * Get coauthored bills for a legislator
 */
router.get('/:year/legislators/:userId/bills/coauthored', getCoauthoredBills);

/**
 * Get sponsored bills for a legislator
 */
router.get('/:year/legislators/:userId/bills/sponsored', getSponsoredBills);

/**
 * Get cosponsored bills for a legislator
 */
router.get('/:year/legislators/:userId/bills/cosponsored', getCosponsoredBills);

/**
 * Get complete bills data with details and actions for a legislator
 */
router.get('/:year/legislators/:userId/complete-bills', getCompleteBills);

export default router;