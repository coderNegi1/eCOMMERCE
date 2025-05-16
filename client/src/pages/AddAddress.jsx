import React, { useEffect, useState } from 'react';
import { assets } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const InputField = ({ name, type, placeholder, handleChange, address }) => (
    <input
        type={type}
        placeholder={placeholder}
        onChange={handleChange}
        name={name}
        value={address[name]}
        required
        className="border w-full mt-2 p-2 rounded"
    />
);

const AddAddress = () => {
    const { axios, user, navigate } = useAppContext();
    const [address, setAddress] = useState({
        firstName: '',
        lastName: '',
        email: user?.email || '', // Pre-fill email from user context
        street: '',
        city: '',
        state: '',
        zipcode: '',
        country: 'India', // Default country
        phone: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAddress(prev => ({ ...prev, [name]: value }));
    };

    const onSubmithandler = async (e) => {
        e.preventDefault();
        if (!user) return navigate('/cart');

        setIsSubmitting(true);
        try {
            // Send address object directly without nesting
            const { data } = await axios.post('/api/address/add', address);
            
            if (data.success) {
                toast.success('Address added successfully!');
                navigate('/cart');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add address');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!user) navigate('/cart');
    }, [user, navigate]);

    return (
        <div className="mt-16 pb-16">
            <p className="text-2xl md:text-3xl text-gray-500">
                Add Shipping <span className="font-semibold text-primary">Address</span>
            </p>
            <div className="flex flex-col-reverse md:flex-row justify-between mt-10">
                <div className="flex-1 max-w-md">
                    <form onSubmit={onSubmithandler} className="space-y-3 mt-6 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                handleChange={handleChange}
                                address={address}
                                name="firstName"
                                type="text"
                                placeholder="First Name"
                            />
                            <InputField
                                handleChange={handleChange}
                                address={address}
                                name="lastName"
                                type="text"
                                placeholder="Last Name"
                            />
                        </div>

                        <InputField
                            handleChange={handleChange}
                            address={address}
                            name="email"
                            type="email"
                            placeholder="Email Address"
                            disabled={!!user?.email} // Disable if user email exists
                        />

                        <InputField
                            handleChange={handleChange}
                            address={address}
                            name="street"
                            type="text"
                            placeholder="Street"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                handleChange={handleChange}
                                address={address}
                                name="city"
                                type="text"
                                placeholder="City"
                            />
                            <InputField
                                handleChange={handleChange}
                                address={address}
                                name="state"
                                type="text"
                                placeholder="State"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField
                                handleChange={handleChange}
                                address={address}
                                name="zipcode"
                                type="text"
                                placeholder="Zipcode"
                            />
                            <InputField
                                handleChange={handleChange}
                                address={address}
                                name="country"
                                type="text"
                                placeholder="Country"
                            />
                        </div>

                        <InputField
                            handleChange={handleChange}
                            address={address}
                            name="phone"
                            type="tel"
                            placeholder="Phone"
                        />

                        <button
                            className="w-full mt-6 bg-primary text-white py-3 hover:bg-primary-dull transition cursor-pointer uppercase"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Address'}
                        </button>
                    </form>
                </div>
                <img className="md:mr-16 mb-16 md:mt-10" src={assets.add_address_image} alt="add address" />
            </div>
        </div>
    );
};

export default AddAddress;