import express from 'express';

const router = express.Router();

/**
 * Default API route
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Indiana General Assembly API',
    version: '1.0.0',
    status: 'online'
  });
});

export default router;