import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { hasPermission } from './ProtectedAdminRoute.jsx';
import './AdminLayout.css';

// Lucide-style SVG Icons
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const ProductIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const CategoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const OrderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const LogoutIcon = () => (
  <svg className="logout-icon-animated" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const RocketIcon = () => (
  <svg className="sidebar-logo-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

// Snowflake component for animation
const Snowfall = () => (
  <div className="snowfall">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="snowflake">❄</div>
    ))}
  </div>
);

// User Profile Icon
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Get current admin from localStorage
  const [admin, setAdmin] = React.useState(null);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('profile'); // profile, contributions, mail

  // Contributions state
  const [contributions, setContributions] = React.useState([]);
  const [chartData, setChartData] = React.useState([]);
  const [loadingContributions, setLoadingContributions] = React.useState(false);
  const [allAdmins, setAllAdmins] = React.useState([]);
  const [selectedAdminId, setSelectedAdminId] = React.useState('');
  const [viewingAll, setViewingAll] = React.useState(false);

  React.useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (e) {
        console.error('Failed to parse admin data');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin');
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  // Get role display name
  const getRoleDisplay = (role) => {
    const roleNames = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'vendor': 'Vendor',
      'normal_viewer': 'Normal Viewer',
      'special_viewer': 'Special Viewer'
    };
    return roleNames[role] || role;
  };

  const openProfile = () => {
    setNewUsername(admin?.username || '');
    setActiveTab('profile');
    setEditingName(false);
    setShowProfileModal(true);
  };

  const handleUpdateName = async () => {
    if (!newUsername.trim()) return;

    // For now, just update locally (you can add API call later)
    const updatedAdmin = { ...admin, username: newUsername.trim() };
    setAdmin(updatedAdmin);
    localStorage.setItem('admin', JSON.stringify(updatedAdmin));
    setEditingName(false);
  };

  const fetchContributions = async (viewAll = false, adminIdFilter = '') => {
    setLoadingContributions(true);
    try {
      const token = localStorage.getItem('adminToken');
      let url = viewAll ? '/admin/contributions/all' : '/admin/contributions/me';
      if (adminIdFilter) url += `?adminId=${adminIdFilter}`;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setContributions(data.contributions || []);
      setChartData(data.chartData || []);
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
    } finally {
      setLoadingContributions(false);
    }
  };

  const fetchAllAdmins = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/contributions/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAllAdmins(data);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  };

  // Fetch contributions when tab changes to contributions
  React.useEffect(() => {
    if (activeTab === 'contributions' && showProfileModal) {
      fetchContributions(viewingAll, selectedAdminId);
      if (admin?.role === 'super_admin') {
        fetchAllAdmins();
      }
    }
  }, [activeTab, showProfileModal, viewingAll, selectedAdminId]);

  return (
    <div className="admin-layout">
      {/* Snowfall Background */}
      <Snowfall />

      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>
            <RocketIcon />
            Admin Panel
          </h2>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard - accessible to all */}
          <Link to="/admin/dashboard" className="nav-item">
            <DashboardIcon />
            <span>Dashboard</span>
          </Link>

          {/* Products - requires manage_products permission */}
          {hasPermission(admin, 'manage_products') && (
            <Link to="/admin/products" className="nav-item">
              <ProductIcon />
              <span>Products</span>
            </Link>
          )}

          {/* Categories - requires manage_categories permission */}
          {hasPermission(admin, 'manage_categories') && (
            <Link to="/admin/categories" className="nav-item">
              <CategoryIcon />
              <span>Categories</span>
            </Link>
          )}

          {/* Orders - requires manage_orders permission */}
          {hasPermission(admin, 'manage_orders') && (
            <Link to="/admin/orders" className="nav-item">
              <OrderIcon />
              <span>Orders</span>
            </Link>
          )}

          {/* Users - requires manage_users permission, hidden from normal_viewer, disabled for special_viewer */}
          {hasPermission(admin, 'manage_users') && admin?.role !== 'normal_viewer' && (
            admin?.role === 'special_viewer' ? (
              <div className="nav-item disabled" title="View only - No access to user data" onClick={(e) => e.preventDefault()}>
                <UsersIcon />
                <span>Users</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', opacity: 0.5 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            ) : (
              <Link to="/admin/users" className="nav-item">
                <UsersIcon />
                <span>Users</span>
              </Link>
            )
          )}

          {/* Manage Admins - requires manage_admins permission */}
          {hasPermission(admin, 'manage_admins') && (
            <Link to="/admin/admins" className="nav-item">
              <SettingsIcon />
              <span>Manage Admins</span>
            </Link>
          )}

          {/* Memberships - requires manage_memberships permission */}
          {hasPermission(admin, 'manage_memberships') && (
            <Link to="/admin/memberships" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              <span>Memberships</span>
            </Link>
          )}

          {/* Wallets - requires manage_wallets permission */}
          {hasPermission(admin, 'manage_wallets') && (
            <Link to="/admin/wallets" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <span>Wallets</span>
            </Link>
          )}

          {/* Tracking Toggle - Show for all admins (will check super admin in the page itself) */}
          <Link to="/admin/tracking-toggle" className="nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Tracking Toggle</span>
          </Link>

          {/* Mail Center - Super Admin & Special Viewer */}
          {(admin?.role === 'super_admin' || admin?.role === 'special_viewer') && (
            <Link to="/admin/mails" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Mail Center</span>
            </Link>
          )}

          {/* Server - Super Admin & Special Viewer */}
          {(admin?.role === 'super_admin' || admin?.role === 'special_viewer') && (
            <Link to="/admin/server" className="nav-item server-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
              <span>Server</span>
            </Link>
          )}

          <button onClick={handleLogout} className="nav-item logout-btn-animated">
            <svg className="logout-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>
            <RocketIcon />
            Express Delivery Admin
          </h1>

          <div className="header-right">
            {/* Admin Profile Section */}
            {admin && (
              <div className="admin-profile" onClick={openProfile} style={{ cursor: 'pointer' }} title="Click to view profile">
                <div className="profile-avatar">
                  {admin.username ? admin.username.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="profile-info">
                  <span className="profile-name">{admin.username || 'Admin'}</span>
                  <span className="profile-email">{admin.email}</span>
                </div>
                <span className={`profile-role role-${admin.role}`}>
                  {getRoleDisplay(admin.role)}
                </span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              className="admin-theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <span className="sun-icon">☀️</span>
              <span className="moon-icon">🌙</span>
              <span className="toggle-ball"></span>
            </button>
          </div>
        </header>
        <div className="admin-content">
          {children}
        </div>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Admin Profile
              </h2>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Profile Tabs */}
            <div className="profile-tabs">
              <button
                className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Profile
              </button>
              <button
                className={`profile-tab ${activeTab === 'contributions' ? 'active' : ''}`}
                onClick={() => setActiveTab('contributions')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Contributions
              </button>
              <button
                className={`profile-tab ${activeTab === 'mail' ? 'active' : ''}`}
                onClick={() => setActiveTab('mail')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Mail
              </button>
            </div>

            <div className="profile-modal-content">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="profile-tab-content">
                  <div className="profile-card">
                    <div className="profile-avatar-large">
                      {admin?.username ? admin.username.charAt(0).toUpperCase() : 'A'}
                    </div>

                    <div className="profile-details">
                      <div className="profile-field">
                        <label>Name</label>
                        {editingName ? (
                          <div className="edit-field">
                            <input
                              type="text"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              autoFocus
                            />
                            <button className="save-btn" onClick={handleUpdateName}>Save</button>
                            <button className="cancel-btn" onClick={() => setEditingName(false)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="field-value">
                            <span>{admin?.username || 'Admin'}</span>
                            <button className="edit-icon-btn" onClick={() => setEditingName(true)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="profile-field">
                        <label>Email</label>
                        <div className="field-value">{admin?.email}</div>
                      </div>

                      <div className="profile-field">
                        <label>Role</label>
                        <span className={`role-badge role-${admin?.role}`}>
                          {getRoleDisplay(admin?.role)}
                        </span>
                      </div>

                      <div className="profile-field">
                        <label>Permissions</label>
                        <div className="permissions-list">
                          {admin?.permissions?.map((perm, idx) => (
                            <span key={idx} className="permission-tag">{perm.replace(/_/g, ' ')}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contributions Tab */}
              {activeTab === 'contributions' && (
                <div className="profile-tab-content">
                  <div className="contributions-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ margin: 0 }}>{viewingAll ? 'All Contributions' : 'Your Contributions'}</h3>
                      {admin?.role === 'super_admin' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <button
                            onClick={() => { setViewingAll(!viewingAll); setSelectedAdminId(''); }}
                            style={{
                              padding: '8px 16px',
                              background: viewingAll ? 'var(--btn-primary)' : 'var(--nav-link-hover)',
                              color: viewingAll ? 'white' : 'var(--text-color)',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            {viewingAll ? 'View Mine' : 'View All Admins'}
                          </button>
                          {viewingAll && (
                            <select
                              value={selectedAdminId}
                              onChange={(e) => setSelectedAdminId(e.target.value)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-color)',
                                fontSize: '12px'
                              }}
                            >
                              <option value="">All Admins</option>
                              {allAdmins.map(a => (
                                <option key={a._id} value={a._id}>{a.username}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>

                    {loadingContributions ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p>
                    ) : (
                      <>
                        {/* Simple Bar Chart */}
                        <div style={{
                          background: 'var(--nav-link-hover)',
                          borderRadius: '12px',
                          padding: '20px',
                          marginBottom: '20px'
                        }}>
                          <p style={{ margin: '0 0 15px', fontSize: '12px', color: 'var(--text-secondary)' }}>Last 7 Days Activity</p>
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '100px', gap: '8px' }}>
                            {chartData.map((day, idx) => {
                              const maxCount = Math.max(...chartData.map(d => d.count), 1);
                              const height = (day.count / maxCount) * 100;
                              return (
                                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-color)', marginBottom: '4px' }}>{day.count}</span>
                                  <div style={{
                                    width: '100%',
                                    height: `${height}%`,
                                    minHeight: '4px',
                                    background: 'linear-gradient(180deg, var(--btn-primary), #764ba2)',
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.3s ease'
                                  }}></div>
                                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          Total: {contributions.length} activities
                        </p>

                        {/* Activity List */}
                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                          {contributions.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>No activities yet</p>
                          ) : (
                            contributions.slice(0, 15).map((c, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                background: 'var(--nav-link-hover)'
                              }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--btn-primary), #764ba2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                  </svg>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.description}
                                  </p>
                                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {new Date(c.createdAt).toLocaleString('en-IN')}
                                    {c.admin?.username && viewingAll && ` • ${c.admin.username}`}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Mail Tab */}
              {activeTab === 'mail' && (
                <div className="profile-tab-content">
                  <div className="mail-section">
                    <h3>Admin Mail</h3>
                    {admin?.role === 'super_admin' ? (
                      <div className="mail-actions">
                        <p>As a Super Admin, you can send mails to users from the Mail Center.</p>
                        <Link
                          to="/admin/mails"
                          className="mail-center-btn"
                          onClick={() => setShowProfileModal(false)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                          Go to Mail Center
                        </Link>
                      </div>
                    ) : (
                      <div className="mail-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        <p>Mail features are available for Super Admins only.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;