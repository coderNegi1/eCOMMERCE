import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAppContext } from '../context/AppContext';

const MyOrders = () => {
    const [myOrders, setMyOrders] = useState([]);
    const { currency, axios, user, cancelOrder } = useAppContext();

    const fetchMyOrders = async () => {
        try {
            const { data } = await axios.get('/api/orders/user');
            console.log(data); // Debugging: check API response

            if (data.success) {
                setMyOrders(data.orders);
            } else {
                console.log("No orders found:", data.message);
                setMyOrders([]);
            }
        } catch (error) {
            console.log(error.response?.data?.message || 'Error fetching orders');
            setMyOrders([]);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (window.confirm("Are you sure you want to cancel this order?")) {
            const success = await cancelOrder(orderId);
            if (success) {
                fetchMyOrders();
            }
        }
    };

    useEffect(() => {
        if (user) {
            fetchMyOrders();
        } else {
            setMyOrders([]);
        }
    }, [user]);

    return (
        <div className='mt-16 mb-16 px-4 md:px-8 lg:px-12'>
            <div className='flex flex-col items-end w-max mb-8'>
                <p className='text-2xl font-medium uppercase'>My Orders</p>
                <div className='w-16 h-0.5 bg-primary rounded-full'></div>
            </div>
            {myOrders.length === 0 ? (
                <p className='text-center text-gray-600 text-lg'>No orders available</p>
            ) : (
                myOrders.map((order, index) => (
                    <div key={index} className='border border-gray-300 rounded-lg mb-10 p-4 py-5 max-w-4xl mx-auto'>
                        <p className='flex justify-between md:items-center text-gray-600 md:font-medium max-md:flex-col text-sm md:text-base mb-4'>
                            <span><strong className='text-black'>Order ID:</strong> {order._id}</span>
                            <span><strong className='text-black'>Payment:</strong> {order.paymentType}</span>
                            <span><strong className='text-black'>Total Amount:</strong> {currency}{order.amount}</span>
                            <span><strong className='text-black'>Status:</strong> <span className={`font-semibold ${order.status === 'Cancelled' ? 'text-red-500' : order.status === 'Delivered' ? 'text-green-600' : 'text-blue-500'}`}>{order.status}</span></span>
                        </p>
                        {order.items.map((item, itemIndex) => (
                            <div key={itemIndex} className={`relative bg-white text-gray-500/70 ${order.items.length !== itemIndex + 1 && "border-b"} border-gray-300 flex flex-col md:flex-row md:items-center justify-between p-4 py-5 md:gap-16 w-full`}>
                                <div className='flex items-center mb-4 md:mb-0'>
                                    <div className='bg-primary/10 p-2 rounded-lg'>
                                        <img src={item.product?.image?.[0] || 'https://via.placeholder.com/64'} alt="Product" className='w-16 h-16 object-cover' />
                                    </div>
                                    <div className='ml-4'>
                                        <h2 className='text-lg font-semibold text-gray-800'>{item.product?.name || "Product Name Not Available"}</h2>
                                        <p className='text-sm text-gray-500'>Category: {item.product?.category || "Category Not Available"}</p>
                                    </div>
                                </div>

                                <div className='flex flex-col justify-center md:ml-8 mb-4 md:mb-0 text-sm'>
                                    <p>Quantity: <strong className='text-gray-800'>{item.quantity || "1"}</strong></p>
                                    <p>Date: <strong className='text-gray-800'>{new Date(order.createdAt).toLocaleDateString()}</strong></p>
                                </div>
                                <p className='text-primary text-lg font-medium'>
                                    Amount: {currency}{item.product?.offerPrice * item.quantity}
                                </p>
                            </div>
                        ))}
                        <div className="flex justify-end gap-3 mt-4">
                            {(order.status === 'Order Placed' || order.status === 'Processing') && (
                                <button
                                    onClick={() => handleCancelOrder(order._id)}
                                    className="inline-block px-5 py-2 bg-red-500 text-white text-sm font-semibold rounded-md hover:bg-red-600 transition duration-200"
                                >
                                    Cancel Order
                                </button>
                            )}
                            {/* The path is changed from /track/ to /track-order/ for consistency with email */}
                            <Link
                                to={`/order-confirmation/${order._id}`}
                                className="inline-block px-5 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-dark transition duration-200"
                            >
                                Track This Order
                            </Link>

                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default MyOrders;