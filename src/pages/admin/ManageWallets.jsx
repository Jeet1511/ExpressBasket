import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import './ManageAdmins.css';

const ManageWallets = () => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('deposit');
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, statsRes] = await Promise.all([
                axios.get('/admin/wallets', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
                }),
                axios.get('/admin/wallets/stats', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
                })
            ]);
            setUsers(usersRes.data);
            setStats(statsRes.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.trim().length < 1) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        try {
            const response = await axios.get(`/admin/users/search?q=${query}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            setSearchResults(response.data);
            setShowSearchResults(true);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    const openModal = (user, type) => {
        setSelectedUser(user);
        setModalType(type);
        setAmount('');
        setDescription('');
        setShowModal(true);
    };

    // For manual deposit without search
    const handleDirectDeposit = () => {
        const email = prompt('Enter user email for deposit:');
        if (!email) return;

        // Quick find local or we should ideally search API
        const user = users.find(u => u.email === email) || searchResults.find(u => u.email === email);
        if (user) {
            openModal(user, 'deposit');
        } else {
            alert('User not found in recent list. Please use the search bar to find them first.');
        }
    };

    const handleAction = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        try {
            setError('');
            const endpoint = modalType === 'deposit'
                ? `/admin/wallets/${selectedUser._id}/deposit`
                : `/admin/wallets/${selectedUser._id}/withdraw`;

            await axios.post(endpoint,
                { amount: parseFloat(amount), description },
                { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
            );

            setSuccess(`${modalType === 'deposit' ? 'Deposit' : 'Withdrawal'} successful!`);
            setShowModal(false);
            setSearchQuery('');
            setShowSearchResults(false);
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Operation failed');
        }
    };

    if (loading) return <div className="loading">Loading wallet data...</div>;

    return (
        <div className="manage-admins">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px' }}>
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Wallet Management
                </h1>
                <button
                    onClick={handleDirectDeposit}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--btn-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    + Direct Deposit
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '25px', borderRadius: '16px', color: 'white' }}>
                    <h3 style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Balance (All Users)</h3>
                    <p style={{ fontSize: '36px', fontWeight: '700' }}>₹{stats.totalBalance?.toLocaleString() || 0}</p>
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Users</h3>
                    <p style={{ fontSize: '36px', fontWeight: '700', color: 'var(--text-color)' }}>{stats.totalUsers || 0}</p>
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Users with Balance</h3>
                    <p style={{ fontSize: '36px', fontWeight: '700', color: 'var(--btn-primary)' }}>{stats.usersWithBalance || 0}</p>
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Avg Balance</h3>
                    <p style={{ fontSize: '36px', fontWeight: '700', color: 'var(--text-color)' }}>₹{stats.avgBalance || 0}</p>
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
                    Search User to Manage Wallet
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
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: 'var(--btn-primary)'
                                        }}>
                                            Balance: ₹{(user.walletBalance || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => openModal(user, 'deposit')}
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
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                            Deposit
                                        </button>
                                        <button
                                            onClick={() => openModal(user, 'withdraw')}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: '#dc3545',
                                                color: 'white',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                            Withdraw
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

            {/* Users Table - All Users */}
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: 'var(--text-color)', margin: 0 }}>All Users ({users.length})</h3>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Wallet Balance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.slice(0, 50).map(user => (
                            <tr key={user._id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.phone || '-'}</td>
                                <td style={{ fontWeight: '700', color: 'var(--btn-primary)' }}>
                                    ₹{(user.walletBalance || 0).toLocaleString()}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => openModal(user, 'deposit')}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: 'var(--btn-primary)',
                                                color: 'white',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + Deposit
                                        </button>
                                        <button
                                            onClick={() => openModal(user, 'withdraw')}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: '#dc3545',
                                                color: 'white',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            - Withdraw
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Deposit/Withdraw Modal */}
            {showModal && selectedUser && (
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
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        background: 'var(--card-bg)',
                        borderRadius: '16px',
                        padding: '30px',
                        maxWidth: '400px',
                        width: '90%'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '20px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={modalType === 'deposit' ? 'var(--btn-primary)' : '#dc3545'} strokeWidth="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                            </svg>
                            {modalType === 'deposit' ? 'Deposit to' : 'Withdraw from'} Wallet
                        </h2>

                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '5px' }}>User</p>
                            <p style={{ fontWeight: '600', color: 'var(--text-color)' }}>{selectedUser.name}</p>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Current Balance: ₹{(selectedUser.walletBalance || 0).toLocaleString()}</p>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Amount (₹)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-color)',
                                    fontSize: '16px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Description (optional)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Reason for transaction"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-color)',
                                    fontSize: '16px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleAction}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: modalType === 'deposit' ? 'var(--btn-primary)' : '#dc3545',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                {modalType === 'deposit' ? 'Deposit' : 'Withdraw'}
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
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
    );
};

export default ManageWallets;
