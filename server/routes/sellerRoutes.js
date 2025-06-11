import express from 'express';
import { isSellerAuth, sellerLogin, sellerLogout, getSellerDashboardSummary, getProductsInventory } from '../controllers/sellerController.js';
import authSeller from '../middlewares/authSeller.js';
import { updateProductStockAndStatus } from '../controllers/productController.js';

const sellerRouter = express.Router();

sellerRouter.post('/login', sellerLogin);
sellerRouter.get('/logout', sellerLogout);

// All routes below this require seller authentication
sellerRouter.use(authSeller);

sellerRouter.get('/is-auth', isSellerAuth);
sellerRouter.get('/dashboard-summary', getSellerDashboardSummary);
sellerRouter.get('/products-inventory', getProductsInventory);
sellerRouter.put('/update-product-inventory/:id', updateProductStockAndStatus);

export default sellerRouter;
