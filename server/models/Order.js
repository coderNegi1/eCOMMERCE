import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        ref: 'User'  // Should match model name
    },
    items: [{
        product: { 
            type: mongoose.Schema.Types.ObjectId, 
            required: true, 
            ref: 'Product' 
        },
        quantity: { 
            type: Number, 
            required: true,
            min: 1
        },
    }],
    amount: { 
        type: Number, 
        required: true,
        min: 0
    },
    address: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        ref: 'Address'
    },
    status: { 
        type: String, 
        default: 'Order Placed',
        enum: ['Order Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    },
    paymentType: { 
        type: String, 
        required: true,
        enum: ['COD', 'Online']
    },
    isPaid: { 
        type: Boolean, 
        default: false
    },
}, { 
    timestamps: true,
    toJSON: { virtuals: true },  // For proper population in responses
    toObject: { virtuals: true }
});

// Add population virtuals
orderSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

orderSchema.virtual('products', {
    ref: 'Product',
    localField: 'items.product',
    foreignField: '_id'
});

orderSchema.virtual('shippingAddress', {
    ref: 'Address',
    localField: 'address',
    foreignField: '_id',
    justOne: true
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;