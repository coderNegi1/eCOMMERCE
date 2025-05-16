import jwt from 'jsonwebtoken';

// authUser.js
const authUser = async (req, res, next) => {
    const { token } = req.cookies;
    if (!token) return res.status(401).json({ success: false, message: 'Not Authorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id }; // Set user ID on req.user
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid Token' });
    }
};

export default authUser;
