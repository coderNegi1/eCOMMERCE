// src/pages/Orders.jsx (Admin/Seller Order List)

import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets';
import axios from 'axios';
import toast from 'react-hot-toast';

function Orders() {
  const { currency } = useAppContext();
  const [orders, setOrders] = useState([]);

  // Fetch all orders for the admin view
  const fetchOrders = async () => {
    try {
      const { data } = await axios.get('/api/orders/seller');
      if (data.success) {
        setOrders(data.orders);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error fetching orders for admin.');
      console.error("Error fetching orders for admin:", error);
    }
  };

  // Handle status change from the dropdown
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const { data } = await axios.put(`/api/orders/update-status/${orderId}`, { status: newStatus });
      if (data.success) {
        toast.success(`Order ${orderId} updated to ${newStatus}`);
        fetchOrders(); // Re-fetch orders to update the UI
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status.');
      console.error("Error updating order status:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className='no-scrollbar flex-1 h-[95vh] overflow-y-scroll flex flex-col justify-between'>
      <div className="md:p-10 p-4 space-y-4">
        <h2 className="text-lg font-medium">Orders List</h2>
        {orders.length === 0 ? (
          <p className="text-gray-600">No orders available.</p>
        ) : (
          orders.map((order, index) => (
            <div key={index} className="flex flex-col gap-4 p-4 rounded-md border border-gray-300 md:flex-row md:items-center md:justify-between md:p-5">
              {/* Product Info */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5 md:max-w-80 w-full">
                <img className="w-12 h-12 object-cover" src={assets.box_icon} alt="boxIcon" />
                <div className="flex-1">
                  {order.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex flex-col mb-1 last:mb-0">
                      <p className="font-medium text-sm md:text-base">
                        {item.product?.name || "Product Not Found"}{" "}
                        <span className="text-primary">x {item.quantity}</span>
                      </p>
                    </div>
                  ))}
                  {/* Customer Info */}
                  <p className="mt-2 text-xs text-gray-700 md:text-sm">
                    Customer:{" "}
                    {order.userId && typeof order.userId === 'object'
                      ? (
                        <span>
                          <strong className='text-gray-900'>
                            {order.userId.name || order.userId.email || order.userId._id}
                          </strong>
                        </span>
                      )
                      : order.userId
                        ? <span>ID: <strong className='text-gray-900'>{order.userId}</strong></span>
                        : <span>
                            <strong className='text-gray-900'>{order.guestName || "Guest"}</strong>
                            {order.guestPhone && ` (Phone: ${order.guestPhone})`}
                          </span>
                    }
                  </p>
                </div>
              </div>

              {/* Address Section */}
              <div className="text-xs md:text-sm text-black/60 w-full md:w-auto">
                <p className='text-black/80 font-semibold'>
                  {order.address?.firstName} {order.address?.lastName}
                  {order.guestEmail && ` (${order.guestEmail})`}
                </p>
                <p>{order.address?.street}, {order.address?.city}</p>
                <p>{order.address?.state}, {order.address?.zipcode}, {order.address?.country}</p>
                <p>Phone: {order.address?.phone}</p>
              </div>

              {/* Total Amount */}
              <p className="font-medium text-lg text-center w-full md:w-auto my-2 md:my-auto">
                {currency}{order.amount}
              </p>

              {/* Payment and Date Information & Status Dropdown */}
              <div className="flex flex-col text-xs md:text-sm text-black/60 w-full md:w-auto">
                <p>Method: <span className="font-medium">{order.paymentType}</span></p>
                <p>Date: <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span></p>
                <p>Payment: <span className={`font-medium ${order.isPaid ? 'text-green-600' : 'text-red-500'}`}>{order.isPaid ? "Paid" : "Pending"}</span></p>
                <p className="mt-2">
                  <select
                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                    value={order.status}
                    className="p-1 border border-gray-300 rounded-md shadow-sm bg-white
                              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                              text-gray-800 text-xs md:text-sm appearance-none pr-8"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.5rem center',
                      backgroundSize: '1em 1em',
                    }}
                  >
                    <option value="Order Placed">Order Placed</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Orders;
