import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: Array, required: true },
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    image: { type: Array, required: true },
    category: { type: String, required: true },

    inStock: {
        type: Boolean,
        required: true,
        default: false
    },

    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },

    lowStockThreshold: {
        type: Number,
        default: 5
    }

}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;