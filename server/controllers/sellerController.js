// controllers/sellerController.js

import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

//Login Seller : /api/seller/login
export const sellerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (password === process.env.SELLER_PASSWORD && email === process.env.SELLER_EMAIL) {
            const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7d' });

            res.cookie('sellerToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // true in prod, false in dev
                sameSite: 'lax', // or 'none' if needed and secure is true
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            return res.json({ success: true, message: "Logged In" });
        } else {
            return res.json({ success: false, message: "Invalid Credentials" });
        }
    } catch (error) {
        console.error(error.message); // Use console.error for errors
        return res.status(500).json({ // Return 500 for server errors
            success: false,
            message: "Server Error during login.",
        });
    }
};

//Seller isAuth : /api/seller/is-auth
export const isSellerAuth = async (req, res) => {
    try {
        return res.json({ success: true });
    } catch (error) {
        console.error(error.message); // Use console.error for errors
        res.status(500).json({ success: false, message: "Server Error during authentication check." }); // Return 500
    }
};

//Logout Seller : /api/seller/logout
export const sellerLogout = async (req, res) => {
    try {
        res.clearCookie('sellerToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        });
        return res.json({ success: true, message: "Logged Out" });
    } catch (error) {
        console.error(error.message); // Use console.error for errors
        res.status(500).json({ success: false, message: "Server Error during logout." }); // Return 500
    }
};

// --- NEW: Get Dashboard Summary Data for Seller/Admin ---
// Endpoint: /api/seller/dashboard-summary
export const getSellerDashboardSummary = async (req, res) => {
    try {
        // Total Products
        const totalProducts = await Product.countDocuments();

        // Products Below Min Stock Level (low stock) - Corrected query using aggregation
        const lowStockProductsResult = await Product.aggregate([
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gt: ["$stock", 0] }, // Stock is greater than 0
                            { $lte: ["$stock", "$minStockLevel"] } // Stock is less than or equal to minStockLevel
                        ]
                    }
                }
            },
            { $count: "count" } // Count the matching documents
        ]);
        const lowStockProductsCount = lowStockProductsResult.length > 0 ? lowStockProductsResult[0].count : 0;


        // Products completely out of stock
        // Assuming 'inStock' field is reliably updated (which it is, in addProduct/updateProductStockAndStatus)
        const outOfStockProductsCount = await Product.countDocuments({ inStock: false });


        // Total Orders, Pending Orders, Delivered Orders
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: { $in: ['Order Placed', 'Processing', 'Shipped'] } });
        const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
        const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' }); // Track cancelled orders too

        // Total Revenue (from paid/COD orders)
        const revenueResult = await Order.aggregate([
            { $match: { $or: [{ paymentType: "COD" }, { isPaid: true }] } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // Number of Users
        const totalUsers = await User.countDocuments();

        res.json({
            success: true,
            summary: {
                totalProducts,
                lowStockProductsCount,
                outOfStockProductsCount,
                totalOrders,
                pendingOrders,
                deliveredOrders,
                cancelledOrders, // Include cancelled orders in summary
                totalRevenue,
                totalUsers
            }
        });

    } catch (error) {
        console.error("Error fetching seller dashboard summary:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch dashboard summary." });
    }
};

// --- NEW: Get All Products with Stock Details for Seller/Admin List ---
// Endpoint: /api/seller/products-inventory
export const getProductsInventory = async (req, res) => {
    try {
        // Select relevant fields for the dashboard product list
        const products = await Product.find({}, 'name category stock minStockLevel offerPrice inStock image');
        res.json({ success: true, products });
    } catch (error) {
        console.error("Error fetching products inventory:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch products inventory." });
    }
};
