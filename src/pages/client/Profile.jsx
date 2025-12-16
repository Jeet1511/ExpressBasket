import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
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
    }
  }, [user]);

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
          address: {
            street: '',
            city: '',
            state: '',
            pincode: ''
          }
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
              <button
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>
              <button
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </div>

            {message && (
              <div className={`message ${messageType}`}>
                {message}
              </div>
            )}

            {isLogin ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <h2>Login to Your Account</h2>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <button type="submit" className="auth-btn">Login</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignup}>
                <h2>Create New Account</h2>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter 10-digit phone number"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Street Address</label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    placeholder="Enter your street address"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      placeholder="City"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      placeholder="State"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input
                      type="text"
                      name="address.pincode"
                      value={formData.address.pincode}
                      onChange={handleInputChange}
                      placeholder="6-digit pincode"
                      required
                    />
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
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="profile-content">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                <i className="fas fa-user-circle"></i>
              </div>
              <div className="profile-info">
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
                <p className="profile-meta">
                  Member since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-IN')}
                </p>
              </div>
              <button
                className="edit-btn"
                onClick={() => {
                  setEditMode(!editMode);
                  if (!editMode) {
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
                  }
                }}
              >
                <i className={`fas ${editMode ? 'fa-times' : 'fa-edit'}`}></i>
                {editMode ? ' Cancel' : ' Edit Profile'}
              </button>
            </div>

            {editMode ? (
              <form className="profile-form" onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Street Address</label>
                  <input
                    type="text"
                    name="address.street"
                    value={editFormData.address.street}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="address.city"
                      value={editFormData.address.city}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="address.state"
                      value={editFormData.address.state}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input
                      type="text"
                      name="address.pincode"
                      value={editFormData.address.pincode}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">
                    <i className="fas fa-save"></i> Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-details">
                <div className="detail-item">
                  <i className="fas fa-phone"></i>
                  <div>
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{user.phone}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <i className="fas fa-map-marker-alt"></i>
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

          {/* Quick Stats */}
          <div className="stats-section">
            <h3>Account Stats</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total-orders">
                  <i className="fas fa-shopping-bag"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">0</div>
                  <div className="stat-label">Total Orders</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon total-spent">
                  <i className="fas fa-rupee-sign"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">₹0</div>
                  <div className="stat-label">Total Spent</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon loyalty">
                  <i className="fas fa-crown"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">New</div>
                  <div className="stat-label">Loyalty Tier</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;