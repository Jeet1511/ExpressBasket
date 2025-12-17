import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      navigate('/admin');
      return;
    }

    try {
      const parsed = JSON.parse(adminData);
      setAdmin(parsed);
    } catch (err) {
      console.error('Failed to parse admin from localStorage:', err);
      localStorage.removeItem('admin');
      localStorage.removeItem('adminToken');
      navigate('/admin');
      return;
    }

    fetchStats();
    fetchRecentOrders();
    setLoading(false);
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Get only the first 5 recent orders
      setRecentOrders(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-info">
          <span>Logged in as: {admin?.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-icon">
            <svg className="lucide-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3>Add Product</h3>
          <p>Add new grocery products to the store</p>
          <button className="card-btn" onClick={() => navigate('/admin/add-product')}>
            <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            Go to Add Product
          </button>
        </div>

        <div className="dashboard-card">
          <div className="card-icon edit-icon">
            <svg className="lucide-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          <h3>Edit Products</h3>
          <p>Manage existing products</p>
          <button className="card-btn" onClick={() => navigate('/admin/products')}>
            <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            Manage Products
          </button>
        </div>

        <div className="dashboard-card">
          <div className="card-icon category-icon">
            <svg className="lucide-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <h3>Categories</h3>
          <p>Manage product categories</p>
          <button className="card-btn" onClick={() => navigate('/admin/categories')}>
            <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            Manage Categories
          </button>
        </div>

        <div className="dashboard-card">
          <div className="card-icon admin-icon">
            <svg className="lucide-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              <circle cx="19" cy="11" r="2"></circle>
              <path d="M19 8v1"></path>
              <path d="M19 13v1"></path>
            </svg>
          </div>
          <h3>Manage Admins</h3>
          <p>Add or remove admin users</p>
          <button className="card-btn" onClick={() => navigate('/admin/admins')}>
            <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            Manage Admins
          </button>
        </div>

        <div className="dashboard-card">
          <div className="card-icon users-icon">
            <svg className="lucide-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3>Manage Users</h3>
          <p>View and edit customer profiles</p>
          <button className="card-btn" onClick={() => navigate('/admin/users')}>
            <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            Manage Users
          </button>
        </div>

        <div className="dashboard-card">
          <div className="card-icon orders-icon">
            <svg className="lucide-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <h3>Manage Orders</h3>
          <p>View and update order status</p>
          <button className="card-btn" onClick={() => navigate('/admin/orders')}>
            <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
            Manage Orders
          </button>
        </div>
      </div>

      <div className="quick-stats">
        <h2>Quick Stats</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{stats.totalProducts}</span>
            <span className="stat-label">Total Products</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalOrders}</span>
            <span className="stat-label">Total Orders</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalUsers}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">₹{stats.totalRevenue.toLocaleString()}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
        </div>
      </div>

      <div className="recent-orders">
        <div className="orders-header">
          <h2>Recent Orders</h2>
          <button className="view-all-btn" onClick={() => navigate('/admin/orders')}>
            View All Orders
          </button>
        </div>
        <div className="orders-list">
          {recentOrders.length > 0 ? (
            recentOrders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-info">
                  <div className="order-id">Order #{order._id.slice(-8)}</div>
                  <div className="order-customer">{order.userId?.name || 'Unknown'}</div>
                  <div className="order-date">{new Date(order.orderDate).toLocaleDateString()}</div>
                </div>
                <div className="order-details">
                  <div className="order-amount">₹{order.totalAmount.toLocaleString()}</div>
                  <div className={`order-status ${order.status.toLowerCase()}`}>
                    {order.status}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-orders">No orders yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;