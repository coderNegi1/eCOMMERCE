import express from 'express';
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
  stripeWebhooks
} from '../controllers/orderController.js';

const orderRouter = express.Router();

orderRouter.post('/stripe-webhook', stripeWebhooks);
orderRouter.post('/cod', authUser, placeOrderCOD);
orderRouter.post('/stripe', authUser, placeOrderStripe);
orderRouter.get('/user', authUser, getUserOrders);
orderRouter.put('/cancel/:orderId', authUser, cancelOrder);
orderRouter.post('/guest-cod', placeOrderCOD);
orderRouter.post('/guest-stripe', placeOrderStripe);
orderRouter.get('/seller', authSeller, getAllOrders);
orderRouter.put('/update-status/:orderId', authSeller, updateOrderStatus);
orderRouter.get('/track/:orderId', getOrderForTracking);

export default orderRouter;
