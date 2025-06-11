import React from 'react';
import { useAppContext } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { Link } from 'react-router-dom';

const Wishlist = () => {
    const { products, wishlistItems, navigate } = useAppContext();

    // CORRECTED LINE: Filter products to show only those present as keys in the wishlistItems object
    const productsInWishlist = products.filter(product =>
        // This checks if product._id exists as a property (key) in the wishlistItems object.
        // If it exists, wishlistItems[product._id] will be a truthy value, and the product is included.
        // If it doesn't exist, wishlistItems[product._id] will be undefined (falsy), and the product is excluded.
        wishlistItems[product._id]
    );

    return (
        <div className="mt-16 flex flex-col">
            <h1 className="text-4xl font-semibold text-gray-800 text-center mb-8">Your Wishlist</h1>
            <p className="text-gray-600 text-center mb-12">
                Here are all the items you've saved.
            </p>

            {productsInWishlist.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6 lg:grid-cols-5  mt-6">
                    {productsInWishlist.map(product => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-lg shadow-md">
                    <p className="text-2xl text-gray-700 font-medium mb-4">Your wishlist is empty!</p>
                    <p className="text-lg text-gray-500 mb-8">Start adding items you love to save them for later.</p>
                    <Link
                        to="/products"
                        onClick={() => scrollTo(0, 0)} // scrollTo(0,0) helps scroll to the top of the page
                        className="inline-block bg-primary text-white py-3 px-8 rounded-md hover:bg-primary-dull transition duration-300 ease-in-out"
                    >
                        Continue Shopping
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Wishlist;