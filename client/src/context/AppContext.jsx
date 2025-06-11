// import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";
// import axios from "axios";

// axios.defaults.withCredentials = true;
// axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

// export const AppContext = createContext();

// export const AppContextProvider = ({ children }) => {
//     const currency = import.meta.env.VITE_CURRENCY || "₹"; // fallback currency

//     const navigate = useNavigate();
//     const [user, setUser] = useState(null);
//     const [isSeller, setIsSeller] = useState(false);
//     const [showUserLogin, setShowUserLogin] = useState(false);
//     const [products, setProducts] = useState([]);
//     const [cartItems, setCartItems] = useState({});
//     const [searchQuery, setSearchQuery] = useState('');
//     const [wishlistItems, setWishlistItems] = useState({});


//     //Fetch Seller status
//     const fetchSeller = async () => {
//         try {
//             const { data } = await axios.get('/api/seller/is-auth');
//             if (data.success) {
//                 setIsSeller(true)
//             } else {
//                 setIsSeller(false)
//             }
//         } catch (error) {
//             setIsSeller(false)
//             console.error("Error fetching seller status:", error);
//         }
//     }

//     //Fetch User Auth status, User Data, Cart Items, AND WISHLIST ITEMS
//     const fetchUser = async () => {
//         try {
//             const { data } = await axios.get('/api/user/is-auth');
//             if (data.success) {
//                 setUser(data.user)
//                 setCartItems(data.user.cartItems || {}); // Ensure it's an object
//                 setWishlistItems(data.user.wishlist || {}); // <--- IMPORTANT: Set wishlist here
//             } else {
//                 // If not authenticated, clear user-specific data
//                 setUser(null);
//                 setCartItems({});
//                 setWishlistItems({});
//             }
//         } catch (error) {
//             setUser(null);
//             setCartItems({});
//             setWishlistItems({});
//             console.error("Error fetching user auth status:", error);
//             // This is where you might get "Not Authorized" if the cookie is bad.
//             // If the user's session ends, we ensure local state is cleared.
//         }
//     }

//     // Fetch All products (wrapped in useCallback for useEffect dependency)
//     const fetchProducts = useCallback(async () => {
//         try {
//             const { data } = await axios.get('/api/product/list')
//             if (data.success) {
//                 setProducts(data.products)
//             } else {
//                 toast.error(data.message)
//             }
//         } catch (error) {
//             toast.error(error.message)
//             console.error("Error fetching products:", error);
//         }
//     }, []);


//     // Add product to cart (client-side update, then sync to backend)
//     const addToCart = (itemId) => {
//         setCartItems(prevCartItems => {
//             const updatedCart = { ...prevCartItems };
//             updatedCart[itemId] = (updatedCart[itemId] || 0) + 1;
//             toast.success("Added to Cart");
//             return updatedCart;
//         });
//     };

//     // Update cart item quantity (client-side update, then sync to backend)
//     const updateCartItem = (itemId, quantity) => {
//         setCartItems(prevCartItems => {
//             const updatedCart = { ...prevCartItems };
//             if (quantity <= 0) {
//                 delete updatedCart[itemId];
//                 toast.success("Item removed from cart");
//             } else {
//                 updatedCart[itemId] = quantity;
//                 toast.success("Cart Updated");
//             }
//             return updatedCart;
//         });
//     };

//     // Remove product from cart (client-side update, then sync to backend)
//     const removeCartItem = (itemId) => {
//         setCartItems(prevCartItems => {
//             const updatedCart = { ...prevCartItems };
//             if (updatedCart[itemId]) {
//                 updatedCart[itemId] -= 1;
//                 if (updatedCart[itemId] === 0) {
//                     delete updatedCart[itemId];
//                     toast.success("Item removed from cart");
//                 } else {
//                     toast.success("Item quantity decreased");
//                 }
//             }
//             return updatedCart;
//         });
//     };

//     // Get total number of items in cart
//     const getCartCount = () => {
//         let totalCount = 0;
//         for (const item in cartItems) {
//             totalCount += cartItems[item];
//         }
//         return totalCount;
//     };

//     // Get total cart amount
//     const getCartAmount = () => {
//         let totalAmount = 0;
//         for (const itemId in cartItems) {
//             const itemInfo = products.find((product) => product._id === itemId);
//             if (itemInfo) {
//                 totalAmount += itemInfo.offerPrice * cartItems[itemId];
//             }
//         }
//         return Math.floor(totalAmount * 100) / 100;
//     };

//     // Load initial data on mount (user auth, seller status, all products)
//     useEffect(() => {
//         fetchUser(); // This now handles getting wishlist too
//         fetchSeller();
//         fetchProducts();
//     }, [fetchProducts]); // Dependency added for fetchProducts useCallback

//     // Add or toggle item in wishlist (NOW INCLUDES API CALLS)
//     const toggleWishlistItem = async (itemId) => {
//         if (!user) { // Ensure user is logged in
//             toast.error('Please log in to manage your wishlist!');
//             navigate('/login');
//             return;
//         }

//         try {
//             let updatedWishlist;
//             let successMessage;

//             if (wishlistItems[itemId]) {
//                 // Item is in wishlist, so remove it
//                 const { data } = await axios.put('/api/wishlist/remove', { productId: itemId });
//                 if (data.success) {
//                     updatedWishlist = { ...wishlistItems };
//                     delete updatedWishlist[itemId];
//                     successMessage = "Removed from Wishlist";
//                 } else {
//                     toast.error(data.message);
//                     return; // Stop execution if backend reports failure
//                 }
//             } else {
//                 // Item is not in wishlist, so add it
//                 const { data } = await axios.put('/api/wishlist/add', { productId: itemId });
//                 if (data.success) {
//                     updatedWishlist = { ...wishlistItems, [itemId]: true };
//                     successMessage = "Added to Wishlist";
//                 } else {
//                     toast.error(data.message);
//                     return; // Stop execution if backend reports failure
//                 }
//             }

//             setWishlistItems(updatedWishlist);
//             toast.success(successMessage);
//         } catch (error) {
//             console.error("Error toggling wishlist item:", error);
//             // This is where "Not Authorized" from the backend would be caught
//             if (error.response && error.response.status === 401) {
//                 toast.error("You are not authorized. Please log in again.");
//                 setUser(null); // Clear user state
//                 setCartItems({}); // Clear cart
//                 setWishlistItems({}); // Clear wishlist
//                 // Optionally navigate to login
//                 // navigate('/login');
//             } else {
//                 toast.error(error.response?.data?.message || "Failed to update wishlist. Please try again.");
//             }
//         }
//     };

//     // Check if item is in wishlist
//     const isInWishlist = (itemId) => !!wishlistItems[itemId];

//     // --- useEffect for syncing Cart to Backend ---
//     useEffect(() => {
//         const updateCartInBackend = async () => {
//             if (!user) { // Only update if user is logged in
//                 return;
//             }
//             try {
//                 const { data } = await axios.post('/api/cart/update', { cartItems });
//                 if (!data.success) {
//                     toast.error(data.message);
//                 }
//             } catch (error) {
//                 console.error("Error updating cart in backend:", error);
//                 toast.error("Failed to sync cart: " + (error.response?.data?.message || error.message));
//             }
//         };

//         // Delay the update to avoid too many requests on rapid changes
//         const handler = setTimeout(() => {
//             updateCartInBackend();
//         }, 500); // Debounce for 500ms

//         return () => {
//             clearTimeout(handler); // Cleanup on component unmount or dependency change
//         };
//     }, [cartItems, user]); // Depend on cartItems and user

//     // --- New: Cancel Order Function (added) ---
//     const cancelOrder = async (orderId) => {
//         try {
//             const { data } = await axios.put(`/api/order/cancel/${orderId}`);
//             if (data.success) {
//                 toast.success(data.message);
//                 return true; // Indicate success
//             } else {
//                 toast.error(data.message);
//                 return false; // Indicate failure
//             }
//         } catch (error) {
//             console.error("Error cancelling order:", error);
//             toast.error(error.response?.data?.message || "Failed to cancel order. Please try again.");
//             return false; // Indicate failure
//         }
//     };

//     const value = {
//         navigate,
//         user,
//         setUser,
//         isSeller,
//         setIsSeller,
//         showUserLogin,
//         setShowUserLogin,
//         products,
//         currency,
//         cartItems,
//         addToCart,
//         updateCartItem,
//         removeCartItem,
//         getCartCount,
//         getCartAmount,
//         searchQuery,
//         setSearchQuery,
//         axios,
//         fetchProducts,
//         loadProducts: fetchProducts,
//         setCartItems,
//         wishlistItems,
//         toggleWishlistItem,
//         isInWishlist,
//         cancelOrder, // Added cancelOrder to context value
//     };

//     return (
//         <AppContext.Provider value={value}>
//             {children}
//         </AppContext.Provider>
//     );
// };

// export const useAppContext = () => {
//     return useContext(AppContext);
// };








import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

// Axios config: सभी requests में credentials और baseURL सेट
axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
    const currency = import.meta.env.VITE_CURRENCY || "₹";

    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSeller, setIsSeller] = useState(false);
    const [showUserLogin, setShowUserLogin] = useState(false);
    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [wishlistItems, setWishlistItems] = useState({});

    // Seller status fetch
    const fetchSeller = async () => {
        try {
            const { data } = await axios.get('/api/seller/is-auth');
            setIsSeller(!!data.success);
        } catch {
            setIsSeller(false);
        }
    };

    // User auth, cart, wishlist fetch
    const fetchUser = async () => {
        try {
            const { data } = await axios.get('/api/user/is-auth');
            if (data.success) {
                setUser(data.user);
                setCartItems(data.user.cartItems || {});
                setWishlistItems(data.user.wishlist || {});
            } else {
                setUser(null);
                setCartItems({});
                setWishlistItems({});
            }
        } catch {
            setUser(null);
            setCartItems({});
            setWishlistItems({});
        }
    };

    // Products fetch
    const fetchProducts = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/product/list');
            if (data.success) setProducts(data.products);
            else toast.error(data.message);
        } catch (error) {
            toast.error(error.message);
        }
    }, []);

    // Cart functions
    const addToCart = (itemId) => {
        setCartItems(prev => {
            const updated = { ...prev, [itemId]: (prev[itemId] || 0) + 1 };
            toast.success("Added to Cart");
            return updated;
        });
    };

    const updateCartItem = (itemId, quantity) => {
        setCartItems(prev => {
            const updated = { ...prev };
            if (quantity <= 0) {
                delete updated[itemId];
                toast.success("Item removed from cart");
            } else {
                updated[itemId] = quantity;
                toast.success("Cart Updated");
            }
            return updated;
        });
    };

    const removeCartItem = (itemId) => {
        setCartItems(prev => {
            const updated = { ...prev };
            if (updated[itemId]) {
                updated[itemId] -= 1;
                if (updated[itemId] === 0) {
                    delete updated[itemId];
                    toast.success("Item removed from cart");
                } else {
                    toast.success("Item quantity decreased");
                }
            }
            return updated;
        });
    };

    const getCartCount = () => Object.values(cartItems).reduce((a, b) => a + b, 0);

    const getCartAmount = () => {
        let total = 0;
        for (const itemId in cartItems) {
            const itemInfo = products.find(p => p._id === itemId);
            if (itemInfo) total += itemInfo.offerPrice * cartItems[itemId];
        }
        return Math.floor(total * 100) / 100;
    };

    // Initial data load
    useEffect(() => {
        fetchUser();
        fetchSeller();
        fetchProducts();
    }, [fetchProducts]);

    // Wishlist functions
    const toggleWishlistItem = async (itemId) => {
        if (!user) {
            toast.error('Please log in to manage your wishlist!');
            navigate('/login');
            return;
        }
        try {
            let updatedWishlist;
            let successMessage;
            if (wishlistItems[itemId]) {
                const { data } = await axios.put('/api/wishlist/remove', { productId: itemId });
                if (data.success) {
                    updatedWishlist = { ...wishlistItems };
                    delete updatedWishlist[itemId];
                    successMessage = "Removed from Wishlist";
                } else {
                    toast.error(data.message);
                    return;
                }
            } else {
                const { data } = await axios.put('/api/wishlist/add', { productId: itemId });
                if (data.success) {
                    updatedWishlist = { ...wishlistItems, [itemId]: true };
                    successMessage = "Added to Wishlist";
                } else {
                    toast.error(data.message);
                    return;
                }
            }
            setWishlistItems(updatedWishlist);
            toast.success(successMessage);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                toast.error("You are not authorized. Please log in again.");
                setUser(null);
                setCartItems({});
                setWishlistItems({});
            } else {
                toast.error(error.response?.data?.message || "Failed to update wishlist. Please try again.");
            }
        }
    };

    const isInWishlist = (itemId) => !!wishlistItems[itemId];

    // Sync cart to backend
    useEffect(() => {
        const updateCartInBackend = async () => {
            if (!user) return;
            try {
                const { data } = await axios.post('/api/cart/update', { cartItems });
                if (!data.success) toast.error(data.message);
            } catch (error) {
                toast.error("Failed to sync cart: " + (error.response?.data?.message || error.message));
            }
        };
        const handler = setTimeout(updateCartInBackend, 500);
        return () => clearTimeout(handler);
    }, [cartItems, user]);

    // Cancel order
    const cancelOrder = async (orderId) => {
        try {
            const { data } = await axios.put(`/api/order/cancel/${orderId}`);
            if (data.success) {
                toast.success(data.message);
                return true;
            } else {
                toast.error(data.message);
                return false;
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to cancel order. Please try again.");
            return false;
        }
    };

    const value = {
        navigate,
        user,
        setUser,
        isSeller,
        setIsSeller,
        showUserLogin,
        setShowUserLogin,
        products,
        currency,
        cartItems,
        addToCart,
        updateCartItem,
        removeCartItem,
        getCartCount,
        getCartAmount,
        searchQuery,
        setSearchQuery,
        axios,
        fetchProducts,
        loadProducts: fetchProducts,
        setCartItems,
        wishlistItems,
        toggleWishlistItem,
        isInWishlist,
        cancelOrder,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
