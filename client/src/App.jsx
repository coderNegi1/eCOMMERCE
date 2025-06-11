import React from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import { Toaster } from "react-hot-toast"
import Footer from './components/Footer'
import { useAppContext } from './context/AppContext'
import Login from './components/Login'
import AllProducts from './pages/AllProducts'
import ProductCategory from './pages/ProductCategory'
import ProductDetails from './pages/ProductDetails'
import Cart from './pages/Cart'
import AddAddress from './pages/AddAddress'
import MyOrders from './pages/MyOrders'
import SellerLogin from './components/seller/SellerLogin'
import SellerLayout from './pages/seller/sellerLayout'
import AddProducts from './pages/seller/AddProducts'
import ProductList from './pages/seller/ProductList'
import Orders from './pages/seller/Orders'
import Loading from './components/Loading'
import Wishlist from './pages/Wishlist'
import OrderTrackingPage from './pages/OrderTrackingPage'
import ThankYouPage from './pages/ThankYouPage'

function App() {
  const isSellerPath = useLocation().pathname.includes("seller")
  const { showUserLogin, isSeller } = useAppContext()

  return (
    <div className='text-default min-h-screen text-gray-700 bg-white'>
      {/* Seller पेज पर Navbar नहीं दिखाएं */}
      {isSellerPath ? null : <Navbar />}
      
      {/* यूजर लॉगिन मॉडल */}
      {showUserLogin && <Login />}

      {/* टोस्ट नोटिफिकेशन */}
      <Toaster position="top-right" reverseOrder={false} />

      <div className={`${isSellerPath ? "" : "px-6 md:px-16 lg:px-24 xl:px-32"}`}>
        <Routes>
          {/* मुख्य रूट्स */}
          <Route path='/' element={<Home />} />
          <Route path='/products' element={<AllProducts />} />
          <Route path='/products/:category' element={<ProductCategory />} />
          <Route path='/products/:category/:id' element={<ProductDetails />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/add-address' element={<AddAddress />} />
          <Route path='/my-orders' element={<MyOrders />} />
          <Route path='/wishlist' element={<Wishlist />} />

          {/* ऑर्डर ट्रैकिंग और थैंक यू पेज */}
          <Route path="/order-confirmation/:orderId" element={<OrderTrackingPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />

          {/* सेलर सेक्शन */}
          <Route path='/seller' element={isSeller ? <SellerLayout /> : <SellerLogin />}>
            <Route index element={<AddProducts />} />
            <Route path='product-list' element={<ProductList />} />
            <Route path='orders' element={<Orders />} />
          </Route>

          {/* लोडिंग स्टेट */}
          <Route path='/loader' element={<Loading />} />
        </Routes>
      </div>

      {/* Seller पेज पर Footer नहीं दिखाएं */}
      {!isSellerPath && <Footer />}
    </div>
  )
}

export default App
