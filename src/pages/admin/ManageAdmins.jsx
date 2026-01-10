import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import './ManageAdmins.css';
import ViewOnlyBanner from '../../components/admin/ViewOnlyBanner';

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'vendor',
    permissions: ['manage_products', 'manage_categories'],
    tags: [],
    isActive: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Current admin and viewer check
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const viewOnly = (() => {
    try {
      const admin = JSON.parse(localStorage.getItem('admin') || '{}');
      return admin?.role === 'normal_viewer' || admin?.role === 'special_viewer';
    } catch { return false; }
  })();

  // Role display names
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

  // Role icon
  const RoleIcon = ({ role }) => {
    if (role === 'super_admin') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    );
    if (role === 'admin') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    );
    if (role === 'vendor') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      </svg>
    );
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    );
  };

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) setCurrentAdmin(JSON.parse(adminData));
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await axios.get('/admin/admins', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
      Swal.fire('Error', 'Failed to load admins', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePermissionToggle = (permission) => {
    const newPerms = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission];
    setFormData({ ...formData, permissions: newPerms });
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email,
      password: '',
      role: admin.role,
      permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
      tags: Array.isArray(admin.tags) ? admin.tags : [],
      isActive: admin.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (adminId, adminName) => {
    const result = await Swal.fire({
      title: 'Delete Admin?',
      html: `Are you sure you want to delete <strong>${adminName}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete!'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`/admin/admins/${adminId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      Swal.fire('Deleted!', 'Admin has been deleted.', 'success');
      fetchAdmins();
    } catch (error) {
      Swal.fire('Error', 'Failed to delete admin', 'error');
    }
  };

  const handleChangePassword = async (adminId, adminName) => {
    const { value: password } = await Swal.fire({
      title: `Change Password for ${adminName}`,
      input: 'password',
      inputLabel: 'Enter new password',
      inputPlaceholder: 'New password',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'Password is required!';
        if (value.length < 6) return 'Password must be at least 6 characters';
      }
    });

    if (!password) return;

    try {
      await axios.put(`/admin/admins/${adminId}/password`, { newPassword: password }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      Swal.fire('Success!', 'Password changed successfully', 'success');
    } catch (error) {
      Swal.fire('Error', 'Failed to change password', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAdmin) {
        await axios.put(`/admin/admins/${editingAdmin._id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        Swal.fire('Success!', 'Admin updated successfully', 'success');
      } else {
        await axios.post('/admin/register', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        Swal.fire('Success!', 'Admin created successfully', 'success');
      }
      resetForm();
      fetchAdmins();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to save admin', 'error');
    }
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', role: 'vendor', permissions: ['manage_products', 'manage_categories'], tags: [], isActive: true });
    setShowForm(false);
    setEditingAdmin(null);
  };

  // Filtered admins
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || admin.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Stats
  const stats = {
    total: admins.length,
    superAdmins: admins.filter(a => a.role === 'super_admin').length,
    admins: admins.filter(a => a.role === 'admin').length,
    vendors: admins.filter(a => a.role === 'vendor').length,
    viewers: admins.filter(a => a.role === 'normal_viewer' || a.role === 'special_viewer').length,
    active: admins.filter(a => a.isActive).length
  };

  if (loading) {
    return (
      <div className="manage-admins-loading">
        <div className="admin-loader">
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
          <svg className="loader-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div className="loader-text">
          <span>Loading Administrators</span>
          <div className="loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-admins-enhanced">
      {viewOnly && <ViewOnlyBanner role={currentAdmin?.role} />}
      {/* Header */}
      <div className="ma-header">
        <div className="ma-header-left">
          <h1>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Manage Administrators
          </h1>
          <p className="ma-subtitle">Manage admin accounts and permissions</p>
        </div>
        {!viewOnly && (
          <button className="ma-add-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Admin
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="ma-stats-grid">
        <div className="ma-stat-card total">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Admins</span>
          </div>
        </div>
        <div className="ma-stat-card super">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.superAdmins}</span>
            <span className="stat-label">Super Admins</span>
          </div>
        </div>
        <div className="ma-stat-card admin">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.admins}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>
        <div className="ma-stat-card vendor">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.vendors}</span>
            <span className="stat-label">Vendors</span>
          </div>
        </div>
        <div className="ma-stat-card viewer">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.viewers}</span>
            <span className="stat-label">Viewers</span>
          </div>
        </div>
        <div className="ma-stat-card active">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.active}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="ma-form-card">
          <h2>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="ma-form-grid">
              <div className="ma-form-group">
                <label>Username *</label>
                <input type="text" name="username" value={formData.username} onChange={handleInputChange} required placeholder="Enter username" />
              </div>
              <div className="ma-form-group">
                <label>Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="Enter email" />
              </div>
              {!editingAdmin && (
                <div className="ma-form-group">
                  <label>Password *</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="Enter password" />
                </div>
              )}
              {currentAdmin?.role === 'super_admin' && (
                <div className="ma-form-group">
                  <label>Role *</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required>
                    <option value="">Select Role</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="vendor">Vendor</option>
                    <option value="normal_viewer">Normal Viewer</option>
                    <option value="special_viewer">Special Viewer</option>
                  </select>
                </div>
              )}
            </div>

            {currentAdmin?.role === 'super_admin' && (
              <div className="ma-permissions-section">
                <h3>Permissions</h3>
                <div className="ma-permissions-groups">
                  <div className="ma-perm-group">
                    <h4>Management Permissions</h4>
                    <div className="ma-perm-grid">
                      {['manage_products', 'manage_categories', 'manage_orders', 'manage_users', 'manage_admins', 'manage_memberships', 'manage_wallets'].map(perm => (
                        <div key={perm} className={`ma-perm-item ${formData.permissions.includes(perm) ? 'active' : ''}`} onClick={() => handlePermissionToggle(perm)}>
                          <div className="ma-checkbox">
                            {formData.permissions.includes(perm) ? (
                              <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            ) : null}
                          </div>
                          <span>{perm.replace('manage_', '').replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ma-perm-group view">
                    <h4>View Only Permissions</h4>
                    <div className="ma-perm-grid">
                      {['view_everything', 'view_products', 'view_categories', 'view_orders'].map(perm => (
                        <div key={perm} className={`ma-perm-item ${formData.permissions.includes(perm) ? 'active' : ''}`} onClick={() => handlePermissionToggle(perm)}>
                          <div className="ma-checkbox">
                            {formData.permissions.includes(perm) ? (
                              <svg className="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            ) : null}
                          </div>
                          <span>{perm.replace('view_', '').replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ma-form-group">
                  <label>Tags (comma separated)</label>
                  <input type="text" value={formData.tags.join(', ')} onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })} placeholder="e.g., Tech Support, Vendor" />
                </div>
              </div>
            )}

            <div className="ma-form-actions">
              <button type="button" className="ma-btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="ma-btn-submit">{editingAdmin ? 'Update Admin' : 'Create Admin'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filter */}
      <div className="ma-filter-bar">
        <div className="ma-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="ma-filter-buttons">
          {['all', 'super_admin', 'admin', 'vendor', 'normal_viewer', 'special_viewer'].map(role => (
            <button key={role} className={`ma-filter-btn ${filterRole === role ? 'active' : ''}`} onClick={() => setFilterRole(role)}>
              {role === 'all' ? 'All' : getRoleDisplay(role)}
            </button>
          ))}
        </div>
      </div>

      {/* Admin Cards Grid */}
      <div className="ma-admins-grid">
        {filteredAdmins.length === 0 ? (
          <div className="ma-no-results">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>No admins found</p>
          </div>
        ) : (
          filteredAdmins.map(admin => (
            <div key={admin._id} className={`ma-admin-card ${admin.role}`}>
              <div className="ma-card-header">
                <div
                  className="ma-avatar"
                  style={admin.profilePicture ? {
                    background: `url(${admin.profilePicture}) center/cover no-repeat`
                  } : {}}
                >
                  {!admin.profilePicture && admin.username.charAt(0).toUpperCase()}
                </div>
                <div className="ma-admin-info">
                  <h3>{admin.username}</h3>
                  <p>{admin.email}</p>
                </div>
                <span className={`ma-status ${admin.isActive ? 'active' : 'inactive'}`}>
                  {admin.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="ma-card-body">
                <div className="ma-role-badge">
                  <RoleIcon role={admin.role} />
                  <span>{getRoleDisplay(admin.role)}</span>
                </div>

                {admin.permissions?.length > 0 && (
                  <div className="ma-permissions">
                    {admin.permissions.slice(0, 4).map(perm => (
                      <span key={perm} className="ma-perm-tag">{perm.replace(/_/g, ' ')}</span>
                    ))}
                    {admin.permissions.length > 4 && (
                      <span className="ma-perm-more">+{admin.permissions.length - 4} more</span>
                    )}
                  </div>
                )}

                {admin.tags?.length > 0 && (
                  <div className="ma-tags">
                    {admin.tags.map(tag => (
                      <span key={tag} className="ma-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {currentAdmin?.role === 'super_admin' && !viewOnly && (
                <div className="ma-card-actions">
                  <button className="ma-action-btn edit" onClick={() => handleEdit(admin)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </button>
                  <button className="ma-action-btn password" onClick={() => handleChangePassword(admin._id, admin.username)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Password
                  </button>
                  <button className="ma-action-btn delete" onClick={() => handleDelete(admin._id, admin.username)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                  </button>
                </div>
              )}
              {viewOnly && (
                <div className="ma-card-actions view-only">
                  <span>View Only</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageAdmins;