import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import './ManageAdmins.css';

const ManageMemberships = () => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Modal state for badge assignment with expiry
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedBadge, setSelectedBadge] = useState('silver');
    const [customExpiry, setCustomExpiry] = useState('');
    const [useCustomExpiry, setUseCustomExpiry] = useState(false);

    // Check admin role
    const admin = (() => {
        try {
            return JSON.parse(localStorage.getItem('admin') || '{}');
        } catch { return {}; }
    })();
    const viewOnly = admin?.role === 'normal_viewer' || admin?.role === 'special_viewer';
    const isSuperAdmin = admin?.role === 'super_admin' || admin?.role === 'god';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, statsRes] = await Promise.all([
                axios.get('/admin/memberships', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
                }),
                axios.get('/admin/memberships/stats', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
                })
            ]);
            setUsers(usersRes.data);
            setStats(statsRes.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to load memberships');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim().length < 1) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        const searchLower = query.toLowerCase().trim();
        const results = users.filter(user => {
            const nameMatch = user.name && user.name.toLowerCase().includes(searchLower);
            const phoneMatch = user.phone && user.phone.toString().includes(query.trim());
            const emailMatch = user.email && user.email.toLowerCase().includes(searchLower);
            return nameMatch || phoneMatch || emailMatch;
        });

        setSearchResults(results.slice(0, 10));
        setShowSearchResults(true);
    };

    const openBadgeModal = (user) => {
        setSelectedUser(user);
        setSelectedBadge(user.loyaltyBadge?.type || 'silver');
        setCustomExpiry('');
        setUseCustomExpiry(false);
        setShowBadgeModal(true);
    };

    const handleBadgeAssign = async () => {
        if (!selectedUser) return;

        try {
            setError('');
            const payload = { badgeType: selectedBadge };

            // Add custom expiry if super admin and checkbox checked
            if (isSuperAdmin && useCustomExpiry && customExpiry) {
                payload.customExpiresAt = customExpiry;
            }

            await axios.put(`/admin/memberships/${selectedUser._id}/badge`,
                payload,
                { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
            );

            setSuccess(`Badge updated successfully for ${selectedUser.name}!`);
            setShowBadgeModal(false);
            setSelectedUser(null);
            setSearchQuery('');
            setShowSearchResults(false);
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to update badge');
        }
    };

    const handleRemoveBadge = async (userId) => {
        try {
            setError('');
            await axios.put(`/admin/memberships/${userId}/badge`,
                { badgeType: 'none' },
                { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
            );
            setSuccess('Badge removed successfully!');
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to remove badge');
        }
    };

    const getBadgeStyle = (type) => {
        const styles = {
            none: { background: '#6c757d', color: 'white' },
            silver: { background: 'linear-gradient(135deg, #c0c0c0, #a8a8a8)', color: '#333' },
            gold: { background: 'linear-gradient(135deg, #ffd700, #ffb347)', color: '#333' },
            platinum: { background: 'linear-gradient(135deg, #e5e4e2, #b4b4b4)', color: '#333', border: '2px solid #9370db' }
        };
        return styles[type] || styles.none;
    };

    const getRemainingDays = (expiresAt) => {
        if (!expiresAt) return null;
        const diff = new Date(expiresAt) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    const filteredUsers = users.filter(user => {
        if (filter === 'all') return true;
        if (filter === 'members') return user.loyaltyBadge?.type && user.loyaltyBadge.type !== 'none';
        return user.loyaltyBadge?.type === filter;
    });

    // Group members by badge type
    const membersByBadge = {
        platinum: filteredUsers.filter(u => u.loyaltyBadge?.type === 'platinum'),
        gold: filteredUsers.filter(u => u.loyaltyBadge?.type === 'gold'),
        silver: filteredUsers.filter(u => u.loyaltyBadge?.type === 'silver'),
        none: filteredUsers.filter(u => !u.loyaltyBadge?.type || u.loyaltyBadge?.type === 'none')
    };

    if (loading) return <div className="loading">Loading memberships...</div>;

    return (
        <div className="manage-admins">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                    Membership Management
                </h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setViewMode('cards')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: viewMode === 'cards' ? 'var(--btn-primary)' : 'var(--card-bg)',
                            color: viewMode === 'cards' ? 'white' : 'var(--text-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        Cards
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: viewMode === 'table' ? 'var(--btn-primary)' : 'var(--card-bg)',
                            color: viewMode === 'table' ? 'white' : 'var(--text-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                        Table
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '5px' }}>Total Users</p>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-color)' }}>{stats.totalUsers || 0}</p>
                </div>
                <div style={{ ...getBadgeStyle('silver'), padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', marginBottom: '5px', opacity: 0.8 }}>Silver</p>
                    <p style={{ fontSize: '28px', fontWeight: '700' }}>{stats.silverMembers || 0}</p>
                </div>
                <div style={{ ...getBadgeStyle('gold'), padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', marginBottom: '5px', opacity: 0.8 }}>Gold</p>
                    <p style={{ fontSize: '28px', fontWeight: '700' }}>{stats.goldMembers || 0}</p>
                </div>
                <div style={{ ...getBadgeStyle('platinum'), padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', marginBottom: '5px', opacity: 0.8 }}>Platinum</p>
                    <p style={{ fontSize: '28px', fontWeight: '700' }}>{stats.platinumMembers || 0}</p>
                </div>
            </div>

            {/* Search Section */}
            <div style={{
                background: 'var(--card-bg)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '25px',
                border: '2px dashed var(--btn-primary)'
            }}>
                <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)', fontSize: '16px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    Search & Add Member
                </h3>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Search by name, phone, or email..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                        style={{
                            width: '100%',
                            padding: '12px 16px 12px 45px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--input-bg)',
                            color: 'var(--text-color)',
                            fontSize: '15px'
                        }}
                    />
                    <svg style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>

                    {showSearchResults && searchResults.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            marginTop: '5px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                            zIndex: 100,
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            {searchResults.map(user => (
                                <div key={user._id} style={{
                                    padding: '12px 15px',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '3px', fontSize: '14px' }}>{user.name}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user.email}</p>
                                    </div>
                                    <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', ...getBadgeStyle(user.loyaltyBadge?.type || 'none') }}>
                                        {user.loyaltyBadge?.type || 'None'}
                                    </span>
                                    <button
                                        onClick={() => openBadgeModal(user)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: 'var(--btn-primary)',
                                            color: 'white',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Assign Badge
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'members', 'platinum', 'gold', 'silver', 'none'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: 'none',
                            background: filter === f ? 'var(--btn-primary)' : 'var(--card-bg)',
                            color: filter === f ? 'white' : 'var(--text-color)',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '13px',
                            textTransform: 'capitalize'
                        }}
                    >
                        {f === 'none' ? 'No Badge' : f} {f !== 'all' && f !== 'members' && f !== 'none' && `(${membersByBadge[f]?.length || 0})`}
                    </button>
                ))}
            </div>

            {/* Cards View */}
            {viewMode === 'cards' && (
                <div>
                    {filter === 'all' || filter === 'members' ? (
                        // Grouped view
                        <>
                            {['platinum', 'gold', 'silver'].map(badge => (
                                membersByBadge[badge].length > 0 && (
                                    <div key={badge} style={{ marginBottom: '30px' }}>
                                        <h3 style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            marginBottom: '15px',
                                            color: 'var(--text-color)',
                                            textTransform: 'capitalize'
                                        }}>
                                            <span style={{ width: '35px', height: '35px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...getBadgeStyle(badge) }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                                            </span>
                                            {badge} Members ({membersByBadge[badge].length})
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                                            {membersByBadge[badge].map(user => (
                                                <div key={user._id} style={{
                                                    background: 'var(--card-bg)',
                                                    borderRadius: '12px',
                                                    padding: '18px',
                                                    border: '1px solid var(--border-color)',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{ position: 'absolute', top: '12px', right: '12px', ...getBadgeStyle(badge), padding: '4px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase' }}>
                                                        {badge}
                                                    </div>
                                                    <h4 style={{ color: 'var(--text-color)', marginBottom: '5px', fontSize: '15px', paddingRight: '70px' }}>{user.name}</h4>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{user.email}</p>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                                        <div>
                                                            <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Expires</p>
                                                            <p style={{ fontSize: '12px', color: getRemainingDays(user.loyaltyBadge?.expiresAt) < 30 ? '#dc3545' : 'var(--text-color)', fontWeight: '600' }}>
                                                                {user.loyaltyBadge?.expiresAt ? `${getRemainingDays(user.loyaltyBadge.expiresAt)} days left` : '-'}
                                                            </p>
                                                        </div>
                                                        {!viewOnly && (
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button onClick={() => openBadgeModal(user)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: 'var(--btn-primary)', color: 'white', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                                                                <button onClick={() => handleRemoveBadge(user._id)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#dc3545', color: 'white', fontSize: '11px', cursor: 'pointer' }}>Remove</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </>
                    ) : (
                        // Filtered view
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {filteredUsers.map(user => (
                                <div key={user._id} style={{
                                    background: 'var(--card-bg)',
                                    borderRadius: '12px',
                                    padding: '18px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div>
                                            <h4 style={{ color: 'var(--text-color)', marginBottom: '3px', fontSize: '15px' }}>{user.name}</h4>
                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</p>
                                        </div>
                                        <span style={{ ...getBadgeStyle(user.loyaltyBadge?.type || 'none'), padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase' }}>
                                            {user.loyaltyBadge?.type || 'None'}
                                        </span>
                                    </div>
                                    {!viewOnly && (
                                        <button onClick={() => openBadgeModal(user)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--btn-primary)', color: 'white', fontSize: '12px', cursor: 'pointer', marginTop: '10px' }}>
                                            {user.loyaltyBadge?.type && user.loyaltyBadge.type !== 'none' ? 'Edit Badge' : 'Assign Badge'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Badge</th>
                                <th>Expires</th>
                                <th>Days Left</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span style={{ ...getBadgeStyle(user.loyaltyBadge?.type || 'none'), padding: '4px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                                            {user.loyaltyBadge?.type || 'None'}
                                        </span>
                                    </td>
                                    <td>{user.loyaltyBadge?.expiresAt ? new Date(user.loyaltyBadge.expiresAt).toLocaleDateString() : '-'}</td>
                                    <td style={{ color: getRemainingDays(user.loyaltyBadge?.expiresAt) < 30 ? '#dc3545' : 'inherit', fontWeight: getRemainingDays(user.loyaltyBadge?.expiresAt) < 30 ? '600' : 'normal' }}>
                                        {getRemainingDays(user.loyaltyBadge?.expiresAt) !== null ? `${getRemainingDays(user.loyaltyBadge.expiresAt)} days` : '-'}
                                    </td>
                                    <td>
                                        {!viewOnly ? (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => openBadgeModal(user)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: 'var(--btn-primary)', color: 'white', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                                                {user.loyaltyBadge?.type && user.loyaltyBadge.type !== 'none' && (
                                                    <button onClick={() => handleRemoveBadge(user._id)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#dc3545', color: 'white', fontSize: '11px', cursor: 'pointer' }}>Remove</button>
                                                )}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)' }}>View Only</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Badge Assignment Modal */}
            {showBadgeModal && selectedUser && (
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
                        padding: '25px',
                        maxWidth: '420px',
                        width: '90%'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '20px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                            </svg>
                            Assign Membership Badge
                        </h2>

                        <div style={{ marginBottom: '20px', padding: '15px', background: 'var(--nav-link-hover)', borderRadius: '10px' }}>
                            <p style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '3px' }}>{selectedUser.name}</p>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedUser.email}</p>
                            {selectedUser.loyaltyBadge?.type && selectedUser.loyaltyBadge.type !== 'none' && (
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    Current: <span style={{ ...getBadgeStyle(selectedUser.loyaltyBadge.type), padding: '2px 8px', borderRadius: '8px', fontSize: '10px' }}>{selectedUser.loyaltyBadge.type}</span>
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Select Badge Type</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                {['silver', 'gold', 'platinum'].map(badge => (
                                    <button
                                        key={badge}
                                        onClick={() => setSelectedBadge(badge)}
                                        style={{
                                            padding: '12px 8px',
                                            borderRadius: '10px',
                                            border: selectedBadge === badge ? '2px solid var(--btn-primary)' : '2px solid transparent',
                                            cursor: 'pointer',
                                            textTransform: 'capitalize',
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            ...getBadgeStyle(badge)
                                        }}
                                    >
                                        {badge}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Expiry - Super Admin Only */}
                        {isSuperAdmin && (
                            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '10px', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: useCustomExpiry ? '12px' : '0' }}>
                                    <input
                                        type="checkbox"
                                        checked={useCustomExpiry}
                                        onChange={(e) => setUseCustomExpiry(e.target.checked)}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <span style={{ color: 'var(--text-color)', fontSize: '13px', fontWeight: '500' }}>Set Custom Expiry Date (Super Admin)</span>
                                </label>
                                {useCustomExpiry && (
                                    <input
                                        type="date"
                                        value={customExpiry}
                                        onChange={(e) => setCustomExpiry(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--input-bg)',
                                            color: 'var(--text-color)',
                                            fontSize: '14px'
                                        }}
                                    />
                                )}
                                {!useCustomExpiry && (
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>Default: 1 year from assignment date</p>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleBadgeAssign}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--btn-primary)',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Assign Badge
                            </button>
                            <button
                                onClick={() => setShowBadgeModal(false)}
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    color: 'var(--text-color)',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageMemberships;
