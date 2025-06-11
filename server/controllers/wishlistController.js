import User from "../models/User.js";
import Product from "../models/Product.js"; // Import Product model if you want product validation/details

export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id; // From authUser middleware

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Optional: Validate if product exists
        // const productExists = await Product.findById(productId);
        // if (!productExists) {
        //     return res.status(404).json({ success: false, message: 'Product not found' });
        // }

        if (user.wishlist[productId]) {
            return res.json({ success: false, message: 'Product already in wishlist' });
        }

        user.wishlist[productId] = true;
        user.markModified('wishlist'); // <--- ADDED THIS LINE
        await user.save();

        res.json({ success: true, message: 'Product added to wishlist', wishlist: user.wishlist });
    } catch (error) {
        console.error(error.message); // Use console.error for errors
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.body; // Or req.params if you use /:productId in DELETE
        const userId = req.user.id; // From authUser middleware

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.wishlist[productId]) {
            return res.json({ success: false, message: 'Product not in wishlist' });
        }

        delete user.wishlist[productId];
        user.markModified('wishlist'); // <--- ADDED THIS LINE
        await user.save();

        res.json({ success: true, message: 'Product removed from wishlist', wishlist: user.wishlist });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

export const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // From authUser middleware

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const wishlistProductIds = Object.keys(user.wishlist);

        // Fetch full product details
        const productsInWishlist = await Product.find({
            _id: { $in: wishlistProductIds }
        });

        res.json({ success: true, wishlist: productsInWishlist });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};