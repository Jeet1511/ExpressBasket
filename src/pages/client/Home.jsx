import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import ProductCard from '../../components/ProductCard.jsx';
import './Home.css';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [featuredRes, categoriesRes] = await Promise.all([
        axios.get('/products/featured').catch(() => ({ data: [] })),
        axios.get('/categories').catch(() => ({ data: [] }))
      ]);
      setFeaturedProducts(featuredRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load some content. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/store?category=${categoryId}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/store?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading fresh groceries...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Fresh Groceries Delivered to Your Doorstep</h1>
          <p>Shop for fresh vegetables, fruits, dairy products, and more at the best prices in India</p>
          <form className="search-box" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              Search
            </button>
          </form>
        </div>
      </section>

      {error && (
        <div style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', padding: '10px', margin: '20px 0', borderRadius: '5px' }}>
          {error}
        </div>
      )}

      {/* Categories Section */}
      <section className="categories-section">
        <h2>Shop by Category</h2>
        <div className="categories-grid">
          {categories.length > 0 ? categories.map(category => (
            <div key={category._id} className="category-card" onClick={() => handleCategoryClick(category._id)}>
              <div className="category-icon">
                {category.image ? (
                  <img
                    src={category.image.startsWith('http') ? category.image : `${category.image.startsWith('/') ? '' : '/'}${category.image}`}
                    alt={category.name}
                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.png'; }}
                  />
                ) : (
                  '📦'
                )}
              </div>
              <h3>{category.name}</h3>
            </div>
          )) : (
            <div className="category-card">
              <div className="category-icon">📦</div>
              <h3>No Categories Yet</h3>
              <p>Categories will appear here</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-products">
        <h2>Featured Products</h2>
        <div className="products-grid">
          {featuredProducts.length > 0 ? featuredProducts.map(product => (
            <ProductCard key={product._id} product={product} />
          )) : (
            <div className="product-card">
              <div className="product-image">
                <div style={{ width: '100%', height: '200px', background: 'var(--nav-link-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>No Featured Products</span>
                </div>
              </div>
              <div className="product-info">
                <h3 className="product-name">Coming Soon</h3>
                <div className="product-price">
                  <span className="current-price">₹0</span>
                  <span className="unit">/ unit</span>
                </div>
                <button className="add-to-cart-btn" disabled>
                  <i className="expDel_cart_plus"></i> Coming Soon
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Promo Banner */}
      <section className="promo-banner">
        <div className="promo-content">
          <h3>Free Delivery on Orders Above ₹500</h3>
          <p>Fresh quality guaranteed • 100% Secure Payment • Easy Returns</p>
          <a href="/store" className="shop-now-btn">Shop Now</a>
        </div>
      </section>
    </div>
  );
};

export default Home;