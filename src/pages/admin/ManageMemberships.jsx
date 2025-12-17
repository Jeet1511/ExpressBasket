import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import './ManageAdmins.css'; // Reuse admin styles

const ManageMemberships = () => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filter, setFilter] = useState('all');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

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

        console.log('Search query:', query, 'Found:', results.length, 'users');
        setSearchResults(results.slice(0, 10));
        setShowSearchResults(true);
    };

    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedBadge, setSelectedBadge] = useState('silver');

    const handleAddMember = async () => {
        if (!selectedUser) return;
        await handleBadgeChange(selectedUser._id, selectedBadge);
        setShowAddModal(false);
        setSelectedUser(null);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    const handleQuickBadgeAssign = async (userId, badgeType) => {
        await handleBadgeChange(userId, badgeType);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    const handleBadgeChange = async (userId, badgeType) => {
        try {
            setError('');
            setSuccess('');
            await axios.put(`/admin/memberships/${userId}/badge`,
                { badgeType },
                { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
            );
            setSuccess(`Badge updated successfully!`);
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to update badge');
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

    const filteredUsers = users.filter(user => {
        if (filter === 'all') return true;
        if (filter === 'members') return user.loyaltyBadge?.type && user.loyaltyBadge.type !== 'none';
        return user.loyaltyBadge?.type === filter;
    });

    if (loading) return <div className="loading">Loading memberships...</div>;

    return (
        <div className="manage-admins">
            <h1>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                Membership Management
            </h1>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Stats Cards */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total Users</h3>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-color)' }}>{stats.totalUsers || 0}</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #c0c0c0, #a8a8a8)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <h3 style={{ color: '#333', fontSize: '14px' }}>Silver Members</h3>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#333' }}>{stats.silverMembers || 0}</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffd700, #ffb347)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <h3 style={{ color: '#333', fontSize: '14px' }}>Gold Members</h3>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#333' }}>{stats.goldMembers || 0}</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #e5e4e2, #9370db)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                    <h3 style={{ color: '#333', fontSize: '14px' }}>Platinum Members</h3>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#333' }}>{stats.platinumMembers || 0}</p>
                </div>
            </div>

            {/* Search User Section */}
            <div style={{
                background: 'var(--card-bg)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '2px dashed var(--btn-primary)'
            }}>
                <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    Add Member by Search
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
                            padding: '12px 16px',
                            paddingLeft: '45px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--input-bg)',
                            color: 'var(--text-color)',
                            fontSize: '16px'
                        }}
                    />
                    <svg
                        style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>

                    {/* Search Results Dropdown */}
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
                                    padding: '15px',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '15px'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px' }}>{user.name}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            {user.email} {user.phone && `• ${user.phone}`}
                                        </p>
                                        <span style={{
                                            fontSize: '10px',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            ...getBadgeStyle(user.loyaltyBadge?.type || 'none')
                                        }}>
                                            Current: {user.loyaltyBadge?.type || 'None'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <select
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--input-bg)',
                                                color: 'var(--text-color)',
                                                fontSize: '12px'
                                            }}
                                            defaultValue="silver"
                                            id={`badge-select-${user._id}`}
                                        >
                                            <option value="silver">Silver</option>
                                            <option value="gold">Gold</option>
                                            <option value="platinum">Platinum</option>
                                        </select>
                                        <button
                                            onClick={() => {
                                                const select = document.getElementById(`badge-select-${user._id}`);
                                                handleQuickBadgeAssign(user._id, select.value);
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: 'var(--btn-primary)',
                                                color: 'white',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                                <line x1="23" y1="11" x2="17" y2="11"></line>
                                            </svg>
                                            Add
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {showSearchResults && searchQuery.length >= 1 && searchResults.length === 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            marginTop: '5px',
                            padding: '20px',
                            textAlign: 'center',
                            color: 'var(--text-secondary)'
                        }}>
                            No users found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['all', 'members', 'silver', 'gold', 'platinum', 'none'].map(f => (
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
                            textTransform: 'capitalize'
                        }}
                    >
                        {f === 'none' ? 'No Badge' : f}
                    </button>
                ))}
            </div>

            {/* Users Table */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Current Badge</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user._id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>
                                    <span
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            ...getBadgeStyle(user.loyaltyBadge?.type || 'none')
                                        }}
                                    >
                                        {user.loyaltyBadge?.type || 'None'}
                                    </span>
                                </td>
                                <td>
                                    {user.loyaltyBadge?.expiresAt
                                        ? new Date(user.loyaltyBadge.expiresAt).toLocaleDateString()
                                        : '-'}
                                </td>
                                <td>
                                    <select
                                        value={user.loyaltyBadge?.type || 'none'}
                                        onChange={(e) => handleBadgeChange(user._id, e.target.value)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--input-bg)',
                                            color: 'var(--text-color)'
                                        }}
                                    >
                                        <option value="none">No Badge</option>
                                        <option value="silver">Silver</option>
                                        <option value="gold">Gold</option>
                                        <option value="platinum">Platinum</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageMemberships;
