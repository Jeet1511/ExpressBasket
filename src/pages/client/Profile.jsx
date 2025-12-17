import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import axios from '../../utils/axios';
import './Profile.css';

const Profile = () => {
  const { user, loading, login, signup, logout, updateProfile } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    }
  });
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    }
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // New state for stats and orders
  const [stats, setStats] = useState({ totalOrders: 0, totalSpend: 0, loyaltyBadge: { type: 'none' } });
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgePrices, setBadgePrices] = useState([]);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletHistory, setWalletHistory] = useState([]);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');

  useEffect(() => {
    if (user) {
      setEditFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || {
          street: '',
          city: '',
          state: '',
          pincode: ''
        }
      });
      fetchUserStats();
      fetchOrders();
      fetchBadgePrices();
      fetchWallet();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/user/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/user/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchBadgePrices = async () => {
    try {
      const response = await axios.get('/badges/prices');
      setBadgePrices(response.data.badges);
    } catch (error) {
      console.error('Error fetching badge prices:', error);
    }
  };

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/user/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(response.data.balance);
      setWalletHistory(response.data.history);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }

    // Show popup messages instead of actual topup
    setShowTopupModal(false);
    setTopupAmount('');

    // First popup
    setMessage('Payment gateway will be added very soon!');
    setMessageType('info');

    // Second popup after 3 seconds
    setTimeout(() => {
      setMessage('Contact the admins for adding cash to your wallet');
      setMessageType('info');
    }, 3000);

    // Clear message after 6 seconds
    setTimeout(() => {
      setMessage('');
    }, 6000);
  };

  const handleBuyBadge = async (badgeType) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post('/user/buy-badge',
        { badgeType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(response.data.message);
      setMessageType('success');
      setShowBadgeModal(false);
      fetchUserStats();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to purchase badge');
      setMessageType('error');
    }
  };

  const getBadgeStyle = (type) => {
    const styles = {
      none: { background: '#6c757d', color: 'white' },
      silver: { background: 'linear-gradient(135deg, #c0c0c0, #a8a8a8)', color: '#333' },
      gold: { background: 'linear-gradient(135deg, #ffd700, #ffb347)', color: '#333' },
      platinum: { background: 'linear-gradient(135deg, #e5e4e2, #9370db)', color: '#333' }
    };
    return styles[type] || styles.none;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setMessage('Login successful!');
        setMessageType('success');
      } else {
        setMessage(result.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('An error occurred during login');
      setMessageType('error');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const result = await signup(formData);
      if (result.success) {
        setMessage('Account created successfully! Please login.');
        setMessageType('success');
        setIsLogin(true);
        setFormData({
          name: '',
          email: '',
          password: '',
          phone: '',
          address: { street: '', city: '', state: '', pincode: '' }
        });
      } else {
        setMessage(result.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('An error occurred during signup');
      setMessageType('error');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const result = await updateProfile(editFormData);
      if (result.success) {
        setMessage('Profile updated successfully!');
        setMessageType('success');
        setEditMode(false);
      } else {
        setMessage(result.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('An error occurred during profile update');
      setMessageType('error');
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="container">
          <div className="auth-section">
            <div className="auth-tabs">
              <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Login</button>
              <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Sign Up</button>
            </div>

            {message && <div className={`message ${messageType}`}>{message}</div>}

            {isLogin ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <h2>Login to Your Account</h2>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter your email" required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Enter your password" required />
                </div>
                <button type="submit" className="auth-btn">Login</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignup}>
                <h2>Create New Account</h2>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter your full name" required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter your email" required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Create a password" required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Enter 10-digit phone number" required />
                </div>
                <div className="form-group">
                  <label>Street Address</label>
                  <input type="text" name="address.street" value={formData.address.street} onChange={handleInputChange} placeholder="Enter your street address" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" name="address.city" value={formData.address.city} onChange={handleInputChange} placeholder="City" required />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input type="text" name="address.state" value={formData.address.state} onChange={handleInputChange} placeholder="State" required />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input type="text" name="address.pincode" value={formData.address.pincode} onChange={handleInputChange} placeholder="6-digit pincode" required />
                  </div>
                </div>
                <button type="submit" className="auth-btn">Sign Up</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="container">
        <div className="profile-header-actions">
          <h1 className="profile-title">My Profile</h1>
          <button className="logout-btn" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>

        {message && <div className={`message ${messageType}`}>{message}</div>}

        <div className="profile-content">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
                <p className="profile-meta">Member since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
                {/* Loyalty Badge */}
                {stats.loyaltyBadge?.type && stats.loyaltyBadge.type !== 'none' && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginTop: '8px',
                    ...getBadgeStyle(stats.loyaltyBadge.type)
                  }}>
                    <svg className="icon-pulse" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    {stats.loyaltyBadge.type} Member
                  </span>
                )}
              </div>
              <button className="edit-btn" onClick={() => {
                setEditMode(!editMode);
                if (!editMode) {
                  setEditFormData({
                    name: user.name || '',
                    phone: user.phone || '',
                    address: user.address || { street: '', city: '', state: '', pincode: '' }
                  });
                }
              }}>
                {editMode ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</>
                ) : (
                  <><svg className="icon-bounce" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit Profile</>
                )}
              </button>
            </div>

            {editMode ? (
              <form className="profile-form" onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} required />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={editFormData.phone} onChange={handleEditChange} required />
                </div>
                <div className="form-group">
                  <label>Street Address</label>
                  <input type="text" name="address.street" value={editFormData.address.street} onChange={handleEditChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input type="text" name="address.city" value={editFormData.address.city} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input type="text" name="address.state" value={editFormData.address.state} onChange={handleEditChange} required />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input type="text" name="address.pincode" value={editFormData.address.pincode} onChange={handleEditChange} required />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">
                    <svg className="icon-bounce" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-details">
                <div className="detail-item">
                  <svg className="icon-pulse" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <div>
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{user.phone}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <svg className="icon-pulse" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <div>
                    <span className="detail-label">Address</span>
                    <span className="detail-value">
                      {user.address ? `${user.address.street}, ${user.address.city}, ${user.address.state} - ${user.address.pincode}` : 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Section */}
            <div className="stats-section">
              <h3>Account Stats</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon total-orders">
                    <svg className="icon-bounce" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.totalOrders}</div>
                    <div className="stat-label">Total Orders</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon total-spent">
                    <svg className="icon-pulse" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">₹{stats.totalSpend?.toFixed(2) || '0.00'}</div>
                    <div className="stat-label">Total Spent</div>
                  </div>
                </div>
                <div className="stat-card" onClick={() => setShowBadgeModal(true)} style={{ cursor: 'pointer' }}>
                  <div className="stat-icon loyalty">
                    <svg className="icon-spin-slow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value" style={{ textTransform: 'capitalize' }}>
                      {stats.loyaltyBadge?.type === 'none' ? 'None' : stats.loyaltyBadge?.type || 'None'}
                    </div>
                    <div className="stat-label">Loyalty Badge</div>
                    <small style={{ color: 'var(--btn-primary)', fontSize: '11px' }}>Click to upgrade</small>
                  </div>
                </div>
                {/* Wallet Balance Card */}
                <div className="stat-card" onClick={() => setShowTopupModal(true)} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <svg className="icon-pulse" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value" style={{ color: 'white' }}>₹{walletBalance.toFixed(2)}</div>
                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Wallet Balance</div>
                    <small style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Click to top-up</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="stats-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3>Order History</h3>
                <button onClick={() => setShowOrders(!showOrders)} style={{
                  background: 'var(--btn-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  {showOrders ? 'Hide Orders' : `View Orders (${orders.length})`}
                </button>
              </div>

              {showOrders && (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {orders.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No orders yet</p>
                  ) : (
                    orders.map(order => (
                      <div key={order._id} style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '15px',
                        marginBottom: '10px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontWeight: '600' }}>Order #{order._id.slice(-6).toUpperCase()}</span>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            background: order.status === 'delivered' ? '#28a745' : order.status === 'cancelled' ? '#dc3545' : '#ffc107',
                            color: order.status === 'pending' ? '#333' : 'white'
                          }}>
                            {order.status}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                          {new Date(order.orderDate).toLocaleDateString('en-IN')} • {order.items.length} items
                        </p>
                        <p style={{ fontWeight: '600', color: 'var(--btn-primary)' }}>₹{order.totalAmount?.toFixed(2)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Badge Purchase Modal */}
        {
          showBadgeModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }} onClick={() => setShowBadgeModal(false)}>
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: '16px',
                padding: '30px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }} onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: '20px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg className="icon-bounce" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                  Loyalty Badges
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Current Badge: <strong style={{ textTransform: 'capitalize' }}>{stats.loyaltyBadge?.type || 'None'}</strong>
                </p>

                {badgePrices.map(badge => (
                  <div key={badge.type} style={{
                    border: '2px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '15px',
                    ...getBadgeStyle(badge.type)
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ textTransform: 'capitalize', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg className="icon-pulse" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        {badge.type}
                      </h3>
                      <span style={{ fontSize: '20px', fontWeight: '700' }}>₹{badge.price}</span>
                    </div>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                      {badge.benefits.map((benefit, i) => (
                        <li key={i} style={{ fontSize: '14px', marginBottom: '5px' }}>{benefit}</li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleBuyBadge(badge.type)}
                      disabled={stats.loyaltyBadge?.type === badge.type ||
                        (['gold', 'platinum'].includes(stats.loyaltyBadge?.type) && badge.type === 'silver') ||
                        (stats.loyaltyBadge?.type === 'platinum' && badge.type === 'gold')}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: 'none',
                        borderRadius: '8px',
                        background: stats.loyaltyBadge?.type === badge.type ? '#6c757d' : '#28a745',
                        color: 'white',
                        fontWeight: '600',
                        cursor: stats.loyaltyBadge?.type === badge.type ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {stats.loyaltyBadge?.type === badge.type ? 'Current Badge' : 'Purchase'}
                    </button>
                  </div>
                ))}

                <button onClick={() => setShowBadgeModal(false)} style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}>
                  Close
                </button>
              </div>
            </div>
          )}

        {/* Wallet Top-up Modal */}
        {showTopupModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }} onClick={() => setShowTopupModal(false)}>
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '400px',
              width: '90%'
            }} onClick={e => e.stopPropagation()}>
              <h2 style={{ marginBottom: '20px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Top-up Wallet
              </h2>

              <div style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                color: 'white',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>Current Balance</p>
                <p style={{ fontSize: '32px', fontWeight: '700' }}>₹{walletBalance.toFixed(2)}</p>
              </div>

              <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Select amount:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {[100, 200, 500, 1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTopupAmount(amt.toString())}
                    style={{
                      padding: '12px',
                      border: topupAmount === amt.toString() ? '2px solid var(--btn-primary)' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: topupAmount === amt.toString() ? 'rgba(40, 167, 69, 0.1)' : 'var(--card-bg)',
                      color: 'var(--text-color)',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Or enter custom amount:</label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-color)',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleTopup}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'var(--btn-primary)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Add ₹{topupAmount || '0'} to Wallet
                </button>
                <button
                  onClick={() => setShowTopupModal(false)}
                  style={{
                    padding: '14px 20px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;