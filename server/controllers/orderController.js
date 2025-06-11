// controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripePackage from "stripe"; // Correctly import the Stripe package
import User from "../models/User.js";
import Address from "../models/Address.js";
import { sendEmail } from "../utils/sendEmail.js"; // Assuming sendEmail is correctly implemented
import OrderConfirmationEmail from "../utils/OrderConfirmationEmail.js"; // Assuming this is an email template utility
import mongoose from "mongoose"; // For ObjectId validation

// Make sure dotenv.config() is called once in your main server.js file
// If it's called here again, it's harmless but redundant if already called.
// import dotenv from 'dotenv';
// dotenv.config();

// Initialize Stripe correctly using your secret key from environment variables
const stripeInstance = stripePackage(process.env.STRIPE_SECRET_KEY);

// Helper function to handle stock updates and low stock alerts
const handleStockAndAlerts = async (orderItems) => {
    for (const item of orderItems) {
        // Find product by ID and decrement stock
        const updatedProduct = await Product.findByIdAndUpdate(
            item.product, // Product ID
            { $inc: { stock: -item.quantity } }, // Decrement stock by ordered quantity
            { new: true } // Return the updated document
        );

        // Check for low stock and send alert email
        if (updatedProduct && updatedProduct.stock <= updatedProduct.minStockLevel) {
            console.log(`[Stock Alert] Product ${updatedProduct.name} is low on stock: ${updatedProduct.stock}`);
            await sendEmail({
                to: process.env.SELLER_EMAIL, // Seller's email for alerts
                subject: `LOW STOCK ALERT: ${updatedProduct.name}`,
                text: `Stock for "${updatedProduct.name}" is low: ${updatedProduct.stock} units remaining.`
            }).catch(emailError => console.error("Error sending low stock email:", emailError)); // Log email errors
        }
    }
};

// Place Order via Stripe (Online Payment)
export const placeOrderStripe = async (req, res) => {
    let order = null; // Initialize order to null for cleanup in case of error
    try {
        const { items, address: addressIdentifier, guestDetails } = req.body;
        // userId from req.user (set by authUser middleware)
        const userId = req.user?.id || null;
        const { origin } = req.headers; // Get origin for success/cancel URLs

        console.log("[placeOrderStripe] Received request. User ID:", userId, "Guest Details:", guestDetails);

        // 1. Validate origin header for redirects
        if (!origin) {
            console.error("[placeOrderStripe] Origin header is required for Stripe redirects.");
            return res.status(400).json({
                success: false,
                message: "Origin header is required for Stripe redirects. Ensure frontend sends it."
            });
        }

        // 2. Validate items array
        if (!items || !Array.isArray(items) || items.length === 0 || items.some(item => !item.product || !item.quantity)) {
            console.error("[placeOrderStripe] Invalid or missing cart items:", items);
            return res.status(400).json({
                success: false,
                message: "Invalid or missing cart items. Please provide product ID and quantity."
            });
        }

        // 3. Validate guest details for guest users
        if (!userId && (!guestDetails || !guestDetails.email || !guestDetails.name || !guestDetails.phone)) {
            console.error("[placeOrderStripe] Guest details missing for guest user.");
            return res.status(400).json({
                success: false,
                message: "Guest details (name, email, phone) are required for guest orders."
            });
        }

        // 4. Check product stock and availability for each item
        let subtotal = 0;
        const productDataForStripe = []; // To store product details for Stripe line_items

        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item.product)) {
                console.error(`[placeOrderStripe] Invalid product ID format: ${item.product}`);
                return res.status(400).json({
                    success: false,
                    message: `Invalid product ID format: ${item.product}`
                });
            }

            const product = await Product.findById(item.product);
            if (!product) {
                console.error(`[placeOrderStripe] Product not found: ${item.product}`);
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.product}. It might have been removed.`
                });
            }
            if (product.stock < item.quantity) {
                console.error(`[placeOrderStripe] Insufficient stock for ${product.name}. Requested: ${item.quantity}, Available: ${product.stock}`);
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
                });
            }
            if (!product.inStock) { // Check if product is explicitly marked as out of stock
                console.error(`[placeOrderStripe] Product ${product.name} is not available.`);
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is currently not available.`
                });
            }

            // Calculate subtotal and prepare data for Stripe
            subtotal += product.offerPrice * item.quantity;
            productDataForStripe.push({
                name: product.name,
                price: product.offerPrice,
                quantity: item.quantity
            });
        }

        // 5. Address handling (existing ID or new address object)
        let addressId = null;
        if (typeof addressIdentifier === 'string' && mongoose.Types.ObjectId.isValid(addressIdentifier)) {
            // Existing address ID provided
            const addressExists = await Address.exists({ _id: addressIdentifier });
            if (!addressExists) {
                console.error("[placeOrderStripe] Provided address ID not found:", addressIdentifier);
                return res.status(404).json({
                    success: false,
                    message: "Selected address not found. Please choose another or add a new one."
                });
            }
            addressId = addressIdentifier;
        } else if (typeof addressIdentifier === 'object' && addressIdentifier !== null) {
            // New address object provided
            const requiredAddressFields = ["firstName", "lastName", "email", "street", "city", "state", "zipcode", "country", "phone"];
            const missingAddressField = requiredAddressFields.find(field => !addressIdentifier[field]);
            if (missingAddressField) {
                console.error(`[placeOrderStripe] Missing required address field: ${missingAddressField}`);
                return res.status(400).json({
                    success: false,
                    message: `Missing address field: ${missingAddressField}`
                });
            }
            const newAddress = await Address.create({ ...addressIdentifier, userId });
            addressId = newAddress._id;
            console.log("[placeOrderStripe] New address created with ID:", addressId);
        } else {
            console.error("[placeOrderStripe] Invalid address data format:", addressIdentifier);
            return res.status(400).json({
                success: false,
                message: "Invalid address data. Please provide a valid address ID or a complete new address."
            });
        }

        // 6. Calculate final total including tax
        const tax = Math.round(subtotal * 0.02); // 2% tax
        const totalAmount = subtotal + tax;
        console.log(`[placeOrderStripe] Subtotal: ${subtotal}, Tax: ${tax}, Total: ${totalAmount}`);


        // 7. Create a pending order in your database
        order = await Order.create({
            userId,
            guestName: guestDetails?.name,
            guestEmail: guestDetails?.email,
            guestPhone: guestDetails?.phone,
            items: items, // Save original items with product IDs
            amount: totalAmount,
            address: addressId,
            paymentType: "Online",
            isPaid: false, // Will be updated by webhook
            status: "Pending Payment", // Initial status
        });
        console.log("[placeOrderStripe] Order created in DB with ID:", order._id);

        // 8. Get customer email and name for Stripe session
        let customerEmail, customerName;
        if (userId) {
            const user = await User.findById(userId);
            customerEmail = user?.email;
            customerName = user?.name;
        } else {
            customerEmail = guestDetails.email;
            customerName = guestDetails.name;
        }
        if (!customerEmail) {
            console.error("[placeOrderStripe] Customer email not found for Stripe session.");
            throw new Error("Customer email is required for Stripe checkout.");
        }
        console.log(`[placeOrderStripe] Stripe customer: ${customerName} (${customerEmail})`);

        // 9. Prepare Stripe line items
        const line_items = [
            ...productDataForStripe.map(item => ({
                price_data: {
                    currency: "inr", // Ensure currency matches your Stripe setup
                    product_data: { name: item.name },
                    unit_amount: Math.round(item.price * 100), // Convert to smallest currency unit (paise)
                },
                quantity: item.quantity,
            })),
            {
                price_data: {
                    currency: "inr",
                    product_data: { name: "Tax (2%)" },
                    unit_amount: tax * 100, // Tax amount in paise
                },
                quantity: 1,
            }
        ];
        console.log("[placeOrderStripe] Stripe line items prepared.");

        // 10. Create Stripe checkout session
        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: "payment",
            success_url: `${origin}/order-confirmation/${order._id}`, // Redirect after successful payment
            cancel_url: `${origin}/cart`, // Redirect if payment is cancelled
            customer_email: customerEmail,
            metadata: { // Custom data to pass to the webhook
                orderId: order._id.toString(),
                userId: userId ? userId.toString() : 'guest',
            },
        });
        console.log("[placeOrderStripe] Stripe session created:", session.url);

        // 11. Return Stripe session URL to frontend
        return res.json({ success: true, url: session.url });

    } catch (error) {
        console.error("Error in placeOrderStripe (Stripe order processing):", error);
        // If an order was created but Stripe session failed, delete the orphaned order
        if (order && order._id) {
            console.log("[placeOrderStripe] Deleting orphaned order:", order._id);
            await Order.findByIdAndDelete(order._id).catch(deleteErr => console.error("Error deleting orphaned order:", deleteErr));
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Payment processing failed. Please try again."
        });
    }
};

// Stripe Webhook Handler: Listens for events from Stripe
// IMPORTANT: This endpoint needs a special middleware in server.js to parse raw body
// controllers/orderController.js
export const stripeWebhooks = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    // 1. इवेंट वेरिफिकेशन
    try {
        event = stripeInstance.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log(JSON.stringify({
            type: "WEBHOOK_EVENT_RECEIVED",
            eventType: event.type,
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error(JSON.stringify({
            type: "SIGNATURE_VERIFICATION_FAILED",
            error: error.message
        }));
        return res.status(400).json({ error: "अमान्य सिग्नेचर" });
    }

    // 2. इवेंट हैंडलिंग
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { orderId, userId } = session.metadata || {};

        // 3. मेटाडेटा वैलिडेशन
        if (!orderId || !userId) {
            return res.status(400).json({
                error: "अधूरा डेटा",
                message: "orderId या userId मेटाडेटा में नहीं मिला"
            });
        }

        try {
            // 4. MongoDB ट्रांज़ैक्शन शुरू
            const dbSession = await mongoose.startSession();
            dbSession.startTransaction();

            // 5. ऑर्डर अपडेट
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
                throw new Error("ऑर्डर नहीं मिला");
            }

            // 6. स्टॉक अपडेट
            await handleStockAndAlerts(updatedOrder.items);

            // 7. कार्ट साफ़ करें
            if (userId !== 'guest') {
                await User.findByIdAndUpdate(
                    userId,
                    { $set: { cartItems: [] } },
                    { session: dbSession }
                );
            }

            // 8. ईमेल भेजें (3 बार रिट्री के साथ)
            let emailSent = false;
            if (session.customer_details?.email) {
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        await sendEmail({/*...*/});
                        emailSent = true;
                        break;
                    } catch (e) {
                        if(attempt === 3) console.error("ईमेल विफल", e);
                    }
                }
            }

            // 9. ट्रांज़ैक्शन कमिट
            await dbSession.commitTransaction();
            dbSession.endSession();

            // 10. सफलता प्रतिक्रिया
            return res.json({
                सफल: true,
                क्रियाएं: {
                    ऑर्डर_अपडेट: true,
                    स्टॉक_अपडेट: true,
                    कार्ट_साफ़: userId !== 'guest',
                    ईमेल_भेजा: emailSent
                }
            });

        } catch (error) {
            console.error(JSON.stringify({
                type: "WEBHOOK_PROCESSING_ERROR",
                error: error.message,
                stack: error.stack
            }));
            return res.status(500).json({
                error: "आंतरिक त्रुटि",
                message: error.message
            });
        }
    }

    // अन्य इवेंट्स के लिए
    return res.json({ सूचना: "इवेंट संसाधित नहीं हुआ" });
};


// Place Order Cash on Delivery (COD)
export const placeOrderCOD = async (req, res) => {
    try {
        console.log("[placeOrderCOD] Received COD order request.");
        const { items, address: addressInput, guestDetails } = req.body;
        // userId from req.user (set by authUser middleware)
        const userId = req.user?.id || null;

        // 1. Validate request body and essential fields
        if (!req.body || !items || !Array.isArray(items) || items.length === 0) {
            console.error("[placeOrderCOD] Invalid or missing request body/items.");
            return res.status(400).json({ success: false, message: "Missing or invalid order items." });
        }

        // 2. Validate items structure (product ID and quantity)
        if (items.some(item => !item.product || !item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0)) {
            console.error("[placeOrderCOD] One or more items have missing product ID or invalid quantity.");
            return res.status(400).json({
                success: false,
                message: "Each item must have a valid product ID and a positive quantity."
            });
        }

        // 3. Guest details validation (for guests only)
        if (!userId) { // If no logged-in user
            if (!guestDetails || !guestDetails.name || !guestDetails.email || !guestDetails.phone) {
                console.error("[placeOrderCOD] Guest details missing for guest order.");
                return res.status(400).json({
                    success: false,
                    message: "Guest details (name, email, phone) are required for guest orders."
                });
            }
        }
        console.log(`[placeOrderCOD] Order for User ID: ${userId || 'Guest'}.`);

        // 4. Address handling (existing ID or new address object)
        let addressId = null;
        if (typeof addressInput === "string" && mongoose.Types.ObjectId.isValid(addressInput)) {
            // Address is an existing address ID
            const addressExists = await Address.exists({ _id: addressInput });
            if (!addressExists) {
                console.error("[placeOrderCOD] Provided address ID not found:", addressInput);
                return res.status(404).json({ success: false, message: "Address not found." });
            }
            addressId = addressInput;
            console.log("[placeOrderCOD] Using existing address with ID:", addressId);
        } else if (typeof addressInput === "object" && addressInput !== null) {
            // Address is a new object (guest or user adding new address)
            const requiredAddressFields = ["firstName", "lastName", "email", "street", "city", "state", "zipcode", "country", "phone"];
            const missingAddressField = requiredAddressFields.find(field => !addressInput[field]);
            if (missingAddressField) {
                console.error(`[placeOrderCOD] Missing required address field: ${missingAddressField}`);
                return res.status(400).json({ success: false, message: `Missing address field: ${missingAddressField}` });
            }
            // Create a new address in the database
            const newAddress = await Address.create({
                ...addressInput,
                userId: userId || null // Associate with user if logged in, else null
            });
            addressId = newAddress._id;
            console.log("[placeOrderCOD] New address created with ID:", addressId);
        } else {
            console.error("[placeOrderCOD] Invalid address data format:", addressInput);
            return res.status(400).json({ success: false, message: "Invalid address data provided." });
        }

        // 5. Product and stock validation, and calculate subtotal
        let subtotal = 0;
        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item.product)) {
                console.error(`[placeOrderCOD] Invalid product ID format in items: ${item.product}`);
                return res.status(400).json({
                    success: false,
                    message: `Invalid product ID format: ${item.product}`
                });
            }
            const product = await Product.findById(item.product);
            if (!product) {
                console.error(`[placeOrderCOD] Product not found in DB: ${item.product}`);
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.product}. It might have been removed.`
                });
            }
            if (product.stock < item.quantity) {
                console.error(`[placeOrderCOD] Insufficient stock for ${product.name}. Requested: ${item.quantity}, Available: ${product.stock}`);
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
                });
            }
            if (!product.inStock) {
                console.error(`[placeOrderCOD] Product ${product.name} is not available.`);
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is currently not available.`
                });
            }
            subtotal += product.offerPrice * item.quantity;
        }
        console.log(`[placeOrderCOD] Subtotal calculated: ${subtotal}`);

        // 6. Calculate total amount including tax
        const tax = Math.round(subtotal * 0.02); // 2% tax
        const totalAmount = subtotal + tax;
        console.log(`[placeOrderCOD] Final total amount: ${totalAmount}`);

        // 7. Create the COD order in the database
        const order = await Order.create({
            userId: userId || null,
            guestName: guestDetails?.name,
            guestEmail: guestDetails?.email,
            guestPhone: guestDetails?.phone,
            items: items,
            amount: totalAmount,
            address: addressId,
            paymentType: "COD",
            isPaid: false, // COD is typically "unpaid" until delivery, but can be set to true if you consider it "paid" at placement
            status: "Order Placed" // Initial status for COD orders
        });
        console.log("[placeOrderCOD] COD order created in DB with ID:", order._id);

        // 8. Update product stock (decrement)
        await handleStockAndAlerts(items); // Use the helper function
        console.log("[placeOrderCOD] Product stock updated.");

        // 9. Clear cart for logged-in users
        if (userId) {
            await User.findByIdAndUpdate(userId, { cartItems: {} });
            console.log(`[placeOrderCOD] Cart cleared for user ${userId}.`);
        }

        // 10. Send order confirmation email
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
                template: OrderConfirmationEmail, // Your email template
                context: {
                    customerName: recipientName,
                    orderId: order._id.toString(),
                    totalAmount: order.amount,
                    orderTrackingUrl: `${process.env.FRONTEND_URL}/order-confirmation/${order._id}`
                }
            }).catch(emailError => console.error("Error sending COD confirmation email:", emailError));
            console.log(`[placeOrderCOD] Confirmation email sent to ${recipientEmail}.`);
        } else {
            console.warn("[placeOrderCOD] No recipient email found for COD confirmation.");
        }

        // 11. Respond to frontend
        return res.status(201).json({ // 201 Created for successful resource creation
            success: true,
            message: "Order placed successfully!",
            orderId: order._id
        });

    } catch (error) {
        console.error("Critical Error placing COD order:", error);
        // Provide more detailed error message in development, or a generic one in production
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : "Internal server error. Please try again.";
        return res.status(500).json({ success: false, message: errorMessage });
    }
};

// Get Orders by User ID: /api/order/user (Protected by authUser middleware)
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id; // _id is typically used by Mongoose
        console.log("[getUserOrders] Fetching orders for userId:", userId);

        const orders = await Order.find({
            userId: userId,
            // Only fetch COD orders or paid online orders
            $or: [{ paymentType: "COD" }, { isPaid: true }],
        })
            .populate("items.product address") // Populate product details and address details
            .sort({ createdAt: -1 }); // Sort by newest first

        console.log(`[getUserOrders] Found ${orders.length} orders for user ${userId}.`);

        res.json({ success: true, orders });
    } catch (error) {
        console.error("Error in getUserOrders:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All Orders (for seller/admin): /api/order/seller (Needs admin/seller auth middleware)
export const getAllOrders = async (req, res) => {
    try {
        console.log("[getAllOrders] Fetching all orders for admin/seller.");
        const orders = await Order.find({
            $or: [{ paymentType: "COD" }, { isPaid: true }],
        })
            .populate("items.product address userId") // Populate product, address, and user info
            .sort({ createdAt: -1 });

        console.log(`[getAllOrders] Found ${orders.length} total orders.`);
        res.json({ success: true, orders });
    } catch (error) {
        console.error("Error in getAllOrders:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Order Details for Tracking by Order ID: /api/order/:orderId
export const getOrderForTracking = async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log("[getOrderForTracking] Request for order ID:", orderId);

        // Validate if orderId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.error("[getOrderForTracking] Invalid order ID format:", orderId);
            return res.status(400).json({ success: false, message: 'Invalid order ID format.' });
        }

        const order = await Order.findById(orderId)
            .populate({
                path: 'userId', // Changed from 'user' to 'userId' to match schema field name
                select: 'name email'
            })
            .populate({
                path: 'items.product',
                select: 'name offerPrice image'
            })
            .populate('address'); // Populate the address details

        if (!order) {
            console.warn("[getOrderForTracking] Order not found for ID:", orderId);
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        console.log("[getOrderForTracking] Order found:", order._id);

        const shippingAddressDetails = order.address;

        const trackingDetails = {
            orderId: order._id,
            // Use order.userId for logged-in user or order.guestName for guest
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
                image: item.product ? item.product.image : null, // Include image if available
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
        console.error('Error in getOrderForTracking:', error);
        res.status(500).json({ success: false, message: 'Server error fetching order details for tracking.' });
    }
};

// Cancel Order Controller Function
export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?._id || null; // Ensure userId is available, even if null for guests
        console.log(`[cancelOrder] Request to cancel order ${orderId} by user ${userId}.`);

        // Validate if orderId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.error("[cancelOrder] Invalid order ID format:", orderId);
            return res.status(400).json({ success: false, message: 'Invalid order ID format.' });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            console.warn("[cancelOrder] Order not found for ID:", orderId);
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Authorization check for logged-in users (guests can't cancel a specific order ID associated with a user)
        if (order.userId && userId && order.userId.toString() !== userId.toString()) {
            console.warn(`[cancelOrder] User ${userId} unauthorized to cancel order ${orderId} (belongs to ${order.userId}).`);
            return res.status(403).json({ success: false, message: "You are not authorized to cancel this order." });
        }
        // If it's a guest order, allow cancellation if no userId is associated
        if (!order.userId && userId) { // A logged-in user trying to cancel a guest order (shouldn't happen via proper routes)
             console.warn(`[cancelOrder] Logged-in user ${userId} attempted to cancel a guest order ${orderId}.`);
             // Optionally, disallow or add more stringent guest-specific checks (e.g., email verification)
             return res.status(403).json({ success: false, message: "Only the original guest or admin can manage this order." });
        }


        // Prevent cancellation if status is Delivered, Cancelled, or Shipped
        const uncancelableStatuses = ['Delivered', 'Cancelled', 'Shipped'];
        if (uncancelableStatuses.includes(order.status)) {
            console.warn(`[cancelOrder] Order ${orderId} cannot be cancelled as it is already '${order.status}'.`);
            return res.status(400).json({ success: false, message: `Order cannot be cancelled as it is already '${order.status}'.` });
        }

        order.status = 'Cancelled';
        await order.save();
        console.log(`[cancelOrder] Order ${order._id} status updated to 'Cancelled'.`);

        // Increment stock back for cancelled order
        for (const item of order.items) {
            // Only increment if product ID is valid
            if (mongoose.Types.ObjectId.isValid(item.product)) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
                console.log(`[cancelOrder] Stock for product ${item.product} incremented by ${item.quantity}.`);
            } else {
                console.warn(`[cancelOrder] Skipping stock increment for invalid product ID: ${item.product}`);
            }
        }

        // Send cancellation confirmation email
        const user = order.userId ? await User.findById(order.userId) : null;
        const customerEmail = user ? user.email : order.guestEmail;
        const customerName = user ? user.name : order.guestName || 'Customer';

        if (customerEmail) {
            await sendEmail({
                to: customerEmail,
                subject: `Your Grocerycart Order #${order._id} Has Been Cancelled`,
                text: `Dear ${customerName},\n\nYour order #${order._id} has been successfully cancelled.\n\nRegards,\nGrocerycart Team`
            }).catch(emailError => console.error("Error sending customer cancellation email:", emailError));
            console.log(`[cancelOrder] Cancellation email sent to customer ${customerEmail}.`);
        } else {
            console.warn("[cancelOrder] No customer email found for cancellation confirmation.");
        }

        // Notify seller/admin about the cancellation
        await sendEmail({
            to: process.env.SELLER_EMAIL,
            subject: `Order #${order._id} Cancelled by User`,
            text: `Order ID: ${order._id} has been cancelled by user ${customerName} (${customerEmail}).`
        }).catch(emailError => console.error("Error sending seller cancellation email:", emailError));
        console.log(`[cancelOrder] Seller notification sent for order ${order._id} cancellation.`);


        res.json({ success: true, message: "Order cancelled successfully." });

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Order Status (for admin/seller actions)
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, shippingTrackingNumber, shippingCarrier, shippingTrackingUrl } = req.body;
        console.log(`[updateOrderStatus] Request to update order ${orderId} to status: ${status}.`);

        // Validate orderId format
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.error("[updateOrderStatus] Invalid order ID format:", orderId);
            return res.status(400).json({ success: false, message: 'Invalid order ID format.' });
        }

        const validStatuses = ['Order Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            console.error(`[updateOrderStatus] Invalid status provided: ${status}`);
            return res.status(400).json({ success: false, message: 'Invalid order status provided.' });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            console.warn("[updateOrderStatus] Order not found for ID:", orderId);
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Handle stock return if status changes to 'Cancelled' from a non-cancelled state
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            console.log(`[updateOrderStatus] Order ${orderId} changing to 'Cancelled' from '${order.status}'. Returning stock.`);
            for (const item of order.items) {
                // Ensure to increment stock only if product ID is valid
                if (mongoose.Types.ObjectId.isValid(item.product)) {
                    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
                    console.log(`[updateOrderStatus] Stock for product ${item.product} incremented by ${item.quantity}.`);
                } else {
                    console.warn(`[updateOrderStatus] Skipping stock increment for invalid product ID: ${item.product}`);
                }
            }
        }
        // If status changes from 'Cancelled' to something else, stock is NOT decremented here
        // That would require a separate logic path, potentially for re-activating orders.

        order.status = status;
        if (status === 'Shipped') {
            order.shippingTrackingNumber = shippingTrackingNumber || order.shippingTrackingNumber;
            order.shippingCarrier = shippingCarrier || order.shippingCarrier;
            order.shippingTrackingUrl = shippingTrackingUrl || order.shippingTrackingUrl;
            console.log(`[updateOrderStatus] Order ${orderId} marked as 'Shipped'. Tracking info updated.`);
        } else {
            // Clear tracking info if status changes from Shipped to something else (e.g., Delivered)
            // Or if status is not 'Shipped' at all.
            order.shippingTrackingNumber = null;
            order.shippingCarrier = null;
            order.shippingTrackingUrl = null;
        }

        await order.save();
        console.log(`[updateOrderStatus] Order ${order._id} status successfully updated to '${status}'.`);

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
                 // Cancellation email logic is already in cancelOrder, but keeping this as a fallback/alternative
                 emailSubject = `Your Grocerycart Order #${order._id} Status Update: Cancelled`;
                 emailText = `Dear ${customerName},\n\nYour order #${order._id} has been cancelled. If this was unexpected, please contact us.\n\nRegards,\nGrocerycart Team`;
            } else {
                // For 'Order Placed' or 'Processing' status updates
                emailSubject = `Your Grocerycart Order #${order._id} Status Update`;
                emailText = `Dear ${customerName},\n\nYour order #${order._id} status has been updated to: ${status}.\n\nRegards,\nGrocerycart Team`;
            }

            await sendEmail({
                to: customerEmail,
                subject: emailSubject,
                text: emailText, // Using text for simplicity, you can use template if preferred
            }).catch(emailError => console.error(`Error sending status update email for order ${order._id}:`, emailError));
            console.log(`[updateOrderStatus] Status update email sent to customer ${customerEmail}.`);
        } else {
            console.warn("[updateOrderStatus] No customer email found for status update notification.");
        }

        res.json({ success: true, message: `Order status updated to '${status}'.`, order });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// Get User Addresses: /api/order/address
export const getAddress = async (req, res) => {
    try {
        const userId = req.user.id; // From authUser middleware
        console.log(`[getAddress] Fetching addresses for user: ${userId}`);
        const addresses = await Address.find({ userId });
        console.log(`[getAddress] Found ${addresses.length} addresses.`);
        res.json({ success: true, addresses });
    } catch (error) {
        console.error("Error in getAddress:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add New Address: /api/order/address
export const addAddress = async (req, res) => {
    try {
        const userId = req.user.id; // From authUser middleware
        const addressData = req.body;
        console.log(`[addAddress] Adding new address for user ${userId}.`);

        // Basic validation for new address fields (can be more robust)
        const requiredAddressFields = ["firstName", "lastName", "email", "street", "city", "state", "zipcode", "country", "phone"];
        const missingField = requiredAddressFields.find(field => !addressData[field]);
        if (missingField) {
            console.error(`[addAddress] Missing required address field: ${missingField}`);
            return res.status(400).json({ success: false, message: `Missing required address field: ${missingField}` });
        }

        await Address.create({ ...addressData, userId });
        console.log("[addAddress] Address added successfully.");
        res.status(201).json({ success: true, message: "Address added successfully" });
    } catch (error) {
        console.error("Error in addAddress:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
