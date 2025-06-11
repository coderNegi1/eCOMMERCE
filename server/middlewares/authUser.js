import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authUser = async (req, res, next) => {
  const { token } = req.cookies;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'टोकन नहीं मिला' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'उपयोगकर्ता नहीं मिला' });
    }
    
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res.status(500).json({ success: false, message: 'सर्वर त्रुटि' });
  }
};
