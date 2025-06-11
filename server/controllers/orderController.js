// controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripePackage from "stripe";
import User from "../models/User.js";
import Address from "../models/Address.js";
import { sendEmail } from "../utils/sendEmail.js";
import mongoose from "mongoose";

const stripeInstance = stripePackage(process.env.STRIPE_SECRET_KEY);

// Helper: Stock update and low stock email
const handleStockAndAlerts = async (orderItems) => {
    for (const item of orderItems) {
        const updatedProduct = await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } },
            { new: true }
        );
        if (updatedProduct && updatedProduct.stock <= updatedProduct.minStockLevel) {
            await sendEmail({
                to: process.env.SELLER_EMAIL,
                subject: `LOW STOCK ALERT: ${updatedProduct.name}`,
                text: `Stock for "${updatedProduct.name}" is low: ${updatedProduct.stock} units remaining.`
            }).catch(emailError => console.error("Error sending low stock email:", emailError));
        }
    }
};

// Place Order via Stripe
export const placeOrderStripe = async (req, res) => {
    let order = null;
    try {
        const { items, address: addressIdentifier, guestDetails } = req.body;
        const userId = req.user?.id || null;
        const { origin } = req.headers;

        if (!origin) return res.status(400).json({ success: false, message: "Origin header is required for Stripe redirects." });
        if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: "Invalid or missing cart items." });
        if (!userId && (!guestDetails || !guestDetails.email || !guestDetails.name || !guestDetails.phone)) return res.status(400).json({ success: false, message: "Guest details (name, email, phone) are required for guest orders." });

        let subtotal = 0;
        const productDataForStripe = [];
        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item.product)) return res.status(400).json({ success: false, message: `Invalid product ID format: ${item.product}` });
            const product = await Product.findById(item.product);
            if (!product) return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
            if (product.stock < item.quantity) return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
            if (!product.inStock) return res.status(400).json({ success: false, message: `${product.name} is currently not available.` });
            subtotal += product.offerPrice * item.quantity;
            productDataForStripe.push({ name: product.name, price: product.offerPrice, quantity: item.quantity });
        }

        let addressId = null;
        if (typeof addressIdentifier === 'string' && mongoose.Types.ObjectId.isValid(addressIdentifier)) {
            const addressExists = await Address.exists({ _id: addressIdentifier });
            if (!addressExists) return res.status(404).json({ success: false, message: "Selected address not found." });
            addressId = addressIdentifier;
        } else if (typeof addressIdentifier === 'object' && addressIdentifier !== null) {
            const requiredFields = ["firstName", "lastName", "email", "street", "city", "state", "zipcode", "country", "phone"];
            const missing = requiredFields.find(field => !addressIdentifier[field]);
            if (missing) return res.status(400).json({ success: false, message: `Missing address field: ${missing}` });
            const newAddress = await Address.create({ ...addressIdentifier, userId });
            addressId = newAddress._id;
        } else {
            return res.status(400).json({ success: false, message: "Invalid address data." });
        }

        const tax = Math.round(subtotal * 0.02);
        const totalAmount = subtotal + tax;

        order = await Order.create({
            userId,
            guestName: guestDetails?.name,
            guestEmail: guestDetails?.email,
            guestPhone: guestDetails?.phone,
            items,
            amount: totalAmount,
            address: addressId,
            paymentType: "Online",
            isPaid: false,
            status: "Pending Payment"
        });

        let customerEmail, customerName;
        if (userId) {
            const user = await User.findById(userId);
            customerEmail = user?.email;
            customerName = user?.name;
        } else {
            customerEmail = guestDetails.email;
            customerName = guestDetails.name;
        }
        if (!customerEmail) throw new Error("Customer email is required for Stripe checkout.");

        const line_items = [
            ...productDataForStripe.map(item => ({
                price_data: {
                    currency: "inr",
                    product_data: { name: item.name },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity,
            })),
            {
                price_data: {
                    currency: "inr",
                    product_data: { name: "Tax (2%)" },
                    unit_amount: tax * 100,
                },
                quantity: 1,
            }
        ];

        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: "payment",
            success_url: `${origin}/order-confirmation/${order._id}`,
            cancel_url: `${origin}/cart`,
            customer_email: customerEmail,
            metadata: {
                orderId: order._id.toString(),
                userId: userId ? userId.toString() : 'guest',
            },
        });

        return res.json({ success: true, url: session.url });

    } catch (error) {
        if (order && order._id) await Order.findByIdAndDelete(order._id).catch(() => {});
        return res.status(500).json({ success: false, message: error.message || "Payment processing failed." });
    }
};

// Stripe Webhook Handler
export const stripeWebhooks = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        return res.status(400).json({ error: "Invalid signature" });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { orderId, userId } = session.metadata || {};
        if (!orderId || !userId) return res.status(400).json({ error: "Missing metadata" });

        try {
            const dbSession = await mongoose.startSession();
            dbSession.startTransaction();

            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                {
                    $set: {
                        isPaid: true,
                        status: "Processing",
                        "paymentDetails.transactionId": session.payment_intent,
                        "paymentDetails.paymentDate": new Date()
                    }
                },
                { new: true, session: dbSession }
            );
            if (!updatedOrder) {
                await dbSession.abortTransaction();
                throw new Error("Order not found");
            }

            await handleStockAndAlerts(updatedOrder.items);

            if (userId !== 'guest') {
                await User.findByIdAndUpdate(
                    userId,
                    { $set: { cartItems: [] } },
                    { session: dbSession }
                );
            }

            // Email notification (with retry)
            let emailSent = false;
            if (session.customer_details?.email) {
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        await sendEmail({
                            to: session.customer_details.email,
                            subject: `Order Confirmation #${orderId}`,
                            text: `Thank you for your order! Your order ID is ${orderId}.`
                        });
                        emailSent = true;
                        break;
                    } catch (e) {
                        if (attempt === 3) console.error("Email failed after 3 attempts", e);
                    }
                }
            }

            await dbSession.commitTransaction();
            dbSession.endSession();

            return res.json({
                success: true,
                actions: {
                    order_updated: true,
                    stock_updated: true,
                    cart_cleared: userId !== 'guest',
                    email_sent: emailSent
                }
            });

        } catch (error) {
            return res.status(500).json({ error: "Internal error", message: error.message });
        }
    }
    return res.json({ info: "Event not handled" });
};

// Place Order Cash on Delivery (COD)
export const placeOrderCOD = async (req, res) => {
    // Log the incoming request body for debugging
    console.log("placeOrderCOD: Received request body:", req.body);

    try {
        const { items, address: addressInput, guestDetails } = req.body;
        const userId = req.user?.id || null;

        // --- Initial Validation ---
        if (!req.body || !items || !Array.isArray(items) || items.length === 0) {
            console.log("placeOrderCOD: Validation failed - Missing or invalid order items.");
            return res.status(400).json({ success: false, message: "Missing or invalid order items." });
        }
        if (items.some(item => !item.product || !item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0)) {
            console.log("placeOrderCOD: Validation failed - Each item must have a valid product ID and a positive quantity.");
            return res.status(400).json({ success: false, message: "Each item must have a valid product ID and a positive quantity." });
        }
        if (!userId && (!guestDetails || !guestDetails.name || !guestDetails.email || !guestDetails.phone)) {
            console.log("placeOrderCOD: Validation failed - Guest details (name, email, phone) are required for guest orders.");
            return res.status(400).json({ success: false, message: "Guest details (name, email, phone) are required for guest orders." });
        }

        let addressId = null;

        // --- Address Handling ---
        if (typeof addressInput === "string" && mongoose.Types.ObjectId.isValid(addressInput)) {
            // Case 1: Logged-in user provides an existing address ID
            const addressExists = await Address.exists({ _id: addressInput });
            if (!addressExists) {
                console.log(`placeOrderCOD: Validation failed - Address not found for ID: ${addressInput}`);
                return res.status(404).json({ success: false, message: "Address not found." });
            }
            addressId = addressInput;
            console.log("placeOrderCOD: Using existing address ID:", addressId);
        } else if (typeof addressInput === "object" && addressInput !== null) {
            // Case 2: Guest user (or new address for logged-in user) provides full address object
            const requiredFields = ["firstName", "lastName", "email", "street", "city", "state", "zipcode", "country", "phone"];
            const missing = requiredFields.find(field => !addressInput[field]);

            if (missing) {
                console.log(`placeOrderCOD: Validation failed - Missing address field: ${missing}`);
                return res.status(400).json({ success: false, message: `Missing address field: ${missing}` });
            }
            
            // Log the full address object received before creating
            console.log("placeOrderCOD: Creating new address with data:", addressInput);
            const newAddress = await Address.create({ ...addressInput, userId: userId || null });
            addressId = newAddress._id;
            console.log("placeOrderCOD: New address created with ID:", addressId);
        } else {
            // Case 3: Invalid address data type
            console.log("placeOrderCOD: Validation failed - Invalid address data provided (not string or object).");
            return res.status(400).json({ success: false, message: "Invalid address data provided." });
        }

        // --- Product and Stock Validation & Subtotal Calculation ---
        let subtotal = 0;
        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item.product)) {
                console.log(`placeOrderCOD: Validation failed - Invalid product ID format: ${item.product}`);
                return res.status(400).json({ success: false, message: `Invalid product ID format: ${item.product}` });
            }
            const product = await Product.findById(item.product);
            if (!product) {
                console.log(`placeOrderCOD: Validation failed - Product not found: ${item.product}`);
                return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
            }
            if (product.stock < item.quantity) {
                console.log(`placeOrderCOD: Validation failed - Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
                return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
            }
            if (!product.inStock) {
                console.log(`placeOrderCOD: Validation failed - Product not available: ${product.name}`);
                return res.status(400).json({ success: false, message: `${product.name} is currently not available.` });
            }
            subtotal += product.offerPrice * item.quantity;
        }
        const tax = Math.round(subtotal * 0.02);
        const totalAmount = subtotal + tax;
        console.log(`placeOrderCOD: Calculated total amount: ${totalAmount} (Subtotal: ${subtotal}, Tax: ${tax})`);

        // --- Create Order ---
        const order = await Order.create({
            userId: userId || null,
            guestName: guestDetails?.name,
            guestEmail: guestDetails?.email,
            guestPhone: guestDetails?.phone,
            items,
            amount: totalAmount,
            address: addressId, // Store the created/selected address ID
            paymentType: "COD",
            isPaid: false,
            status: "Order Placed"
        });
        console.log("placeOrderCOD: Order created with ID:", order._id);

        // --- Post-Order Actions ---
        await handleStockAndAlerts(items);
        console.log("placeOrderCOD: Stock updated and alerts handled.");

        if (userId) {
            await User.findByIdAndUpdate(userId, { cartItems: {} });
            console.log(`placeOrderCOD: Cart cleared for user ${userId}.`);
        }

        // --- Email Confirmation ---
        let recipientEmail, recipientName;
        if (userId) {
            const user = await User.findById(userId);
            recipientEmail = user?.email;
            recipientName = user?.name;
        } else {
            recipientEmail = guestDetails.email;
            recipientName = guestDetails.name;
        }

        if (recipientEmail) {
            await sendEmail({
                to: recipientEmail,
                subject: `Order Confirmation #${order._id}`,
                text: `Thank you for your order, ${recipientName}! Your order ID is ${order._id}.`
            }).catch(emailError => console.error("Error sending COD confirmation email:", emailError));
            console.log(`placeOrderCOD: Confirmation email sent to ${recipientEmail}.`);
        } else {
            console.log("placeOrderCOD: No recipient email found for confirmation.");
        }

        // --- Success Response ---
        return res.status(201).json({
            success: true,
            message: "Order placed successfully!",
            orderId: order._id
        });

    } catch (error) {
        // --- Error Handling ---
        console.error("placeOrderCOD: An error occurred:", error.message);
        return res.status(500).json({ success: false, message: error.message || "An unexpected error occurred while placing the order." });
    }
};

// Get Orders by User ID
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const orders = await Order.find({
            userId: userId,
            $or: [{ paymentType: "COD" }, { isPaid: true }],
        })
            .populate("items.product address")
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All Orders (admin/seller)
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            $or: [{ paymentType: "COD" }, { isPaid: true }],
        })
            .populate("items.product address userId")
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Order Details for Tracking
export const getOrderForTracking = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID format.' });
        }
        const order = await Order.findById(orderId)
            .populate({
                path: 'userId',
                select: 'name email'
            })
            .populate({
                path: 'items.product',
                select: 'name offerPrice image'
            })
            .populate('address');
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        const shippingAddressDetails = order.address;
        const trackingDetails = {
            orderId: order._id,
            customerName: order.userId ? order.userId.name : order.guestName || 'Guest',
            orderDate: order.createdAt,
            status: order.status,
            lastUpdated: order.updatedAt,
            paymentType: order.paymentType,
            isPaid: order.isPaid,
            orderItems: order.items.map(item => ({
                name: item.product ? item.product.name : 'Unknown Product',
                quantity: item.quantity,
                price: item.product ? item.product.offerPrice : 0,
                image: item.product ? item.product.image : null,
            })),
            totalAmount: order.amount,
            shippingAddress: shippingAddressDetails ? {
                firstName: shippingAddressDetails.firstName,
                lastName: shippingAddressDetails.lastName,
                email: shippingAddressDetails.email,
                fullName: `${shippingAddressDetails.firstName || ''} ${shippingAddressDetails.lastName || ''}`.trim(),
                addressLine1: shippingAddressDetails.street,
                city: shippingAddressDetails.city,
                state: shippingAddressDetails.state,
                zipcode: shippingAddressDetails.zipcode,
                country: shippingAddressDetails.country,
                phone: shippingAddressDetails.phone,
                formattedAddressString: `${shippingAddressDetails.street}${shippingAddressDetails.apartment ? ', ' + shippingAddressDetails.apartment : ''}, ${shippingAddressDetails.city}, ${shippingAddressDetails.state} - ${shippingAddressDetails.zipcode}, ${shippingAddressDetails.country} | Phone: ${shippingAddressDetails.phone}`
            } : null,
            shippingTrackingNumber: order.shippingTrackingNumber || null,
            shippingCarrier: order.shippingCarrier || null,
            shippingTrackingUrl: order.shippingTrackingUrl || null,
        };
        res.status(200).json({ success: true, trackingDetails });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching order details for tracking.' });
    }
};

// Cancel Order
export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?._id || null;
        if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ success: false, message: 'Invalid order ID format.' });
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });
        if (order.userId && userId && order.userId.toString() !== userId.toString()) return res.status(403).json({ success: false, message: "You are not authorized to cancel this order." });
        if (!order.userId && userId) return res.status(403).json({ success: false, message: "Only the original guest or admin can manage this order." });
        const uncancelableStatuses = ['Delivered', 'Cancelled', 'Shipped'];
        if (uncancelableStatuses.includes(order.status)) return res.status(400).json({ success: false, message: `Order cannot be cancelled as it is already '${order.status}'.` });

        order.status = 'Cancelled';
        await order.save();

        for (const item of order.items) {
            if (mongoose.Types.ObjectId.isValid(item.product)) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            }
        }

        const user = order.userId ? await User.findById(order.userId) : null;
        const customerEmail = user ? user.email : order.guestEmail;
        const customerName = user ? user.name : order.guestName || 'Customer';
        if (customerEmail) {
            await sendEmail({
                to: customerEmail,
                subject: `Your Grocerycart Order #${order._id} Has Been Cancelled`,
                text: `Dear ${customerName},\n\nYour order #${order._id} has been successfully cancelled.\n\nRegards,\nGrocerycart Team`
            }).catch(emailError => console.error("Error sending customer cancellation email:", emailError));
        }
        await sendEmail({
            to: process.env.SELLER_EMAIL,
            subject: `Order #${order._id} Cancelled by User`,
            text: `Order ID: ${order._id} has been cancelled by user ${customerName} (${customerEmail}).`
        }).catch(emailError => console.error("Error sending seller cancellation email:", emailError));

        res.json({ success: true, message: "Order cancelled successfully." });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Order Status (admin/seller)
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, shippingTrackingNumber, shippingCarrier, shippingTrackingUrl } = req.body;
        if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ success: false, message: 'Invalid order ID format.' });
        const validStatuses = ['Order Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid order status provided.' });
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            for (const item of order.items) {
                if (mongoose.Types.ObjectId.isValid(item.product)) {
                    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
                }
            }
        }
        order.status = status;
        if (status === 'Shipped') {
            order.shippingTrackingNumber = shippingTrackingNumber || order.shippingTrackingNumber;
            order.shippingCarrier = shippingCarrier || order.shippingCarrier;
            order.shippingTrackingUrl = shippingTrackingUrl || order.shippingTrackingUrl;
        } else {
            order.shippingTrackingNumber = null;
            order.shippingCarrier = null;
            order.shippingTrackingUrl = null;
        }
        await order.save();

        const user = order.userId ? await User.findById(order.userId) : null;
        const customerEmail = user ? user.email : order.guestEmail;
        const customerName = user ? user.name : order.guestName || 'Customer';

        if (customerEmail) {
            let emailSubject, emailText;
            if (status === 'Shipped') {
                emailSubject = `Your Grocerycart Order #${order._id} Has Been Shipped!`;
                emailText = `Dear ${customerName},\n\nYour order #${order._id} has been shipped and is on its way!`;
                if (order.shippingTrackingNumber && order.shippingCarrier) {
                    emailText += `\n\nTracking Number: ${order.shippingTrackingNumber} with ${order.shippingCarrier}.`;
                    if (order.shippingTrackingUrl) {
                        emailText += `\nTrack it here: ${order.shippingTrackingUrl}`;
                    }
                }
                emailText += `\n\nRegards,\nGrocerycart Team`;
            } else if (status === 'Delivered') {
                emailSubject = `Your Grocerycart Order #${order._id} Has Been Delivered!`;
                emailText = `Dear ${customerName},\n\nGood news! Your order #${order._id} has been delivered successfully. We hope you enjoy your purchase!\n\nRegards,\nGrocerycart Team`;
            } else if (status === 'Cancelled') {
                emailSubject = `Your Grocerycart Order #${order._id} Status Update: Cancelled`;
                emailText = `Dear ${customerName},\n\nYour order #${order._id} has been cancelled. If this was unexpected, please contact us.\n\nRegards,\nGrocerycart Team`;
            } else {
                emailSubject = `Your Grocerycart Order #${order._id} Status Update`;
                emailText = `Dear ${customerName},\n\nYour order #${order._id} status has been updated to: ${status}.\n\nRegards,\nGrocerycart Team`;
            }

            await sendEmail({
                to: customerEmail,
                subject: emailSubject,
                text: emailText,
            }).catch(emailError => console.error(`Error sending status update email for order ${order._id}:`, emailError));
        }

        res.json({ success: true, message: `Order status updated to '${status}'.`, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Address Management
export const getAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addresses = await Address.find({ userId });
        res.json({ success: true, addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const addressData = req.body;
        const requiredFields = ["firstName", "lastName", "email", "street", "city", "state", "zipcode", "country", "phone"];
        const missingField = requiredFields.find(field => !addressData[field]);
        if (missingField) return res.status(400).json({ success: false, message: `Missing required address field: ${missingField}` });
        await Address.create({ ...addressData, userId });
        res.status(201).json({ success: true, message: "Address added successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
