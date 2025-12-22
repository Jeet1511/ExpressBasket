import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../utils/axios';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('basketCart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('basketCart', JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);
      if (existingItem) {
        return prevCart.map(item =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item._id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Reorder items from a previous order
  const reorderItems = async (orderItems) => {
    try {
      let addedCount = 0;
      // Fetch current product data for each item
      for (const item of orderItems) {
        // Handle different product ID structures
        let productId;
        if (item.productId && typeof item.productId === 'object') {
          productId = item.productId._id || item.productId.id;
        } else {
          productId = item.productId || item._id;
        }

        if (!productId) {
          console.error('No product ID found for item:', item);
          continue;
        }

        try {
          const response = await axios.get(`/products/${productId}`);
          // Handle different API response formats
          const product = response.data.product || response.data;

          if (!product || !product._id) {
            console.error('Invalid product data:', response.data);
            continue;
          }

          // Add each item with the ordered quantity
          setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem._id === product._id);
            if (existingItem) {
              return prevCart.map(cartItem =>
                cartItem._id === product._id
                  ? { ...cartItem, quantity: cartItem.quantity + (item.quantity || 1) }
                  : cartItem
              );
            } else {
              return [...prevCart, { ...product, quantity: item.quantity || 1 }];
            }
          });
          addedCount++;
        } catch (err) {
          console.error(`Product ${productId} not available:`, err.message);
        }
      }
      return addedCount > 0;
    } catch (error) {
      console.error('Error reordering:', error);
      return false;
    }
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + (item.quantity || 0), 0);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);
  };

  const placeOrder = async (shippingAddress, paymentMethod = 'cod') => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('User not authenticated');
      }

      const items = cart.map(item => ({
        productId: item._id,
        quantity: item.quantity
      }));

      const response = await axios.post('/order', {
        items,
        shippingAddress,
        paymentMethod
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear cart after successful order
      clearCart();

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Expose derived values for convenience
  const total = getCartTotal();
  const count = getCartCount();

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        reorderItems,
        getCartCount,
        getCartTotal,
        placeOrder,
        total,
        count
      }}
    >
      {children}
    </CartContext.Provider>
  );
};