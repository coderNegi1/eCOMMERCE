import dotenv from 'dotenv';
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
import { stripeWebhooks } from './controllers/orderController.js';

const app = express();
const port = process.env.PORT || 4000;

await connectDB();
await connectCloudinary();

//Allow multiple origins
const allowedOrigins = ['http://localhost:5173', 'https://e-commerce-grocery-store-six.vercel.app']

app.post('/stripe', express.raw({type: 'application/json'}), stripeWebhooks)

//Middleware configuration
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => res.send("API is working"));
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);

app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
