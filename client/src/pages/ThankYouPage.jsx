import React from 'react';
import { Link } from 'react-router-dom';

const ThankYouPage = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white text-gray-800 px-6 py-12">
      <div className="max-w-xl w-full text-center border border-gray-200 rounded-xl p-8 shadow-md">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">Thank You for Your Order!</h1>
        <p className="text-lg text-gray-600 mb-6">
          Your order has been placed successfully. A confirmation email with tracking details has been sent to you.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-4 mt-6">
          <Link
            to="/my-orders"
            className="px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition"
          >
            View My Orders
          </Link>
          <Link
            to="/"
            className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition"
          >
            Continue Shopping
          </Link>
        </div>

        <p className="text-sm text-gray-400 mt-10">Thank you for shopping with Grocerycart.</p>
      </div>
    </div>
  );
};

export default ThankYouPage;
