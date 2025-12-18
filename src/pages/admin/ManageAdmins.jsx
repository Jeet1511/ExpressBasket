import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import './ManageAdmins.css';
import './ManageAdmins.css';

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

  // Viewer role check - viewers cannot edit
  const viewOnly = (() => {
    try {
      const admin = JSON.parse(localStorage.getItem('admin') || '{}');
      return admin?.role === 'normal_viewer' || admin?.role === 'special_viewer';
    } catch { return false; }
  })();

  // Helper function to display friendly role names
  const getRoleDisplay = (role) => {
    const roleNames = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'vendor': 'Vendor'
    };
    return roleNames[role] || role;
  };
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [changingPasswordFor, setChangingPasswordFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      setCurrentAdmin(JSON.parse(adminData));
    }
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      // Assuming there's an endpoint to get all admins
      const response = await axios.get('/admin/admins', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
      setError('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email,
      password: '', // Don't prefill password
      role: admin.role,
      permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
      tags: Array.isArray(admin.tags) ? admin.tags : [],
      isActive: admin.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;

    try {
      await axios.delete(`/admin/admins/${adminId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      setSuccess('Admin deleted successfully');
      fetchAdmins();
    } catch (error) {
      setError('Failed to delete admin');
    }
  };

  const handleChangePassword = async (adminId) => {
    const password = prompt('Enter new password:');
    if (!password) return;

    try {
      await axios.put(`/admin/admins/${adminId}/password`, { newPassword: password }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      setSuccess('Password changed successfully');
    } catch (error) {
      setError('Failed to change password');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let response;
      if (editingAdmin) {
        response = await axios.put(`/admin/admins/${editingAdmin._id}`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        });
        setSuccess('Admin updated successfully');
      } else {
        response = await axios.post('/admin/register', formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        });
        setSuccess('Admin created successfully');
      }
      setFormData({ username: '', email: '', password: '', role: 'vendor', permissions: ['manage_products', 'manage_categories'], tags: [], isActive: true });
      setShowForm(false);
      setEditingAdmin(null);
      fetchAdmins(); // Refresh the list
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save admin');
    }
  };

  if (loading) {
    return <div className="loading">Loading admins...</div>;
  }

  const handlePermissionToggle = (permission) => {
    const newPerms = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission];
    setFormData({ ...formData, permissions: newPerms });
  };

  const renderForm = () => {
    // Placeholder components for styling, assuming they are styled divs or custom components
    const FormGroup = ({ children }) => <div className="form-group">{children}</div>;
    const Label = ({ children }) => <label>{children}</label>;
    const Select = (props) => <select {...props} />;
    const PermissionsList = ({ children }) => <div className="permissions-list">{children}</div>;
    const PermissionGroup = ({ children }) => <div className="permission-group">{children}</div>;
    const PermissionItem = ({ children }) => <div className="permission-item">{children}</div>;

    try {
      return (
        <div className="admin-form">
          <h2>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
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
                required
              />
            </div>
            {!editingAdmin && (
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}
            {currentAdmin?.role === 'super_admin' && (
              <>
                <FormGroup>
                  <Label>Role</Label>
                  <Select name="role" value={formData.role} onChange={handleInputChange} required>
                    <option value="">Select Role</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="vendor">Vendor</option>
                    <option value="normal_viewer">Normal Viewer (View Only)</option>
                    <option value="special_viewer">Special Viewer (View Everything)</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Permissions</Label>
                  <PermissionsList>
                    {/* Manage Permissions */}
                    <PermissionGroup>
                      <strong>Edit/Manage Permissions:</strong>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('manage_products')}
                          onChange={() => handlePermissionToggle('manage_products')}
                        />
                        <span>Manage Products</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('manage_categories')}
                          onChange={() => handlePermissionToggle('manage_categories')}
                        />
                        <span>Manage Categories</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('manage_orders')}
                          onChange={() => handlePermissionToggle('manage_orders')}
                        />
                        <span>Manage Orders</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('manage_users')}
                          onChange={() => handlePermissionToggle('manage_users')}
                        />
                        <span>Manage Users</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('manage_admins')}
                          onChange={() => handlePermissionToggle('manage_admins')}
                        />
                        <span>Manage Admins</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('manage_memberships')}
                          onChange={() => handlePermissionToggle('manage_memberships')}
                        />
                        <span>Manage Memberships</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('manage_wallets')}
                          onChange={() => handlePermissionToggle('manage_wallets')}
                        />
                        <span>Manage Wallets</span>
                      </PermissionItem>
                    </PermissionGroup>

                    {/* View-Only Permissions */}
                    <PermissionGroup>
                      <strong style={{ color: 'var(--btn-primary)', marginTop: '15px' }}>View-Only Permissions (for Viewers):</strong>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('view_everything')}
                          onChange={() => handlePermissionToggle('view_everything')}
                        />
                        <span>View Everything</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('view_products')}
                          onChange={() => handlePermissionToggle('view_products')}
                        />
                        <span>View Products</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('view_categories')}
                          onChange={() => handlePermissionToggle('view_categories')}
                        />
                        <span>View Categories</span>
                      </PermissionItem>
                      <PermissionItem>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('view_orders')}
                          onChange={() => handlePermissionToggle('view_orders')}
                        />
                        <span>View Orders</span>
                      </PermissionItem>
                    </PermissionGroup>
                  </PermissionsList>
                </FormGroup>
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags.join(', ')}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
                    placeholder="e.g., Tech Support, Vendor"
                  />
                </div>
              </>
            )}
            <button type="submit" className="submit-btn">{editingAdmin ? 'Update Admin' : 'Create Admin'}</button>
          </form>
        </div>
      );
    } catch (error) {
      return <div>Error rendering form: {error.message}</div>;
    }
  };

  return (
    <div className="manage-admins">
      <div className="header">
        <h1>Manage Admins</h1>
        {!viewOnly && (
          <button
            className="add-admin-btn"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Add New Admin'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && renderForm()}

      <div className="admins-list">
        <h2>Current Admins</h2>
        <div className="table-container">
          <table className="admins-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Tags</th>
                <th>Status</th>
                {currentAdmin?.role === 'super_admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin._id}>
                  <td>{admin.username}</td>
                  <td>{admin.email}</td>
                  <td><span className={`role role-${admin.role}`}>{getRoleDisplay(admin.role)}</span></td>
                  <td>
                    <div className="permissions-list">
                      {admin.permissions?.length > 0 ? admin.permissions.map(perm => (
                        <span key={perm} className="permission-tag">{perm.replace(/_/g, ' ')}</span>
                      )) : 'None'}
                    </div>
                  </td>
                  <td>
                    <div className="tags-list">
                      {admin.tags?.length > 0 ? admin.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      )) : 'None'}
                    </div>
                  </td>
                  <td>
                    <span className={`status ${admin.isActive ? 'active' : 'inactive'}`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {currentAdmin?.role === 'super_admin' && !viewOnly && (
                    <td className="actions-cell">
                      <button onClick={() => handleEdit(admin)} className="edit-btn">Edit</button>
                      <button onClick={() => handleChangePassword(admin._id)} className="password-btn">Change Password</button>
                      <button onClick={() => handleDelete(admin._id)} className="delete-btn">Delete</button>
                    </td>
                  )}
                  {viewOnly && (
                    <td className="actions-cell">
                      <span style={{ color: 'var(--text-secondary)' }}>View Only</span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageAdmins;