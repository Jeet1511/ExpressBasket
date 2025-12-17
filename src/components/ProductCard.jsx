import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ImageLightbox from './ImageLightbox.jsx';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { showCartToast } = useToast();
  const [showLightbox, setShowLightbox] = useState(false);

  const handleAddToCart = (e) => {
    if (e) e.stopPropagation();
    addToCart(product);
    showCartToast(product.name);
  };

  const handleImageClick = (e) => {
    e.stopPropagation(); // Prevent add to cart
    setShowLightbox(true);
  };

  // Clicking anywhere on the card adds to cart
  const handleCardClick = () => {
    handleAddToCart();
  };

  const imageUrl = product.image && (product.image.startsWith('http') ? product.image : `${product.image.startsWith('/') ? '' : '/'}${product.image}`);

  return (
    <>
      <div className="product-card" onClick={handleCardClick}>
        <div className="product-image">
          {/* Ensure images served from backend are requested from backend origin */}
          <img
            src={imageUrl}
            alt={product.name}
            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.png'; }}
          />
          <button className="quick-view" onClick={handleImageClick}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <div className="product-price">
            <span className="current-price">₹{product.price}</span>
            <span className="unit">/ {product.unit}</span>
          </div>
          <button className="add-to-cart-btn" onClick={handleAddToCart}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Add to Cart
          </button>
        </div>
      </div>

      <ImageLightbox
        imageUrl={imageUrl}
        alt={product.name}
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
      />
    </>
  );
};

export default ProductCard;