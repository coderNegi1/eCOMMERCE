import dotenv from "dotenv";
dotenv.config();

import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';

import connectDB from './configs/db.js';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoutes.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRouts.js';
import cartRouter from './routes/cartRoutes.js';
import addressRouter from './routes/addressRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import wishlistRouter from './routes/wishlistRoutes.js';
import { stripeWebhooks } from './controllers/orderController.js';
import trackingRouter from './routes/trackingRoutes.js';

const app = express();
const port = process.env.PORT || 4000;

await connectDB();
connectCloudinary();

const allowedOrigins = [
  'https://e-commerce-black-xi.vercel.app',
  'https://e-commerce-grocery-store-six.vercel.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => res.send("API is working"));
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/track', trackingRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
