// trackingController.js
import Order from "../models/Order.js";
import User from "../models/User.js"; // यूजर डिटेल्स पाने के लिए
import Address from "../models/Address.js"; // एड्रेस डिटेल्स पाने के लिए

// NEW: Controller function to get order details for tracking by orderId
export const getOrderForTracking = async (req, res) => {
    try {
        const { orderId } = req.params;

        // --- ADDED CONSOLE LOGS FOR DEBUGGING ---
        console.log('API Call: getOrderForTracking received request for Order ID:', orderId);
        // --- END ADDED CONSOLE LOGS ---

        // Validate if orderId is a valid MongoDB ObjectId
        if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log('Invalid order ID format received:', orderId); // Log invalid ID
            return res.status(400).json({ message: 'Invalid order ID format.' });
        }

        // Find the order by its _id and populate necessary fields
        const order = await Order.findById(orderId)
            .populate({
                path: 'user', // user model से 'name' और 'email' लाने के लिए
                select: 'name email'
            })
            .populate({
                path: 'items.product', // प्रोडक्ट डिटेल्स (name, price) लाने के लिए
                select: 'name offerPrice image'
            })
            .populate('address'); // <-- YAHAN 'shippingAddress' KI JAGAH 'address' KAREN

        // --- ADDED CONSOLE LOGS FOR DEBUGGING ---
        console.log('Result of Order.findById(orderId) and populate:', order ? 'Order found' : 'Order NOT found');
        if (!order) {
            console.log('Order not found in DB for ID:', orderId);
            return res.status(404).json({ message: 'Order not found.' });
        }
        console.log('Populated Order object (partial details for verification):', {
            _id: order._id,
            status: order.status,
            userId: order.userId,
            guestName: order.guestName,
            customerName_populated: order.user ? order.user.name : 'Guest (user not populated)', // Check if user was populated
            address_populated_id: order.address ? order.address._id : 'N/A (address not populated)', // Check if address was populated
            firstItemProduct_populated_name: order.items[0]?.product?.name || 'N/A (product not populated)' // Check first item product name
        });
        // --- END ADDED CONSOLE LOGS ---

        // Prepare the data to send back to the frontend for tracking
        const trackingDetails = {
            orderId: order._id,
            customerName: order.userId ? (order.user ? order.user.name : 'N/A') : (order.guestName || 'Guest'),
            customerEmail: order.userId ? (order.user ? order.user.email : 'N/A') : (order.guestEmail || 'N/A'),
            orderDate: order.createdAt,
            status: order.status,
            lastUpdated: order.updatedAt,

            orderItems: order.items.map(item => ({
                name: item.product ? item.product.name : 'Unknown Product',
                quantity: item.quantity,
                price: item.product ? item.product.offerPrice : 0,
                image: item.product ? item.product.image : null,
            })),
            totalAmount: order.amount,

            // Address details will now come from 'order.address' as it's populated
            shippingAddress: order.address ? {
                fullName: `${order.address.firstName || ''} ${order.address.lastName || ''}`.trim(),
                addressLine1: order.address.street,
                city: order.address.city,
                state: order.address.state,
                postalCode: order.address.zipcode,
                country: order.address.country,
                phone: order.address.phone,
                formattedAddressString: `${order.address.street}${order.address.apartment ? ', ' + order.address.apartment : ''}, ${order.address.city}, ${order.address.state} - ${order.address.zipcode}, ${order.address.country} | Phone: ${order.address.phone}`
            } : null,

            shippingTrackingNumber: order.shippingTrackingNumber || null,
            shippingCarrier: order.shippingCarrier || null,
            shippingTrackingUrl: order.shippingTrackingUrl || null,
        };

        res.status(200).json({ success: true, data: trackingDetails });
    } catch (error) {
        console.error('Error in getOrderForTracking:', error);
        res.status(500).json({ success: false, message: 'Server error fetching order details.' });
    }
};