import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cartItems: {
        type: Object,
        default: {}
    },
    // --- ADD THIS WISHLIST FIELD ---
    wishlist: {
        type: Object,
        default: {}
    },
    // -------------------------------
}, {
    timestamps: true, // It's good practice to add timestamps
    minimize: false
});


const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;