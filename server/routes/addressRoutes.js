// addressRoutes.js
import express from 'express';
import authUser from '../middlewares/authUser.js';
import { getAddress, addAddress } from '../controllers/addressController.js';

const addressRouter = express.Router();

// Protected routes (require auth)
addressRouter.post('/add', authUser, addAddress);
addressRouter.get('/get', authUser, getAddress); 


export default addressRouter;