import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import axios from '../../utils/axios';
import useTrackingStatus from '../../hooks/useTrackingStatus.js';
import OrderBill from '../../components/OrderBill';
import Swal from 'sweetalert2';
import './Profile.css';

const Profile = () => {
  const { user, loading, login, signup, logout, updateProfile } = useUser();
  const { reorderItems } = useCart();
  const {
    newMailNotification,
    clearNotification,
    membershipUpdate,
    clearMembershipUpdate,
    walletUpdate,
    clearWalletUpdate
  } = useSocket() || {};
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
  const [showPassword, setShowPassword] = useState(false);

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
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const { trackingEnabled } = useTrackingStatus();

  // Mail state
  const [mails, setMails] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMails, setShowMails] = useState(false);
  const [selectedMail, setSelectedMail] = useState(null);

  // Activities state
  const [showActivities, setShowActivities] = useState(false);
  const [activityFromDate, setActivityFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [activityToDate, setActivityToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Bill modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBillOrder, setSelectedBillOrder] = useState(null);

  // Reordered items tracking
  const [reorderedItems, setReorderedItems] = useState(() => {
    const saved = localStorage.getItem('reorderedItems');
    return saved ? JSON.parse(saved) : [];
  });
  const [showReorderedItems, setShowReorderedItems] = useState(false);

  // Calculate activity data based on orders and date range
  const getActivityData = () => {
    const fromDate = new Date(activityFromDate);
    const toDate = new Date(activityToDate);
    toDate.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= fromDate && orderDate <= toDate;
    });

    // Create daily aggregates
    const dailyData = {};
    let currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = { orders: 0, spending: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    filteredOrders.forEach(order => {
      const dateKey = new Date(order.orderDate).toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].orders += 1;
        dailyData[dateKey].spending += order.totalAmount || 0;
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      displayDate: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      orders: data.orders,
      spending: data.spending
    }));
  };

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
      fetchMails();
    }
  }, [user]);

  // Real-time mail notification handler
  useEffect(() => {
    if (newMailNotification) {
      // Show toast notification
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: newMailNotification.mail?.type === 'payment_request' ? 'warning' : 'info',
        title: '📬 New Mail!',
        text: newMailNotification.mail?.subject || 'You have a new message',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('click', () => {
            setShowMails(true);
            Swal.close();
          });
        }
      });

      // Refresh mails to update the count and list
      fetchMails();

      // Clear the notification
      if (clearNotification) {
        clearNotification();
      }
    }
  }, [newMailNotification]);

  // Real-time membership update handler
  useEffect(() => {
    if (membershipUpdate) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Membership Updated!',
        text: membershipUpdate.badge?.type
          ? `Your badge is now: ${membershipUpdate.badge.type.toUpperCase()}`
          : 'Your membership has been updated',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
      });

      // Refresh user stats
      fetchUserStats();

      if (clearMembershipUpdate) {
        clearMembershipUpdate();
      }
    }
  }, [membershipUpdate]);

  // Real-time wallet update handler
  useEffect(() => {
    if (walletUpdate) {
      const action = walletUpdate.action;
      const amount = walletUpdate.amount;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: action === 'deposit' ? 'success' : 'info',
        title: action === 'deposit' ? 'Wallet Credited!' : 'Wallet Updated',
        text: `₹${amount} ${action === 'deposit' ? 'added to' : 'deducted from'} your wallet`,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
      });

      // Update wallet balance immediately
      if (walletUpdate.balance !== undefined) {
        setWalletBalance(walletUpdate.balance);
      }

      if (clearWalletUpdate) {
        clearWalletUpdate();
      }
    }
  }, [walletUpdate]);

  const fetchMails = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/user/mails', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMails(response.data.mails);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching mails:', error);
    }
  };

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

  const handleMarkAsRead = async (mailId) => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.put(`/user/mails/${mailId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMails();
    } catch (error) {
      console.error('Error marking mail as read:', error);
    }
  };

  const handleDeleteMail = async (mailId) => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.delete(`/user/mails/${mailId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedMail(null);
      fetchMails();
      setMessage('Mail deleted successfully');
      setMessageType('success');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete mail');
      setMessageType('error');
    }
  };

  const openMail = (mail) => {
    setSelectedMail(mail);
    if (!mail.read) {
      handleMarkAsRead(mail._id);
    }
  };

  // Handle payment request response (approve or reject)
  const handlePaymentResponse = async (paymentRequestId, action) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        `/user/payment-requests/${paymentRequestId}/respond`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (action === 'approve') {
        setMessage(`Payment approved! Order has been placed.`);
        setMessageType('success');
        // Refresh wallet balance
        fetchWallet();
      } else {
        setMessage('Payment request rejected.');
        setMessageType('info');
      }

      // Close mail and refresh
      setSelectedMail(null);
      fetchMails();
    } catch (error) {
      setMessage(error.response?.data?.message || `Failed to ${action} payment request`);
      setMessageType('error');
    }
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
                  <div className="password-input-wrapper">
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder="Enter your password" required />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button type="submit" className="auth-btn">Login</button>
                <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
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
                  <div className="password-input-wrapper">
                    <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} placeholder="Create a password" required />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
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
          <button className="logout-btn-animated" onClick={logout}>
            <svg className="logout-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
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
                  <span
                    className={`badge-${stats.loyaltyBadge.type}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      marginTop: '8px',
                      ...getBadgeStyle(stats.loyaltyBadge.type)
                    }}>
                    {stats.loyaltyBadge.type === 'platinum' ? (
                      <svg className="platinum-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    )}
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
                  <div className="detail-icon-wrapper">
                    <svg className="icon-pulse" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </div>
                  <div>
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{user.phone}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-icon-wrapper">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', marginRight: '10px' }}></span>
                    <svg className="icon-pulse" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div>
                    <span className="detail-label">Address</span>
                    <span className="detail-value">
                      {user.address ? `${user.address.street}, ${user.address.city}, ${user.address.state} - ${user.address.pincode}` : 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column Content */}
          <div className="right-column">
            {/* Stats Section */}
            <div className="stats-section">
              <h3>Account Stats</h3>
              <div className="stats-grid">
                {/* Total Orders Card */}
                <div className="stat-card orders-card">
                  <div className="stat-icon total-orders">
                    <svg className="icon-bounce" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.totalOrders}</div>
                    <div className="stat-label">Total Orders</div>
                  </div>
                </div>

                {/* Total Spent Card */}
                <div className="stat-card spent-card">
                  <div className="stat-icon total-spent">
                    <svg className="icon-pulse" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">₹{stats.totalSpend?.toFixed(2) || '0.00'}</div>
                    <div className="stat-label">Total Spent</div>
                  </div>
                </div>

                {/* Loyalty Badge Card */}
                <div
                  className="stat-card loyalty-card"
                  onClick={() => setShowBadgeModal(true)}
                  style={{
                    background: (() => {
                      const badgeType = stats.loyaltyBadge?.type || 'none';
                      switch (badgeType) {
                        case 'platinum':
                          return 'linear-gradient(135deg, #a78bfa, #8b5cf6)';
                        case 'gold':
                          return 'linear-gradient(135deg, #ffe066, #ffc107)';
                        case 'silver':
                          return 'linear-gradient(135deg, #e0e0e0, #bdbdbd)';
                        default:
                          return 'linear-gradient(135deg, #6c757d, #495057)';
                      }
                    })()
                  }}
                >
                  <div className="stat-icon loyalty">
                    <svg className="icon-spin-slow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value" style={{
                      textTransform: 'capitalize',
                      color: (stats.loyaltyBadge?.type === 'platinum' || stats.loyaltyBadge?.type === 'none') ? 'white' : '#333'
                    }}>
                      {stats.loyaltyBadge?.type === 'none' ? 'None' : stats.loyaltyBadge?.type || 'None'}
                    </div>
                    <div className="stat-label" style={{
                      color: (stats.loyaltyBadge?.type === 'platinum' || stats.loyaltyBadge?.type === 'none') ? 'rgba(255, 255, 255, 0.9)' : '#555'
                    }}>Loyalty Badge</div>
                    {stats.loyaltyBadge?.type && stats.loyaltyBadge.type !== 'none' && stats.loyaltyBadge.expiresAt && (
                      <div style={{
                        fontSize: '11px',
                        marginTop: '6px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: (() => {
                          const days = Math.ceil((new Date(stats.loyaltyBadge.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
                          if (days <= 0) return 'rgba(220, 53, 69, 0.2)';
                          if (days <= 30) return 'rgba(255, 193, 7, 0.2)';
                          return 'rgba(40, 167, 69, 0.15)';
                        })(),
                        color: (() => {
                          const days = Math.ceil((new Date(stats.loyaltyBadge.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
                          if (days <= 0) return '#dc3545';
                          if (days <= 30) return '#ffc107';
                          return '#28a745';
                        })(),
                        fontWeight: '600'
                      }}>
                        {(() => {
                          const days = Math.ceil((new Date(stats.loyaltyBadge.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
                          if (days <= 0) return (
                            <>
                              <svg className="icon-pulse" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                              </svg>
                              Expired
                            </>
                          );
                          if (days <= 30) return (
                            <>
                              <svg className="icon-spin-slow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              {days} days left
                            </>
                          );
                          return (
                            <>
                              <svg className="icon-bounce" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              {days} days left
                            </>
                          );
                        })()}
                      </div>
                    )}
                    {(!stats.loyaltyBadge?.type || stats.loyaltyBadge?.type === 'none') && (
                      <small className="stat-action">Click to upgrade</small>
                    )}
                  </div>
                </div>

                {/* Wallet Balance Card */}
                <div className="stat-card wallet-card" onClick={() => setShowTopupModal(true)}>
                  <div className="stat-icon wallet-icon">
                    <svg className="icon-pulse" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">₹{walletBalance.toFixed(2)}</div>
                    <div className="stat-label">Wallet Balance</div>
                    <small className="stat-action">Click to top-up</small>
                  </div>
                </div>

                {/* My Mails Card - Full Width */}
                <div className="stat-card mails-card" onClick={() => setShowMails(!showMails)}>
                  <div className="stat-icon mail-icon">
                    <svg className="icon-pulse" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{mails.length}</div>
                    <div className="stat-label">My Mails</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activities Section */}
            <div className="activities-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                  Activities
                </h3>
                <button onClick={() => setShowActivities(!showActivities)} style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}>
                  {showActivities ? 'Hide Activities' : 'View Activities'}
                </button>
              </div>

              {showActivities && (
                <div className="activities-content">
                  {/* Date Range Selector */}
                  <div className="date-range-selector">
                    <div className="date-input-group">
                      <label>From</label>
                      <input
                        type="date"
                        value={activityFromDate}
                        onChange={(e) => setActivityFromDate(e.target.value)}
                        max={activityToDate}
                      />
                    </div>
                    <div className="date-input-group">
                      <label>To</label>
                      <input
                        type="date"
                        value={activityToDate}
                        onChange={(e) => setActivityToDate(e.target.value)}
                        min={activityFromDate}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* Activity Chart */}
                  <div className="activity-chart">
                    <div className="chart-header">
                      <div className="chart-legend">
                        <span className="legend-item orders">
                          <span className="legend-dot"></span> Orders
                        </span>
                        <span className="legend-item spending">
                          <span className="legend-dot"></span> Spending (₹)
                        </span>
                      </div>
                    </div>

                    <div className="chart-container">
                      {(() => {
                        const activityData = getActivityData();
                        const maxOrders = Math.max(...activityData.map(d => d.orders), 1);
                        const maxSpending = Math.max(...activityData.map(d => d.spending), 100);
                        const totalOrders = activityData.reduce((sum, d) => sum + d.orders, 0);
                        const totalSpending = activityData.reduce((sum, d) => sum + d.spending, 0);

                        return (
                          <>
                            <div className="chart-summary">
                              <div className="summary-item">
                                <span className="summary-value">{totalOrders}</span>
                                <span className="summary-label">Total Orders</span>
                              </div>
                              <div className="summary-item">
                                <span className="summary-value">₹{totalSpending.toFixed(2)}</span>
                                <span className="summary-label">Total Spent</span>
                              </div>
                            </div>

                            <div className="bars-container">
                              {activityData.map((day, index) => (
                                <div key={day.date} className="bar-group">
                                  <div className="bar-wrapper">
                                    <div
                                      className="bar orders-bar"
                                      style={{ height: `${(day.orders / maxOrders) * 100}%` }}
                                      title={`${day.orders} orders`}
                                    >
                                      {day.orders > 0 && <span className="bar-value">{day.orders}</span>}
                                    </div>
                                    <div
                                      className="bar spending-bar"
                                      style={{ height: `${(day.spending / maxSpending) * 100}%` }}
                                      title={`₹${day.spending.toFixed(2)}`}
                                    >
                                      {day.spending > 0 && <span className="bar-value">₹{Math.round(day.spending)}</span>}
                                    </div>
                                  </div>
                                  <span className="bar-label">{day.displayDate}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order History - Right Column */}
            <div className="orders-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Order History</h3>
                <button onClick={() => setShowOrders(!showOrders)} style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}>
                  {showOrders ? 'Hide Orders' : `View Orders (${orders.length})`}
                </button>
              </div>

              {showOrders && (
                <div className="orders-list">
                  {orders.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px' }}>No orders yet</p>
                  ) : (
                    orders.map(order => (
                      <div key={order._id} className="order-card">
                        <div className="order-header">
                          <span className="order-id">Order #{order._id.slice(-6).toUpperCase()}</span>
                          <span style={{
                            padding: '5px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: order.status === 'delivered' ? 'linear-gradient(135deg, #43a047, #2e7d32)' : order.status === 'cancelled' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #ffa726, #f57c00)',
                            color: 'white',
                            textTransform: 'uppercase'
                          }}>
                            {order.status}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                          {new Date(order.orderDate).toLocaleDateString('en-IN')} • {order.items.length} items
                        </p>
                        <p style={{ fontWeight: '700', color: '#667eea', fontSize: '16px', marginBottom: '8px' }}>₹{order.totalAmount?.toFixed(2)}</p>

                        {/* Track Order Button */}
                        {trackingEnabled && ['confirmed', 'packed', 'out_for_delivery'].includes(order.status) && (
                          <a
                            href={`/track-order/${order._id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginTop: '8px',
                              marginRight: '8px',
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #43a047, #2e7d32)',
                              color: 'white',
                              textDecoration: 'none',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            Track Order
                          </a>
                        )}

                        {/* Reorder Button */}
                        <button
                          onClick={async () => {
                            const success = await reorderItems(order.items);
                            if (success) {
                              // Track reordered items
                              const newReorderedItems = [...reorderedItems];
                              order.items.forEach(item => {
                                const productName = item.productId?.name || item.name || 'Product';
                                const existingIndex = newReorderedItems.findIndex(r => r.name === productName);
                                if (existingIndex >= 0) {
                                  newReorderedItems[existingIndex].count++;
                                  newReorderedItems[existingIndex].lastReordered = new Date().toISOString();
                                } else {
                                  newReorderedItems.push({
                                    name: productName,
                                    count: 1,
                                    lastReordered: new Date().toISOString()
                                  });
                                }
                              });
                              setReorderedItems(newReorderedItems);
                              localStorage.setItem('reorderedItems', JSON.stringify(newReorderedItems));

                              setMessage('Items added to cart!');
                              setMessageType('success');
                              setTimeout(() => setMessage(''), 3000);
                            } else {
                              setMessage('Some items could not be added');
                              setMessageType('error');
                              setTimeout(() => setMessage(''), 3000);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '8px',
                            marginRight: '8px',
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                          Reorder
                        </button>

                        {/* View Bill Button */}
                        <button
                          onClick={() => {
                            setSelectedBillOrder(order);
                            setShowBillModal(true);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '8px',
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #43a047, #2e7d32)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          View Bill
                        </button>
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

        {/* My Mails Section */}
        {showMails && (
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
            zIndex: 1000,
            padding: '20px'
          }} onClick={() => { setShowMails(false); setSelectedMail(null); }}>
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '16px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
              <div style={{
                padding: '20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  My Mails {unreadCount > 0 && <span style={{ background: 'var(--btn-danger)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{unreadCount} new</span>}
                </h3>
                <button onClick={() => { setShowMails(false); setSelectedMail(null); }} style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
                {selectedMail ? (
                  // Mail Detail View
                  <div style={{ padding: '20px' }}>
                    <button onClick={() => setSelectedMail(null)} style={{
                      background: 'var(--nav-link-hover)',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--text-color)'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                      </svg>
                      Back to Inbox
                    </button>
                    <h4 style={{ margin: '0 0 10px', color: 'var(--text-color)', fontSize: '20px' }}>{selectedMail.subject}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                      From: {selectedMail.fromModel === 'User' ? 'User' : 'Admin'} • {new Date(selectedMail.createdAt).toLocaleString('en-IN')}
                    </p>
                    <div style={{
                      background: 'var(--nav-link-hover)',
                      padding: '20px',
                      borderRadius: '12px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6',
                      color: 'var(--text-color)'
                    }}>
                      {selectedMail.message}
                    </div>

                    {/* Payment Request Action Buttons */}
                    {selectedMail.type === 'payment_request' && selectedMail.paymentRequestId && (
                      <div style={{
                        marginTop: '20px',
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
                        borderRadius: '12px',
                        border: '1px solid rgba(102, 126, 234, 0.2)'
                      }}>
                        <p style={{
                          color: 'var(--text-color)',
                          fontWeight: '600',
                          marginBottom: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                          Action Required: Approve or Reject this payment request
                        </p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handlePaymentResponse(selectedMail.paymentRequestId, 'approve')}
                            style={{
                              flex: 1,
                              minWidth: '140px',
                              padding: '14px 24px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Approve & Pay
                          </button>
                          <button
                            onClick={() => handlePaymentResponse(selectedMail.paymentRequestId, 'reject')}
                            style={{
                              flex: 1,
                              minWidth: '140px',
                              padding: '14px 24px',
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleDeleteMail(selectedMail._id)}
                      style={{
                        marginTop: '20px',
                        background: 'var(--btn-danger)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete Mail
                    </button>
                  </div>
                ) : (
                  // Mail List
                  mails.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '15px', opacity: 0.5 }}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      <p>No mails yet</p>
                    </div>
                  ) : (
                    mails.map(mail => (
                      <div
                        key={mail._id}
                        onClick={() => openMail(mail)}
                        style={{
                          padding: '15px',
                          borderRadius: '10px',
                          marginBottom: '10px',
                          background: mail.read ? 'transparent' : 'var(--nav-link-hover)',
                          borderLeft: mail.read ? '3px solid var(--border-color)' : '3px solid var(--btn-primary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                          <h5 style={{ margin: 0, color: 'var(--text-color)', fontWeight: mail.read ? '400' : '600' }}>
                            {!mail.read && <span style={{ color: 'var(--btn-primary)', marginRight: '8px' }}>●</span>}
                            {mail.subject}
                          </h5>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {new Date(mail.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mail.message.substring(0, 80)}...
                        </p>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reordered Items Section */}
        {reorderedItems.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            zIndex: 999
          }}>
            <button
              onClick={() => setShowReorderedItems(!showReorderedItems)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              My Reordered Items ({reorderedItems.length})
            </button>

            {showReorderedItems && (
              <div style={{
                position: 'absolute',
                bottom: '55px',
                right: 0,
                background: 'var(--card-bg)',
                borderRadius: '16px',
                padding: '20px',
                width: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-color)' }}>Frequently Reordered</h4>
                  <button
                    onClick={() => {
                      setReorderedItems([]);
                      localStorage.removeItem('reorderedItems');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {reorderedItems
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((item, index) => (
                      <div key={index} style={{
                        padding: '12px',
                        background: 'var(--bg-color)',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: '600', color: 'var(--text-color)', fontSize: '14px' }}>
                            {item.name}
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Last: {new Date(item.lastReordered).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <span style={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ×{item.count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Bill Modal */}
        {showBillModal && selectedBillOrder && (
          <OrderBill
            order={selectedBillOrder}
            user={user}
            onClose={() => {
              setShowBillModal(false);
              setSelectedBillOrder(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Profile;