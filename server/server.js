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

// डेटाबेस और क्लाउडिनरी कनेक्शन
await connectDB();
connectCloudinary();

// CORS कॉन्फ़िगरेशन
const allowedOrigins = [
  'https://e-commerce-black-xi.vercel.app', 
  'http://localhost:5173'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors()); // प्रीफ्लाइट रिक्वेस्ट्स के लिए

// स्ट्राइप वेबहुक
app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// मिडलवेयर्स
app.use(express.json());
app.use(cookieParser());

// रूट्स
app.get('/', (req, res) => res.send("API काम कर रहा है"));
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/track', trackingRouter);

// सर्वर स्टार्ट
app.listen(port, () => {
  console.log(`सर्वर चल रहा है http://localhost:${port} पर`);
});
