import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useUser } from '../context/UserContext.jsx';
import { Gamepad2 } from 'lucide-react';
import './Header.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { getCartCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const cartCount = getCartCount();

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          {/* Logo with Animated Rocket */}
          <div className="logo">
            <Link to="/">
              <span className="rocket-logo">
                <svg
                  className="rocket-icon"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
                </svg>
                <span className="rocket-trail"></span>
              </span>
              <span className="logo-text">Express Basket</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="expDel_home"></i> Home
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="expDel_list"></i> Categories
            </NavLink>
            <NavLink to="/store" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="expDel_store"></i> Store
            </NavLink>
            <NavLink to="/cart" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="expDel_shopping_cart"></i> Cart
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </NavLink>
            <NavLink to="/gamification" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Gamepad2 size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} /> Rewards
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <i className="expDel_user"></i> Profile
            </NavLink>
            {!user && (
              <NavLink to="/login" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <i className="expDel_sign_in"></i> Login
              </NavLink>
            )}
          </nav>

          {/* Animated Theme Toggle */}
          <button
            className="theme-toggle-animated"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label="Toggle theme"
          >
            <span className="toggle-icon sun-icon">☀️</span>
            <span className="toggle-icon moon-icon">🌙</span>
            <span className="toggle-ball"></span>
          </button>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <i className={`expDel ${mobileMenuOpen ? 'times' : 'bars'}`}></i>
            <span className="menu-text">Menu</span>
          </button>

          {/* Mobile Navigation */}
          <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
            <NavLink to="/" end onClick={() => setMobileMenuOpen(false)}>
              <svg className="mobile-rocket" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
              </svg>
              Home
            </NavLink>
            <NavLink to="/categories" onClick={() => setMobileMenuOpen(false)}>
              <i className="expDel_list"></i> Categories
            </NavLink>
            <NavLink to="/store" onClick={() => setMobileMenuOpen(false)}>
              <i className="expDel_store"></i> Store
            </NavLink>
            <NavLink to="/cart" onClick={() => setMobileMenuOpen(false)}>
              <i className="expDel_shopping_cart"></i> Cart {cartCount > 0 && `(${cartCount})`}
            </NavLink>
            <NavLink to="/gamification" onClick={() => setMobileMenuOpen(false)}>
              <Gamepad2 size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} /> Rewards
            </NavLink>
            <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)}>
              <i className="expDel_user"></i> Profile
            </NavLink>
            {!user && (
              <NavLink to="/login" onClick={() => setMobileMenuOpen(false)}>
                <i className="expDel_sign_in"></i> Login
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;