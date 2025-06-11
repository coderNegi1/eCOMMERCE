// trackingRoutes.js
import express from 'express';
import { getOrderForTracking } from '../controllers/trackingController.js';

const router = express.Router();

// Public route for order tracking
router.get('/:orderId', getOrderForTracking);

export default router;