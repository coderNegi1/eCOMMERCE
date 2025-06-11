import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { assets, dummyAddress } from "../assets/assets";
import toast from "react-hot-toast";

const Cart = () => {
    const { products, currency, cartItems, removeCartItem, getCartCount, updateCartItem, navigate, getCartAmount, axios, user, setCartItems } = useAppContext();

    const [cartArray, setCartArray] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [showAddress, setShowAddress] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [paymentOption, setPaymentOption] = useState("COD");

    // Updated state for guest address to match backend expectations
    const [guestAddress, setGuestAddress] = useState({
        firstName: "",
        lastName: "",
        email: "", // Added email for guest
        street: "",
        city: "",
        state: "",
        zipcode: "", // Changed to lowercase 'c' for consistency with backend
        country: "",
        phone: ""
    });

    const getCart = () => {
        let tempArray = [];
        for (const key in cartItems) {
            const product = products.find((item) => item._id === key);
            if (product) { // Ensure product exists
                product.quantity = cartItems[key];
                tempArray.push(product);
            }
        }
        setCartArray(tempArray);
    };

    const getUserAddress = async () => {
        try {
            const { data } = await axios.get('/api/address/get');

            if (data.success) {
                setAddresses(data.addresses);
                if (data.addresses.length > 0) {
                    setSelectedAddress(data.addresses[0]);
                } else {
                    toast.error("No address found for your account. Please add one.");
                }
            } else {
                toast.error(data.message || "Failed to load address");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const placeOrder = async () => {
        try {
            let orderAddressData;
            let endpoint;
            let payload = {
                items: cartArray.map(item => ({ product: item._id, quantity: item.quantity })),
            };

            // Logic for Logged-in User
            if (user) {
                if (!selectedAddress) {
                    return toast.error('Please select an address.');
                }
                orderAddressData = selectedAddress._id; // For logged-in users, send the address ID
                payload.userId = user._id; // Include userId in the payload for logged-in orders

                if (paymentOption === "COD") {
                    endpoint = '/api/orders/cod'; // Your logged-in COD route
                } else { // Online payment for logged-in users
                    endpoint = '/api/orders/stripe'; // Your logged-in Stripe route
                }
            } else { // Logic for Guest User
                // Validate guest address fields, directly matching backend's requiredFields
                if (!guestAddress.firstName || !guestAddress.lastName || !guestAddress.email || !guestAddress.street || !guestAddress.city || !guestAddress.state || !guestAddress.zipcode || !guestAddress.country || !guestAddress.phone) {
                    return toast.error('Please fill in all required guest address details.');
                }
                orderAddressData = guestAddress; // For guest users, send the full address object

                // Add guestDetails for the backend's placeOrderCOD function
                payload.guestDetails = {
                    name: `${guestAddress.firstName} ${guestAddress.lastName}`,
                    email: guestAddress.email,
                    phone: guestAddress.phone
                };

                if (paymentOption === "COD") {
                    endpoint = '/api/orders/cod'; // Use the same COD route, as it handles guestDetails
                } else { // Online payment for guest - prevent this
                    return toast.error("Online payment is only available for logged-in users. Please log in or choose COD.");
                }
            }

            payload.address = orderAddressData; // Assign the determined address data to the payload

            // Make the API call
            const { data } = await axios.post(endpoint, payload);

            if (data.success) {
                toast.success(data.message);
                setCartItems({}); // Clear the cart
                if (user) {
                    navigate('/my-orders');
                } else {
                    navigate('/order-success'); // Create this page for guest order confirmation
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Order placement error:", error);
            toast.error(error.response?.data?.message || error.message || "An unexpected error occurred.");
        }
    };

    useEffect(() => {
        if (products.length > 0 && cartItems && Object.keys(cartItems).length > 0) { // Also check if cartItems has content
            getCart();
        } else if (products.length > 0 && (!cartItems || Object.keys(cartItems).length === 0)) {
            // If cart is empty, ensure cartArray is also cleared
            setCartArray([]);
        }
    }, [products, cartItems]);

    useEffect(() => {
        if (user) {
            getUserAddress();
        } else {
            setAddresses([]);
            setSelectedAddress(null);
            setGuestAddress({
                firstName: "",
                lastName: "",
                email: "",
                street: "",
                city: "",
                state: "",
                zipcode: "",
                country: "",
                phone: ""
            });
        }
    }, [user]);

    const handleGuestAddressChange = (e) => {
        const { name, value } = e.target;
        setGuestAddress(prev => ({ ...prev, [name]: value }));
    };

    return products.length > 0 && Object.keys(cartItems).length > 0 ? (
        <div className="flex flex-col md:flex-row mt-16">
            <div className='flex-1 max-w-4xl'>
                <h1 className="text-3xl font-medium mb-6">
                    Shopping Cart <span className="text-sm text-primary">{getCartCount()} Items</span>
                </h1>

                <div className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 text-base font-medium pb-3">
                    <p className="text-left">Product Details</p>
                    <p className="text-center">Subtotal</p>
                    <p className="text-center">Action</p>
                </div>

                {cartArray.map((product, index) => (
                    <div key={index} className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 items-center text-sm md:text-base font-medium pt-3">
                        <div className="flex items-center md:gap-6 gap-3">
                            <div onClick={() => {
                                navigate(`/products/${product.category.toLowerCase()}/${product._id}`); scrollTo(0, 0)
                            }} className="cursor-pointer w-24 h-24 flex items-center justify-center border border-gray-300 rounded">
                                <img className="max-w-full h-full object-cover" src={product.image[0]} alt={product.name} />
                            </div>
                            <div>
                                <p className="hidden md:block font-semibold">{product.name}</p>
                                <div className="font-normal text-gray-500/70">
                                    <p>Weight: <span>{product.weight || "N/A"}</span></p>
                                    <div className='flex items-center'>
                                        <p>Qty:</p>
                                        <select onChange={e => updateCartItem(product._id, Number(e.target.value))} value={cartItems[product._id]} className='outline-none'>
                                            {Array(cartItems[product._id] > 9 ? cartItems[product._id] : 9).fill('').map((_, index) => (
                                                <option key={index} value={index + 1}>{index + 1}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-center">{currency}{product.offerPrice * product.quantity}</p>
                        <button onClick={() => removeCartItem(product._id)} className="cursor-pointer mx-auto">
                            <img src={assets.remove_icon} alt="remove" className="inline-block w-6 h-6" />
                        </button>
                    </div>)
                )}

                <button onClick={() => { navigate("/products"); scrollTo(0, 0) }} className="group cursor-pointer flex items-center mt-8 gap-2 text-primary font-medium">
                    <img src={assets.arrow_right_icon_colored} alt="arrow" className="group-hover:translate-x-1 transition" />
                    Continue Shopping
                </button>

            </div>

            <div className="max-w-[360px] w-full bg-gray-100/40 p-5 max-md:mt-16 border border-gray-300/70">
                <h2 className="text-xl md:text-xl font-medium">Order Summary</h2>
                <hr className="border-gray-300 my-5" />

                <div className="mb-6">
                    <p className="text-sm font-medium uppercase">Delivery Address</p>
                    {user ? (
                        <div className="relative flex justify-between items-start mt-2">
                            <p className="text-gray-500">{selectedAddress ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.country}` : "No address found"}</p>
                            <button onClick={() => setShowAddress(!showAddress)} className="text-primary hover:underline cursor-pointer">
                                Change
                            </button>
                            {showAddress && (
                                <div className="absolute top-12 py-1 bg-white border border-gray-300 text-sm w-full z-10">
                                    {addresses.length > 0 ? (
                                        <>
                                            {addresses.map((address, index) => (
                                                <p
                                                    key={index}
                                                    onClick={() => {
                                                        setSelectedAddress(address);
                                                        setShowAddress(false);
                                                    }}
                                                    className="text-gray-500 p-2 hover:bg-gray-100 cursor-pointer"
                                                >
                                                    {address.street}, {address.city}, {address.state}, {address.country}
                                                </p>
                                            ))}
                                            <p
                                                onClick={() => { navigate("/add-address"); setShowAddress(false); }}
                                                className="text-primary text-center cursor-pointer p-2 hover:bg-primary/10"
                                            >
                                                Add new address
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-gray-500 p-2 text-center">No addresses saved. <span onClick={() => navigate("/add-address")} className="text-primary cursor-pointer hover:underline">Add one.</span></p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-2 space-y-3">
                            <input
                                type="text"
                                name="firstName"
                                value={guestAddress.firstName}
                                onChange={handleGuestAddressChange}
                                placeholder="First Name"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                            <input
                                type="text"
                                name="lastName"
                                value={guestAddress.lastName}
                                onChange={handleGuestAddressChange}
                                placeholder="Last Name"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                            <input
                                type="email"
                                name="email"
                                value={guestAddress.email}
                                onChange={handleGuestAddressChange}
                                placeholder="Email"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                            <input
                                type="text"
                                name="street"
                                value={guestAddress.street}
                                onChange={handleGuestAddressChange}
                                placeholder="Street Address"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                            <input
                                type="text"
                                name="city"
                                value={guestAddress.city}
                                onChange={handleGuestAddressChange}
                                placeholder="City"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                            <input
                                type="text"
                                name="state"
                                value={guestAddress.state}
                                onChange={handleGuestAddressChange}
                                placeholder="State"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                             <input
                                type="text"
                                name="zipcode" // Corrected to lowercase 'c'
                                value={guestAddress.zipcode}
                                onChange={handleGuestAddressChange}
                                placeholder="Zip Code"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                            <input
                                type="text"
                                name="country"
                                value={guestAddress.country}
                                onChange={handleGuestAddressChange}
                                placeholder="Country"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                            <input
                                type="text"
                                name="phone"
                                value={guestAddress.phone}
                                onChange={handleGuestAddressChange}
                                placeholder="Phone Number"
                                className="w-full border border-gray-300 px-3 py-2 outline-none"
                                required
                            />
                        </div>
                    )}

                    <p className="text-sm font-medium uppercase mt-6">Payment Method</p>

                    <select
                        onChange={e => {
                            if (!user && e.target.value === "Online") {
                                toast.error("Online payment is only available for logged-in users. Please log in or choose COD.");
                                return;
                            }
                            setPaymentOption(e.target.value);
                        }}
                        value={paymentOption}
                        className="w-full border border-gray-300 bg-white px-3 py-2 mt-2 outline-none"
                    >
                        <option value="COD">Cash On Delivery</option>
                        {user && <option value="Online">Online Payment</option>}
                    </select>
                </div>

                <hr className="border-gray-300" />

                <div className="text-gray-500 mt-4 space-y-2">
                    <p className="flex justify-between">
                        <span>Price</span><span>{currency}{getCartAmount()}</span>
                    </p>
                    <p className="flex justify-between">
                        <span>Shipping Fee</span><span className="text-green-600">Free</span>
                    </p>
                    <p className="flex justify-between">
                        <span>Tax (2%)</span><span>{currency}{(getCartAmount() * 2 / 100).toFixed(2)}</span>
                    </p>
                    <p className="flex justify-between text-lg font-medium mt-3">
                        <span>Total Amount:</span><span>{currency}{(getCartAmount() + getCartAmount() * 2 / 100).toFixed(2)}</span>
                    </p>
                </div>

                <button
                    onClick={() => placeOrder()}
                    className="w-full py-3 mt-6 cursor-pointer bg-primary text-white font-medium hover:bg-primary-dull transition"
                    disabled={Object.keys(cartItems).length === 0}
                >
                    {paymentOption === "COD" ? "Place Order" : "Proceed to Checkout"}
                </button>
            </div>
        </div>
    ) : (
        <div className="flex items-center justify-center h-[50vh] flex-col gap-4 text-center">
            <h2 className="text-2xl font-semibold">Your cart is empty!</h2>
            <button onClick={() => { navigate("/products"); scrollTo(0, 0) }} className="group cursor-pointer flex items-center gap-2 text-primary font-medium border border-primary px-4 py-2 rounded-md hover:bg-primary hover:text-white transition">
                Start Shopping
                <img src={assets.arrow_right_icon_colored} alt="arrow" className="group-hover:translate-x-1 transition group-hover:invert-0 invert" />
            </button>
        </div>
    );
};

export default Cart;