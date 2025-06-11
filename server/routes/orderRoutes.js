// routes/orderRoutes.js
import express from 'express';
// Note: Stripe instance initialization should generally happen where it's used
// or passed down, not typically here unless this is the only place it's used.
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 

import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import {
  getAllOrders,
  getUserOrders,
  placeOrderCOD,
  placeOrderStripe,
  getOrderForTracking,
  cancelOrder,
  updateOrderStatus,
  stripeWebhooks // CORRECTED: Import 'stripeWebhooks' as it's exported from orderController.js
} from '../controllers/orderController.js';

const orderRouter = express.Router();

// ========================
//       WEBHOOK ROUTE
// ========================
// IMPORTANT: For Stripe webhooks, the raw body parser (express.raw)
// MUST be applied ONLY to this specific route and BEFORE express.json()
// in your main server.js file if you're using express.json() globally.
// A common practice is to define this webhook route directly in server.js
// or ensure this middleware order is handled carefully if using a router.
// Given your server.js structure, I've suggested placing this directly
// in server.js in the previous message. If you prefer to keep it here,
// ensure your server.js sets up raw body parsing for this specific path only.
orderRouter.post('/stripe-webhook', 
  // express.raw({ type: 'application/json' }), // If placing here, ensure this is handled.
  // Generally, handle raw body parsing for webhooks in server.js before global JSON parsing.
  stripeWebhooks // CORRECTED: Use the correct function name 'stripeWebhooks'
);

// ========================
//     USER ORDER ROUTES
// ========================
orderRouter.post('/cod', authUser, placeOrderCOD);
orderRouter.post('/stripe', authUser, placeOrderStripe);
orderRouter.get('/user', authUser, getUserOrders);
orderRouter.put('/cancel/:orderId', authUser, cancelOrder);

// ========================
//     GUEST ORDER ROUTES
// ========================
// No authUser middleware needed for guest orders
orderRouter.post('/guest-cod', placeOrderCOD);
orderRouter.post('/guest-stripe', placeOrderStripe);

// ========================
//  SELLER/ADMIN ROUTES
// ========================
orderRouter.get('/seller', authSeller, getAllOrders);
orderRouter.put('/update-status/:orderId', authSeller, updateOrderStatus);

// ========================
//       PUBLIC ROUTES
// ========================
// Order tracking can be public
orderRouter.get('/track/:orderId', getOrderForTracking);

export default orderRouter;
