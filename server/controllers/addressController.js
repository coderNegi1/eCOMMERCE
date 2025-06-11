import Address from '../models/Address.js';

export const getAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await Address.find({ userId });
    res.status(200).json({ success: true, addresses });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const requiredFields = ['firstName', 'lastName', 'street', 'city', 'state', 'zipcode', 'country', 'phone'];
    
    for(const field of requiredFields) {
      if(!req.body[field]) {
        return res.status(400).json({ 
          success: false, 
          message: `${field} field is required`
        });
      }
    }

    await Address.create({ ...req.body, userId });
    res.status(201).json({ success: true, message: "Address added successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Address addition failed" });
  }
};
