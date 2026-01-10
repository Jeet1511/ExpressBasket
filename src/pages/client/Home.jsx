import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import ProductCard from '../../components/ProductCard.jsx';
import { useSocket } from '../../context/SocketContext';
import { Truck, Shield, Leaf, RotateCcw, ShoppingBag, Search, ArrowRight, Gift } from 'lucide-react';
import './Home.css';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { socket } = useSocket() || {};

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleProductUpdate = (data) => {
      console.log('Product updated:', data.action);
      fetchData();
    };

    const handleCategoryUpdate = (data) => {
      console.log('Category updated:', data.action);
      fetchData();
    };

    socket.on('product_updated', handleProductUpdate);
    socket.on('category_updated', handleCategoryUpdate);

    return () => {
      socket.off('product_updated', handleProductUpdate);
      socket.off('category_updated', handleCategoryUpdate);
    };
  }, [socket]);

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
      <div className="home-loading">
        <div className="loader-icon-container-inline">
          <div className="loader-ring"></div>
          <div className="loader-ring delay-1"></div>
          <ShoppingBag className="loader-center-icon" size={28} />
        </div>
        <p>Loading fresh products...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="hero-overlay"></div>
        <div className="hero-inner">
          <div className="hero-badge">
            <ShoppingBag size={16} />
            <span>Fresh & Quality Groceries</span>
          </div>
          <h1>Your Daily Essentials,<br />Delivered Fast</h1>
          <p>Shop premium vegetables, fruits, dairy & more at unbeatable prices. Same-day delivery available.</p>

          <form className="hero-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">
              <Search size={20} />
            </button>
          </form>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-num" style={{ color: '#ffffff' }}>500+</span>
              <span className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Products</span>
            </div>
            <div className="hero-stat">
              <span className="stat-num" style={{ color: '#ffffff' }}>10K+</span>
              <span className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Customers</span>
            </div>
            <div className="hero-stat">
              <span className="stat-num" style={{ color: '#ffffff' }}>30min</span>
              <span className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      {/* Trust Section */}
      <section className="trust-section">
        <div className="trust-item">
          <div className="trust-icon">
            <Truck size={22} />
          </div>
          <div className="trust-text">
            <strong>Free Delivery</strong>
            <span>Orders above ₹500</span>
          </div>
        </div>
        <div className="trust-item">
          <div className="trust-icon">
            <Shield size={22} />
          </div>
          <div className="trust-text">
            <strong>Secure Payment</strong>
            <span>100% protected</span>
          </div>
        </div>
        <div className="trust-item">
          <div className="trust-icon">
            <Leaf size={22} />
          </div>
          <div className="trust-text">
            <strong>Fresh Quality</strong>
            <span>Farm to doorstep</span>
          </div>
        </div>
        <div className="trust-item">
          <div className="trust-icon">
            <RotateCcw size={22} />
          </div>
          <div className="trust-text">
            <strong>Easy Returns</strong>
            <span>Hassle-free</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section-block">
        <div className="section-header">
          <h2>Shop by Category</h2>
          <a href="/store" className="view-all-link">
            View All <ArrowRight size={16} />
          </a>
        </div>
        <div className="categories-row">
          {categories.length > 0 ? categories.slice(0, 8).map(category => (
            <div key={category._id} className="cat-card" onClick={() => handleCategoryClick(category._id)}>
              <div className="cat-img">
                {category.image ? (
                  <img
                    src={category.image.startsWith('http') ? category.image : `${category.image.startsWith('/') ? '' : '/'}${category.image}`}
                    alt={category.name}
                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.png'; }}
                  />
                ) : (
                  <ShoppingBag size={28} className="cat-fallback-icon" />
                )}
              </div>
              <span className="cat-name">{category.name}</span>
            </div>
          )) : (
            <div className="cat-card">
              <div className="cat-img">
                <ShoppingBag size={28} className="cat-fallback-icon" />
              </div>
              <span className="cat-name">Coming Soon</span>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-block">
        <div className="section-header">
          <h2>Featured Products</h2>
          <a href="/store" className="view-all-link">
            View All <ArrowRight size={16} />
          </a>
        </div>
        <div className="products-row">
          {featuredProducts.length > 0 ? featuredProducts.map(product => (
            <ProductCard key={product._id} product={product} />
          )) : (
            <div className="empty-products">
              <ShoppingBag size={32} />
              <p>No featured products yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <div className="cta-content">
          <Gift size={32} className="cta-icon" />
          <h3>Get ₹100 OFF on your first order!</h3>
          <p>Use code <strong>FIRST100</strong> at checkout</p>
          <a href="/store" className="cta-btn">Start Shopping</a>
        </div>
      </section>
    </div>
  );
};

export default Home;