import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { assets } from "../assets/assets";
import toast from "react-hot-toast";

const InputField = ({
    name,
    type,
    placeholder,
    handleChange,
    value,
    disabled = false,
    required = true,
    className = "",
}) => (
    <input
        type={type}
        placeholder={placeholder}
        onChange={handleChange}
        name={name}
        value={value}
        required={required}
        className={`border w-full mt-2 p-2 rounded ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
        disabled={disabled}
    />
);

const Cart = () => {
    const {
        products,
        currency,
        cartItems,
        removeCartItem,
        getCartCount,
        updateCartItem,
        navigate,
        getCartAmount,
        axios,
        user,
        setCartItems,
    } = useAppContext();

    const [cartArray, setCartArray] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [showAddressOptions, setShowAddressOptions] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [paymentOption, setPaymentOption] = useState("COD");

    const [guestAddressDetails, setGuestAddressDetails] = useState({
        firstName: '',
        lastName: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zipcode: '',
        country: 'India',
        phone: '',
    });

    const getCart = () => {
        let tempArray = [];
        for (const key in cartItems) {
            const product = products.find((item) => item._id === key);
            if (product) {
                const productWithQuantity = { ...product, quantity: cartItems[key] };
                tempArray.push(productWithQuantity);
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
                    setSelectedAddress(null);
                    toast.error("No saved address found. Please add one for quicker checkout.");
                }
            } else {
                setSelectedAddress(null);
                toast.error(data.message || "Failed to load addresses.");
            }
        } catch (error) {
            setSelectedAddress(null);
            toast.error(error.response?.data?.message || error.message || "Error fetching addresses.");
        }
    };

    const handleGuestAddressChange = (e) => {
        const { name, value } = e.target;
        setGuestAddressDetails(prev => ({ ...prev, [name]: value }));
        setSelectedAddress(prev => ({ ...prev, [name]: value }));
    };

    const placeOrder = async () => {
        try {
            let addressPayload;
            let guestDetailsPayload = null;
            const orderItems = cartArray.map(item => ({ product: item._id, quantity: item.quantity }));

            if (getCartCount() === 0) {
                return toast.error('Your cart is empty. Please add some items first.');
            }

            // --- Address Validation & Payload Construction ---
            if (user) { // Logged-in user checkout
                if (!selectedAddress || !selectedAddress._id) {
                    return toast.error('Please select a shipping address or add a new one.');
                }
                addressPayload = selectedAddress._id; // Send address ID
            } else { // Guest user checkout
                const requiredGuestFields = ['firstName', 'lastName', 'email', 'street', 'city', 'state', 'zipcode', 'country', 'phone'];
                for (const field of requiredGuestFields) {
                    if (!guestAddressDetails[field]) {
                        setShowAddressOptions(true);
                        return toast.error(`Please fill in the ${field} for shipping details.`);
                    }
                }
                addressPayload = guestAddressDetails; // Send full address object for guest
                guestDetailsPayload = {
                    name: `${guestAddressDetails.firstName} ${guestAddressDetails.lastName}`,
                    email: guestAddressDetails.email,
                    phone: guestAddressDetails.phone,
                };
            }

            // --- Calculate total with tax (2%) ---
            const subtotal = getCartAmount();
            const tax = Math.round(subtotal * 0.02);
            const totalAmount = subtotal + tax;

            // --- Common Payload for Order API ---
            const commonPayload = {
                items: orderItems,
                address: addressPayload,
                guestDetails: guestDetailsPayload,
                amount: totalAmount // Always send amount for COD and Stripe
            };

            // --- Determine the correct endpoint based on user status and payment option ---
            let endpoint = '';
            if (user) {
                endpoint = paymentOption === "COD" ? '/api/order/cod' : '/api/order/stripe';
            } else {
                endpoint = paymentOption === "COD" ? '/api/order/guest-cod' : '/api/order/guest-stripe';
            }

            // --- Place Order based on payment option and user status ---
            const { data } = await axios.post(endpoint, commonPayload, { withCredentials: true });

            if (data.success) {
                if (paymentOption === "Online" && data.url) {
                    // Stripe payment: redirect to Stripe Checkout
                    window.location.href = data.url;
                } else {
                    // COD flow
                    toast.success(data.message);
                    setCartItems({});
                    setTimeout(() => {
                        if (user) {
                            navigate('/my-orders');
                        } else {
                            navigate(`/order-confirmation/${data.orderId}`);
                        }
                    }, 1200);
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error placing order:", error);
            toast.error(error.response?.data?.message || error.message || "An error occurred while placing order.");
        }
    };

    useEffect(() => {
        if (products.length > 0 && cartItems) {
            getCart();
        }
    }, [products, cartItems]);

    useEffect(() => {
        if (user) {
            getUserAddress();
            setGuestAddressDetails({
                firstName: '', lastName: '', email: '', street: '', city: '',
                state: '', zipcode: '', country: 'India', phone: '',
            });
            setShowAddressOptions(false);
        } else {
            setAddresses([]);
            setSelectedAddress(guestAddressDetails);
            setShowAddressOptions(true);
        }
    }, [user]);

    if (getCartCount() === 0) {
        return (
            <div className="mt-16 pb-16 text-center">
                <p className="text-2xl text-gray-500">Your cart is empty.</p>
                <button
                    onClick={() => { navigate("/products"); scrollTo(0, 0); }}
                    className="mt-6 px-6 py-3 bg-primary text-white rounded hover:bg-primary-dull transition"
                >
                    Continue Shopping
                </button>
            </div>
        );
    }

    return products.length > 0 && cartItems ? (
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
                    <div key={index} className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 items-center text-sm md:text-base font-medium pt-3 border-b border-gray-200 py-3">
                        <div className="flex items-center md:gap-6 gap-3">
                            <div onClick={() => {
                                navigate(`/products/${product.category.toLowerCase()}/${product._id}`); scrollTo(0, 0)
                            }} className="cursor-pointer w-24 h-24 flex items-center justify-center border border-gray-300 rounded">
                                <img className="max-w-full h-full object-cover" src={product.image[0]} alt={product.name} />
                            </div>
                            <div>
                                <p className="hidden md:block font-semibold">{product.name}</p>
                                <div className='font-normal text-gray-500/70'>
                                    <p>Weight: <span>{product.weight || "N/A"}</span></p>
                                    <div className='flex items-center'>
                                        <p>Qty:</p>
                                        <select onChange={e => updateCartItem(product._id, Number(e.target.value))} value={cartItems[product._id]} className='outline-none'>
                                            {Array(cartItems[product._id] > 9 ? cartItems[product._id] : 9).fill('').map((_, idx) => (
                                                <option key={idx} value={idx + 1}>{idx + 1}</option>
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
                    </div>
                ))}

                <button onClick={() => { navigate("/products"); scrollTo(0, 0) }} className="group cursor-pointer flex items-center mt-8 gap-2 text-primary font-medium">
                    <img src={assets.arrow_right_icon_colored} alt="arrow" className="group-hover:transition-x-1 transition" />
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
                            <p className="text-gray-500">
                                {selectedAddress ?
                                    `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.country}, ${selectedAddress.zipcode}`
                                    : "No address found. Click Change to add one."}
                            </p>
                            <button onClick={() => setShowAddressOptions(!showAddressOptions)} className="text-primary hover:underline cursor-pointer">
                                Change
                            </button>
                            {showAddressOptions && (
                                <div className="absolute top-12 py-1 bg-white border border-gray-300 text-sm w-full z-10 shadow-lg">
                                    {addresses.length > 0 ? (
                                        addresses.map((address, idx) => (
                                            <p
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedAddress(address);
                                                    setShowAddressOptions(false);
                                                }}
                                                className="text-gray-500 p-2 hover:bg-gray-100 cursor-pointer"
                                            >
                                                {address.street}, {address.city}, {address.state}, {address.country}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="p-2 text-gray-500 text-center">No saved addresses.</p>
                                    )}
                                    <p
                                        onClick={() => { navigate("/add-address"); setShowAddressOptions(false); }}
                                        className="text-primary text-center cursor-pointer p-2 hover:bg-primary/10 border-t border-gray-200"
                                    >
                                        Add New Address
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-2">
                            {!showAddressOptions ? (
                                guestAddressDetails.email ? (
                                    <div className="flex justify-between items-start">
                                        <p className="text-gray-500">
                                            {guestAddressDetails.firstName} {guestAddressDetails.lastName}<br/>
                                            {guestAddressDetails.street}, {guestAddressDetails.city}, {guestAddressDetails.state}, {guestAddressDetails.country}, {guestAddressDetails.zipcode}<br/>
                                            {guestAddressDetails.email}, {guestAddressDetails.phone}
                                        </p>
                                        <button onClick={() => setShowAddressOptions(true)} className="text-primary hover:underline cursor-pointer">
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowAddressOptions(true)} className="text-primary hover:underline cursor-pointer">
                                        Enter Shipping Address
                                    </button>
                                )
                            ) : (
                                <div className="space-y-3 mt-2 text-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            handleChange={handleGuestAddressChange}
                                            value={guestAddressDetails.firstName}
                                            name="firstName"
                                            type="text"
                                            placeholder="First Name"
                                        />
                                        <InputField
                                            handleChange={handleGuestAddressChange}
                                            value={guestAddressDetails.lastName}
                                            name="lastName"
                                            type="text"
                                            placeholder="Last Name"
                                        />
                                    </div>
                                    <InputField
                                        handleChange={handleGuestAddressChange}
                                        value={guestAddressDetails.email}
                                        name="email"
                                        type="email"
                                        placeholder="Email Address"
                                    />
                                    <InputField
                                        handleChange={handleGuestAddressChange}
                                        value={guestAddressDetails.street}
                                        name="street"
                                        type="text"
                                        placeholder="Street"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            handleChange={handleGuestAddressChange}
                                            value={guestAddressDetails.city}
                                            name="city"
                                            type="text"
                                            placeholder="City"
                                        />
                                        <InputField
                                            handleChange={handleGuestAddressChange}
                                            value={guestAddressDetails.state}
                                            name="state"
                                            type="text"
                                            placeholder="State"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            handleChange={handleGuestAddressChange}
                                            value={guestAddressDetails.zipcode}
                                            name="zipcode"
                                            type="text"
                                            placeholder="Zipcode"
                                        />
                                        <InputField
                                            handleChange={handleGuestAddressChange}
                                            value={guestAddressDetails.country}
                                            name="country"
                                            type="text"
                                            placeholder="Country"
                                        />
                                    </div>
                                    <InputField
                                        handleChange={handleGuestAddressChange}
                                        value={guestAddressDetails.phone}
                                        name="phone"
                                        type="tel"
                                        placeholder="Phone"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAddressOptions(false)}
                                        className="w-full py-2 mt-4 bg-gray-200 text-gray-700 hover:bg-gray-300 transition rounded"
                                    >
                                        Confirm Address
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-sm font-medium uppercase mt-6">Payment Method</p>
                <select onChange={e => setPaymentOption(e.target.value)} className="w-full border border-gray-300 bg-white px-3 py-2 mt-2 outline-none">
                    <option value="COD">Cash On Delivery</option>
                    <option value="Online">Online Payment</option>
                </select>
                <hr className="border-gray-300 my-5" />

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

                <button onClick={() => placeOrder()} className="w-full py-3 mt-6 cursor-pointer bg-primary text-white font-medium hover:bg-primary-dull transition">
                    {paymentOption === "COD" ? "Place Order" : "Proceed to Checkout"}
                </button>
            </div>
        </div>
    ) : null;
};

export default Cart;
