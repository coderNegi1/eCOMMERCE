import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import connectDB from './configs/db.js';
import { connectCloudinary } from './configs/cloudinary.js'; // ✅ Add this

import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoutes.js';
import cartRouter from './routes/cartRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import addressRouter from './routes/addressRoutes.js';
import sellerRouter from './routes/sellerRoutes.js';
import wishlistRouter from './routes/wishlistRoutes.js';
import trackingRouter from './routes/trackingRoutes.js';

dotenv.config(); // ✅ MUST be at the top to load .env variables

const app = express();
const PORT = process.env.PORT || 8000;

// 🔌 Connect to Database & Cloudinary
connectDB();
connectCloudinary(); // ✅ Ensures cloudinary.config is run with your .env vars

// 🔐 Middleware
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://e-commerce-black-xi.vercel.app',
  ],
  credentials: true,
}));

// 🛣️ Routes
app.use('/api/user', userRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/address', addressRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/track', trackingRouter);

// 🧪 Test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// 🧯 Error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).send('Something broke!');
});

// 🚀 Launch server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
