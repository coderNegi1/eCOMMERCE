// src/pages/OrderTrackingPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const OrderTrackingPage = () => {
    const { orderId } = useParams();
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currency, axios } = useAppContext();

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!orderId) {
                setError("No order ID provided in the URL.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const response = await axios.get(`/api/track/${orderId}`);

                // --- FIX STARTS HERE ---
                // The backend sends { success: true, data: { ...order_details... } }
                // So, we need to access response.data.data
                if (response.data.success === false || !response.data.data) {
                    throw new Error(response.data.message || 'Failed to fetch order details.');
                }

                setOrderData(response.data.data); // <--- THIS IS THE KEY CHANGE
                // --- FIX ENDS HERE ---

            } catch (err) {
                console.error("Error fetching order details:", err);
                setError(err.message || "Could not load order details. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId, axios]);

    const formatAddress = (address) => {
        if (!address) return "N/A";
        const parts = [
            address.fullName,
            address.addressLine1,
            address.addressLine2,
            `${address.city}, ${address.state} - ${address.postalCode}`,
            address.country,
            `Phone: ${address.phone}`
        ].filter(Boolean);
        return parts.join(', ');
    };

    const formattedOrderDate = orderData?.orderDate ? new Date(orderData.orderDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'N/A';

    if (loading) {
        return (
            <div className='flex justify-center items-center h-screen'>
                <p className='text-xl text-gray-600'>Loading your order details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex flex-col items-center justify-center h-screen p-4 text-center'>
                <h2 className='text-3xl font-bold text-red-600 mb-4'>Error!</h2>
                <p className='text-lg text-gray-700 mb-6'>{error}</p>
                <p className='text-md text-gray-500'>Please ensure the order ID is correct or contact support if the issue persists.</p>
                <Link to="/" className="mt-8 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                    Go to Home
                </Link>
            </div>
        );
    }

    if (!orderData) {
        return (
            <div className='flex flex-col items-center justify-center h-screen p-4 text-center'>
                <p className='text-xl text-gray-700 mb-6'>No order details found for this ID. It might be invalid or not exist.</p>
                <Link to="/" className="mt-8 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                    Go to Home
                </Link>
            </div>
        );
    }

    return (
        <div className='mt-16 mb-16 p-4 md:p-8 max-w-4xl mx-auto'>
            <div className='flex flex-col items-end w-max mb-8'>
                <p className='text-2xl font-medium uppercase'>Order Tracking</p>
                <div className='w-16 h-0.5 bg-primary rounded-full'></div>
            </div>

            <div className='border border-gray-300 rounded-lg mb-10 p-4 py-5'>
                <p className='flex justify-between md:items-center text-gray-600 md:font-medium max-md:flex-col mb-2'>
                    <span>Order ID: <strong className='text-gray-800'>{orderData.orderId}</strong></span>
                    <span>Order Date: {formattedOrderDate}</span>
                </p>
                <p className='text-lg font-semibold text-primary mb-4'>
                    Current Status: <strong className='text-green-600'>{orderData.status}</strong>
                </p>

                <div className='border-t border-gray-300 pt-4'>
                    <h3 className='text-xl font-semibold text-gray-700 mb-4'>Order Items:</h3>
                    {orderData.orderItems && orderData.orderItems.map((item, index) => (
                        <div key={index} className={`relative bg-white text-gray-500/70 ${orderData.orderItems.length !== index + 1 && "border-b"} border-gray-300 flex flex-col md:flex-row md:items-center justify-between p-4 py-5 md:gap-16 w-full`}>
                            <div className='flex items-center mb-4 md:mb-0'>
                                <div className='bg-primary/10 p-4 rounded-lg'>
                                    <img
                                        src={item.image || 'https://via.placeholder.com/64?text=No+Image'}
                                        alt={item.name}
                                        className='w-16 h-16 object-cover rounded-md'
                                    />

                                </div>
                                <div className='ml-4'>
                                    <h2 className='text-lg font-medium text-gray-800'>{item.name || "Product Name Not Available"}</h2>
                                    <p className='text-sm text-gray-600'>Quantity: {item.quantity || "1"}</p>
                                </div>
                            </div>
                            <p className='text-primary text-lg font-medium'>
                                Amount: {currency}{item.price ? item.price.toFixed(2) : (0).toFixed(2)}
                            </p>
                        </div>
                    ))}
                    <div className='flex justify-end mt-4 pt-4 border-t border-gray-300'>
                        <p className='text-xl font-bold text-gray-800'>
                            Total Amount: {currency}{orderData.totalAmount ? orderData.totalAmount.toFixed(2) : (0).toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className='border-t border-gray-300 pt-4 mt-6'>
                    <h3 className='text-xl font-semibold text-gray-700 mb-4'>Shipping Address:</h3>
                    <p className='text-gray-600 text-base leading-relaxed'>
                        {formatAddress(orderData.shippingAddress)}
                    </p>
                </div>

                {orderData.shippingTrackingNumber && (
                    <div className='border-t border-gray-300 pt-4 mt-6'>
                        <h3 className='text-xl font-semibold text-gray-700 mb-4'>Shipping Information:</h3>
                        <p className='text-gray-600'>Tracking Number: <strong className='text-gray-800'>{orderData.shippingTrackingNumber}</strong></p>
                        <p className='text-gray-600'>Carrier: {orderData.shippingCarrier}</p>
                        {orderData.shippingTrackingUrl && (
                            <a
                                href={orderData.shippingTrackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-block px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Track on Carrier Website
                            </a>
                        )}
                    </div>
                )}

                <p className='text-center text-gray-500 text-sm mt-8'>Thank you for shopping with Grocerycart!</p>
            </div>
        </div>
    );
};

export default OrderTrackingPage;