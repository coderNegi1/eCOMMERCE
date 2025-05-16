// addressController.js
import Address from '../models/Address.js';




// Get Address : /api/address/add
export const getAddress = async (req, res) => {
    try {
        // Get user ID from middleware instead of request body
        const userId = req.user.id;
        const addresses = await Address.find({ userId });
        res.json({ success: true, addresses });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// Add Address : /api/address/get
export const addAddress = async (req, res) => {
    try {
        // Get user ID from middleware
        const userId = req.user.id;
        await Address.create({ ...req.body, userId });
        res.json({ success: true, message: "Address added successfully" });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};