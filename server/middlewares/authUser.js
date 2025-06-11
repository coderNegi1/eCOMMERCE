import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to authenticate user using JWT token in cookies
const authUser = async (req, res, next) => {
    const { token } = req.cookies;
    console.log("AuthUser: Received token from cookies:", token);

    if (!token) {
        console.log("AuthUser: No token found. User is not authenticated.");
        return res.status(401).json({ success: false, message: 'Not Authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("AuthUser: Decoded token (payload):", decoded);

        // Attach user object (without password) to req.user
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            console.log("AuthUser: User not found in DB with ID from token:", decoded.id);
            return res.status(401).json({ success: false, message: 'Not Authorized, user not found' });
        }

        console.log("AuthUser: User authenticated and attached to req.user with ID:", req.user._id);
        next();
    } catch (error) {
        console.error("AuthUser middleware error:", error.message);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Invalid Token or Token Expired' });
        }
        return res.status(500).json({ success: false, message: 'Server Error during authentication' });
    }
};

export default authUser;
