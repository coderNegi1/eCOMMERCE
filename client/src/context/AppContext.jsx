import React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
    const currency = import.meta.env.VITE_CURRENCY || "₹"; // fallback currency

    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isSeller, setIsSeller] = useState(false);
    const [showUserLogin, setShowUserLogin] = useState(false);
    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    //Fetch Seller status
    const fetchSeller = async () => {
        try {
            const { data } = await axios.get('/api/seller/is-auth');
            if (data.success) {
                setIsSeller(true)
            } else {
                setIsSeller(false)
            }
        } catch (error) {
            setIsSeller(false)
        }
    }

    //Fetch User Auth status, Uers Data and Cart Items
    const fetchUser = async () => {
        try {
            const { data } = await axios.get('/api/user/is-auth', { withCredentials: true });
            if (data.success) {
                setUser(data.user)
                setCartItems(data.user.cartItems)
            }

        } catch (error) {
            setUser(null)
        }
    }

    // Fetch All products
    const fetchProducts = async () => {
        try {
            const { data } = await axios.get('/api/product/list')
            if (data.success) {
                setProducts(data.products)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    };

    // Add product to cart
    const addToCart = (itemId) => {
        const cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId] += 1;
        } else {
            cartData[itemId] = 1;
        }
        setCartItems(cartData);
        toast.success("Added to Cart");
    };

    // Update cart item quantity
    const updateCartItem = (itemId, quantity) => {
        const cartData = structuredClone(cartItems);
        cartData[itemId] = quantity;
        setCartItems(cartData);
        toast.success("Cart Updated");
    };

    // Remove product from cart
    const removeCartItem = (itemId) => {
        const cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId] -= 1;
            if (cartData[itemId] === 0) {
                delete cartData[itemId];
                toast.success("Item removed from cart");
            } else {
                toast.success("Item quantity decreased");
            }
        }
        setCartItems(cartData);
    };

    // Get total number of items in cart
    const getCartCount = () => {
        let totalCount = 0;
        for (const item in cartItems) {
            totalCount += cartItems[item];
        }
        return totalCount;
    };

    // Get total cart amount
    const getCartAmount = () => {
        let totalAmount = 0;
        for (const itemId in cartItems) {
            const itemInfo = products.find((product) => product._id === itemId);
            if (itemInfo) {
                totalAmount += itemInfo.offerPrice * cartItems[itemId];
            }
        }
        return Math.floor(totalAmount * 100) / 100;
    };

    // Load products on mount
    useEffect(() => {
        fetchUser()
        fetchSeller()
        fetchProducts()
    }, []);


    // //Update Database Cart Items
    // const updateCart = async () => {
    //     if (!user?._id) return;
    //     try {
    //         // Remove userId from request body
    //         const { data } = await axios.post('/api/cart/update', {
    //             cartItems: cartItems
    //         });
    //         if (!data.success) {
    //             toast.error(data.message);
    //         }
    //     } catch (error) {
    //         toast.error(error.message);
    //     }
    // };

    // useEffect(() => {
    //     if (user) {
    //         updateCart();
    //     }
    // }, [cartItems]);

    //Update Database Cart Items

    useEffect(() => {
        const updateCart = async () => {
            try {
                const { data } = await axios.post('/api/cart/update', { cartItems })
                if (!data.success) {
                    toast.error(data.message)
                }
            } catch (error) {
                toast.error(error.message)
            }
        }
        if (user) {
            updateCart()
        }
    }, [cartItems])

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
        setCartItems
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    return useContext(AppContext);
};
