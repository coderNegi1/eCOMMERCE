import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    guestName: { type: String },
    guestEmail: { type: String },
    guestPhone: { type: String },
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
        enum: ['Order Placed', 'Processing', 'Pending Payment', 'Shipped', 'Delivered', 'Cancelled']
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
    shippingTrackingNumber: { type: String },
    shippingCarrier: { type: String },
    shippingTrackingUrl: { type: String },
}, { 
    timestamps: true,
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
});

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
