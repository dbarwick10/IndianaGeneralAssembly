import express from 'express';
import { getLegislatorsByAddress } from '../controllers/addressController.js';

const router = express.Router();

/**
 * Get legislators by address
 */
router.get('/:year/address/legislators', getLegislatorsByAddress);

export default router;