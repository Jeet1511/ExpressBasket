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

  const renderForm = () => {
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
                <div className="form-group">
                  <label>Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="vendor">Vendor</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Permissions</label>
                  <div className="permissions">
                    {['manage_products', 'manage_categories', 'manage_orders', 'manage_users', 'manage_admins', 'view_reports', 'manage_admins_passwords', 'manage_admins_roles', 'manage_memberships', 'manage_wallets'].map(perm => (
                      <label key={perm}>
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={(e) => {
                            const newPerms = e.target.checked
                              ? [...formData.permissions, perm]
                              : formData.permissions.filter(p => p !== perm);
                            setFormData({ ...formData, permissions: newPerms });
                          }}
                        />
                        {perm.replace(/_/g, ' ')}
                      </label>
                    ))}
                  </div>
                </div>
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
        <button
          className="add-admin-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add New Admin'}
        </button>
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
                  {currentAdmin?.role === 'super_admin' && (
                    <td className="actions-cell">
                      <button onClick={() => handleEdit(admin)} className="edit-btn">Edit</button>
                      <button onClick={() => handleChangePassword(admin._id)} className="password-btn">Change Password</button>
                      <button onClick={() => handleDelete(admin._id)} className="delete-btn">Delete</button>
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