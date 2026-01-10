import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import './AdminDirectory.css';

const AdminDirectory = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const currentAdmin = JSON.parse(localStorage.getItem('admin') || '{}');

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

    const getRoleColor = (role) => {
        const colors = {
            'super_admin': '#f59e0b',
            'admin': '#3b82f6',
            'vendor': '#10b981',
            'normal_viewer': '#8b5cf6',
            'special_viewer': '#ec4899'
        };
        return colors[role] || '#6b7280';
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const response = await axios.get('/admin/directory', {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            setAdmins(response.data);
        } catch (error) {
            console.error('Error fetching admins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (adminId, e) => {
        e.stopPropagation();
        try {
            const response = await axios.post(`/admin/profile/${adminId}/like`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });

            // Update local state
            setAdmins(prev => prev.map(admin =>
                admin._id === adminId
                    ? { ...admin, hasLiked: response.data.liked, likeCount: response.data.likeCount }
                    : admin
            ));

            // Also update selected admin if modal is open
            if (selectedAdmin?._id === adminId) {
                setSelectedAdmin(prev => ({
                    ...prev,
                    hasLiked: response.data.liked,
                    likeCount: response.data.likeCount
                }));
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    const viewProfile = async (adminId) => {
        try {
            const response = await axios.get(`/admin/directory/${adminId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            setSelectedAdmin(response.data);
            setShowProfileModal(true);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const filteredAdmins = admins.filter(admin =>
        admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getRoleDisplay(admin.role).toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="ad-loading">
                <div className="ad-spinner"></div>
                <p>Loading admins...</p>
            </div>
        );
    }

    return (
        <div className="admin-directory">
            <div className="ad-header">
                <div className="ad-header-info">
                    <h1>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Admin Directory
                    </h1>
                    <p>View and connect with other team members</p>
                </div>
                <div className="ad-stats">
                    <span className="ad-stat-item">
                        <strong>{admins.length}</strong> Members
                    </span>
                </div>
            </div>

            <div className="ad-search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    placeholder="Search by name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="ad-grid">
                {filteredAdmins.map(admin => (
                    <div
                        key={admin._id}
                        className="ad-card"
                        onClick={() => viewProfile(admin._id)}
                    >
                        <div className="ad-card-header">
                            <div
                                className="ad-avatar"
                                style={admin.profilePicture ? {
                                    background: `url(${admin.profilePicture}) center/cover no-repeat`
                                } : { background: `linear-gradient(135deg, ${getRoleColor(admin.role)}, #764ba2)` }}
                            >
                                {!admin.profilePicture && admin.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="ad-role-badge" style={{ background: getRoleColor(admin.role) }}>
                                {getRoleDisplay(admin.role)}
                            </div>
                        </div>

                        <div className="ad-card-body">
                            <h3>{admin.username}</h3>
                            <p className="ad-email">{admin.email}</p>
                            {admin.tags?.length > 0 && (
                                <div className="ad-tags">
                                    {admin.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="ad-tag">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="ad-card-footer">
                            <button
                                className={`ad-like-btn ${admin.hasLiked ? 'liked' : ''}`}
                                onClick={(e) => handleLike(admin._id, e)}
                                disabled={admin._id === currentAdmin._id}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={admin.hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                <span>{admin.likeCount || 0}</span>
                            </button>
                            <span className="ad-view-hint">Click to view profile</span>
                        </div>
                    </div>
                ))}
            </div>

            {filteredAdmins.length === 0 && (
                <div className="ad-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>No admins found</p>
                </div>
            )}

            {/* Profile View Modal */}
            {showProfileModal && selectedAdmin && (
                <div className="ad-modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="ad-modal" onClick={e => e.stopPropagation()}>
                        <button className="ad-modal-close" onClick={() => setShowProfileModal(false)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <div className="ad-modal-header">
                            <div
                                className="ad-modal-avatar"
                                style={selectedAdmin.profilePicture ? {
                                    background: `url(${selectedAdmin.profilePicture}) center/cover no-repeat`
                                } : { background: `linear-gradient(135deg, ${getRoleColor(selectedAdmin.role)}, #764ba2)` }}
                            >
                                {!selectedAdmin.profilePicture && selectedAdmin.username.charAt(0).toUpperCase()}
                            </div>
                            <h2>{selectedAdmin.username}</h2>
                            <p>{selectedAdmin.email}</p>
                            <div className="ad-modal-role" style={{ background: getRoleColor(selectedAdmin.role) }}>
                                {getRoleDisplay(selectedAdmin.role)}
                            </div>
                        </div>

                        <div className="ad-modal-stats">
                            <div className="ad-modal-stat">
                                <span className="stat-value">{selectedAdmin.likeCount || 0}</span>
                                <span className="stat-label">Likes</span>
                            </div>
                            <div className="ad-modal-stat">
                                <span className="stat-value">{selectedAdmin.contributionCount || selectedAdmin.contributions?.length || 0}</span>
                                <span className="stat-label">Contributions</span>
                            </div>
                            <div className="ad-modal-stat">
                                <span className="stat-value">{new Date(selectedAdmin.createdAt).toLocaleDateString('en-IN')}</span>
                                <span className="stat-label">Joined</span>
                            </div>
                        </div>

                        {selectedAdmin._id !== currentAdmin._id && (
                            <button
                                className={`ad-modal-like-btn ${selectedAdmin.hasLiked ? 'liked' : ''}`}
                                onClick={(e) => handleLike(selectedAdmin._id, e)}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={selectedAdmin.hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                {selectedAdmin.hasLiked ? 'Liked' : 'Like'}
                            </button>
                        )}

                        {selectedAdmin.contributions?.length > 0 && (
                            <div className="ad-modal-contributions">
                                <h3>Recent Contributions</h3>
                                <div className="ad-contributions-list">
                                    {selectedAdmin.contributions.slice(0, 5).map((c, idx) => (
                                        <div key={idx} className="ad-contribution-item">
                                            <div className="ad-contribution-icon">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                                </svg>
                                            </div>
                                            <div className="ad-contribution-info">
                                                <span className="ad-contribution-desc">{c.description}</span>
                                                <span className="ad-contribution-time">
                                                    {new Date(c.createdAt).toLocaleDateString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDirectory;
