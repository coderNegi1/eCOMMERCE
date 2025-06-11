import { v2 as cloudinary } from 'cloudinary';
import Product from '../models/Product.js';
import { sendEmail } from '../utils/sendEmail.js'; // Ensure this path is correct for your existing utility

// Add Product: /api/product/add (POST)
export const addProduct = async (req, res) => {
    try {
        let productData = JSON.parse(req.body.productData);
        const images = req.files;

        let imagesUrl = await Promise.all(
            images.map(async (item) => {
                let result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                return result.secure_url;
            })
        );

        productData.stock = productData.stock || 0;
        productData.lowStockThreshold = productData.lowStockThreshold || 10;
        productData.inStock = productData.stock > 0;

        await Product.create({ ...productData, image: imagesUrl });

        res.status(201).json({ success: true, message: "Product Added Successfully" });
    } catch (error) {
        console.error("Error adding product:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All Products: /api/products/list (GET)
export const productList = async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json({ success: true, products });
    } catch (error) {
        console.error("Error fetching product list:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Single Product by ID: /api/product/:id (GET)
export const productById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, product });
    } catch (error) {
        console.error("Error fetching product by ID:", error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: "Invalid product ID format." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Product Stock and In-Stock Status: /api/product/stock (POST)
export const updateProductStockAndStatus = async (req, res) => {
    try {
        const { id, stock, inStock } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Product ID is required." });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        let updateMessage = "Product updated successfully.";
        let sendLowStockAlert = false;
        let sendOutOfStockAlert = false;

        const oldStock = product.stock; // Store old stock value

        if (typeof stock === 'number') {
            product.stock = stock;
            product.inStock = stock > 0;
            updateMessage = "Stock count updated.";

            if (product.stock === 0 && oldStock > 0) {
                sendOutOfStockAlert = true;
            } else if (product.stock > 0 && product.stock <= product.lowStockThreshold && oldStock > product.lowStockThreshold) {
                sendLowStockAlert = true;
            }

        } else if (typeof inStock === 'boolean') {
            product.inStock = inStock;
            if (!inStock) {
                if (product.stock > 0) {
                    product.stock = 0; // If setting to out of stock, zero out stock
                    sendOutOfStockAlert = true;
                }
            }
            updateMessage = "In-stock status updated.";
        } else {
            return res.status(400).json({ success: false, message: "No valid stock or in-stock status provided for update." });
        }

        await product.save();

        // Send Email Alerts AFTER saving
        if (sendOutOfStockAlert) {
            const subject = `Urgent: Product Out of Stock - ${product.name}`;
            const message = `
                <p>Dear Admin,</p>
                <p>The product <strong>${product.name}</strong> has just gone **OUT OF STOCK**.</p>
                <p>Please take necessary action to restock it.</p>
                <p><strong>Product Details:</strong></p>
                <ul>
                    <li>Name: ${product.name}</li>
                    <li>Category: ${product.category}</li>
                    <li>Current Stock: ${product.stock}</li>
                    <li>Price: ${product.price}</li>
                    <li>Offer Price: ${product.offerPrice}</li>
                    <li>Admin Link: [Your Admin Product Edit Link Here]</li>
                </ul>
                <p>Thank you,</p>
                <p>Your Inventory System</p>
            `;
            // --- CHANGE MADE HERE ---
            await sendEmail({ to: process.env.ADMIN_EMAIL, subject, html: message });
        } else if (sendLowStockAlert) {
            const subject = `Low Stock Alert: Product ${product.name}`;
            const message = `
                <p>Dear Admin,</p>
                <p>The product <strong>${product.name}</strong> is running low on stock.</p>
                <p>Its current stock level is **${product.stock}**, which is at or below its threshold of **${product.lowStockThreshold}**.</p>
                <p>Please consider restocking soon.</p>
                <p><strong>Product Details:</strong></p>
                <ul>
                    <li>Name: ${product.name}</li>
                    <li>Category: ${product.category}</li>
                    <li>Current Stock: ${product.stock}</li>
                    <li>Low Stock Threshold: ${product.lowStockThreshold}</li>
                    <li>Price: ${product.price}</li>
                    <li>Offer Price: ${product.offerPrice}</li>
                    <li>Admin Link: [Your Admin Product Edit Link Here]</li>
                </ul>
                <p>Thank you,</p>
                <p>Your Inventory System</p>
            `;
            // --- CHANGE MADE HERE ---
            await sendEmail({ to: process.env.ADMIN_EMAIL, subject, html: message });
        }

        res.status(200).json({ success: true, message: updateMessage, product });
    } catch (error) {
        console.error("Error updating product stock/status:", error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: "Invalid product ID format." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Product: /api/product/delete/:id (DELETE)
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: "Invalid product ID format." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};