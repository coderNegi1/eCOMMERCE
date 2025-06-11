

import express from 'express';
import { addToWishlist, removeFromWishlist, getWishlist } from '../controllers/wishlistController.js';
import authUser from '../middlewares/authUser.js'; // Import your authUser middleware

const wishlistRouter = express.Router();

// Add product to wishlist
// Using PUT because it's an update to the user's wishlist document
wishlistRouter.put('/add', authUser, addToWishlist);

// Remove product from wishlist
// Using PUT for consistency with add/remove actions. DELETE /:productId is also an option.
wishlistRouter.put('/remove', authUser, removeFromWishlist);

// Get user's entire wishlist
wishlistRouter.get('/', authUser, getWishlist);

export default wishlistRouter;