import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authUser = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        console.log("[authUser] No token found in cookies");
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password'); // ✅ fetch user from DB

        if (!user) {
            console.log("[authUser] No user found for decoded ID:", decoded.id);
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user; // ✅ Attach full user object

        next();
    } catch (err) {
        console.log("[authUser] Token invalid:", err.message);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

export default authUser;
