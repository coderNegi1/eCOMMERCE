// src/pages/ProductList.jsx

import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

function ProductList() {
  const { products, currency, axios, loadProducts } = useAppContext();
  const [editingId, setEditingId] = useState(null);
  const [newStock, setNewStock] = useState('');

  const handleStockToggle = async (id, currentInStockStatus) => {
    try {
      const { data } = await axios.post('/api/products/stock', { id, inStock: !currentInStockStatus });
      if (data.success) {
        loadProducts();
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock status.');
    }
  };

  const handleStockUpdate = async (id) => {
    const stockToUpdate = Number(newStock);
    if (isNaN(stockToUpdate) || stockToUpdate < 0) {
      toast.error("Stock must be a non-negative number.");
      return;
    }

    try {
      const { data } = await axios.post('/api/products/stock', { id, stock: stockToUpdate });
      if (data.success) {
        setEditingId(null);
        loadProducts();
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock count.');
    }
  };

  const renderStockInput = (product) => (
    <>
      <input
        type="number"
        min="0"
        value={newStock}
        onChange={e => setNewStock(e.target.value)}
        className="w-16 md:w-20 border px-2 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') handleStockUpdate(product._id);
          if (e.key === 'Escape') setEditingId(null);
        }}
        aria-label={`Edit stock for ${product.name}`}
      />
      <button onClick={() => handleStockUpdate(product._id)} className="text-green-600 ml-2 p-1 hover:bg-green-100 rounded-full" title="Save">✔</button>
      <button onClick={() => setEditingId(null)} className="text-gray-500 ml-1 p-1 hover:bg-gray-200 rounded-full" title="Cancel">✖</button>
    </>
  );

  const renderStockDisplay = (product, isLowStock) => (
    <span
      className={`cursor-pointer hover:underline p-1 rounded-md transition-colors ${isLowStock ? 'text-red-600 font-semibold' : 'text-gray-600'}`}
      onClick={() => { setEditingId(product._id); setNewStock(product.stock.toString()); }}
      title="Click to edit stock"
    >
      {product.stock}
      {isLowStock && product.stock > 0 && (
        <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">Low stock!</span>
      )}
    </span>
  );

  return (
    <div className="flex-1 h-[95vh] overflow-y-scroll no-scrollbar p-4 md:p-10 bg-gray-50">
      <h2 className="pb-6 text-2xl font-semibold text-gray-800 border-b border-gray-200">All Products</h2>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="flex flex-col items-center max-w-5xl w-full mx-auto overflow-hidden rounded-lg shadow-lg bg-white border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell truncate">Selling Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">In Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell truncate">Stock</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-700">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500 italic">No products found.</td>
                </tr>
              ) : (
                products.map(product => {
                  const isLowStock = product.stock <= product.lowStockThreshold;
                  return (
                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 flex items-center space-x-4">
                        <div className="flex-shrink-0 border border-gray-200 rounded-md p-1">
                          <img src={product.image[0]} alt={product.name} className="w-16 h-16 object-cover rounded-sm" />
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-medium text-gray-900 truncate max-w-[150px] ${!product.inStock ? 'text-red-600' : ''}`}>
                            {product.name}
                          </span>
                          {product.stock === 0 && (
                            <span className="mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">Out of stock</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{product.category}</td>
                      <td className="px-4 py-3 hidden md:table-cell font-medium text-gray-800">{currency}{product.offerPrice?.toFixed(2)}</td>
                      <td className="px-4 py-3 flex flex-col items-start md:items-center gap-2">
                        <label htmlFor={`toggle-${product._id}`} className="relative inline-flex items-center cursor-pointer">
                          <input
                            id={`toggle-${product._id}`}
                            onChange={() => handleStockToggle(product._id, product.inStock)}
                            checked={product.inStock}
                            type="checkbox"
                            className="sr-only peer"
                            role="switch"
                            aria-checked={product.inStock}
                            aria-label={`Toggle ${product.name} in stock status`}
                          />
                          <div className="w-12 h-7 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors shadow-inner"></div>
                          <span className="dot absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow"></span>
                        </label>
                        <span className={`text-xs mt-1 md:hidden ${isLowStock ? 'text-red-700' : 'text-gray-600'}`}>
                          Stock: {editingId === product._id ? renderStockInput(product) : renderStockDisplay(product, isLowStock)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center space-x-2">
                          {editingId === product._id ? renderStockInput(product) : renderStockDisplay(product, isLowStock)}
                          {product.stock === 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">Out of stock</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 mt-6">
        {products.length === 0 ? (
          <div className="text-center py-8 text-gray-500 italic">No products found.</div>
        ) : (
          products.map(product => {
            const isLowStock = product.stock <= product.lowStockThreshold;
            return (
              <div key={product._id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <img src={product.image[0]} alt={product.name} className="w-16 h-16 object-cover rounded-md border" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <div className="text-sm text-gray-600">{product.category}</div>
                    <div className="mt-1 font-medium">{currency}{product.offerPrice?.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <label htmlFor={`toggle-mob-${product._id}`} className="relative inline-flex items-center cursor-pointer">
                    <input
                      id={`toggle-mob-${product._id}`}
                      onChange={() => handleStockToggle(product._id, product.inStock)}
                      checked={product.inStock}
                      type="checkbox"
                      className="sr-only peer"
                      role="switch"
                      aria-checked={product.inStock}
                      aria-label={`Toggle ${product.name} in stock status`}
                    />
                    <div className="w-12 h-7 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors shadow-inner"></div>
                    <span className="dot absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow"></span>
                  </label>
                  <div className="flex-1 text-xs">
                    Stock: {editingId === product._id ? renderStockInput(product) : renderStockDisplay(product, isLowStock)}
                  </div>
                </div>
                {product.stock === 0 && (
                  <span className="mt-2 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium w-max">Out of stock</span>
                )}
                {isLowStock && product.stock > 0 && (
                  <span className="mt-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium w-max">Low stock!</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ProductList;
