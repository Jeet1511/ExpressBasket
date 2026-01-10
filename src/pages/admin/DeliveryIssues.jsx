import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import './DeliveryIssues.css';

const DeliveryIssues = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/cancellation-requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
        } catch (error) {
            console.error('Error fetching cancellation requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        const result = await Swal.fire({
            title: 'Approve Cancellation?',
            html: `
                <p style="margin-bottom: 15px;">This will cancel the order and release the delivery partner.</p>
                <div style="text-align: left; margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #64748b;">
                        Partner Payout Amount (₹0 - ₹30)
                    </label>
                    <input type="number" id="payout-amount" class="swal2-input" 
                        min="0" max="30" value="0" step="1"
                        style="width: 100%; margin: 0; padding: 10px; font-size: 16px;">
                    <small style="color: #94a3b8;">Enter 0 if partner should not receive payment</small>
                </div>
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #64748b;">
                        Admin Notes (optional)
                    </label>
                    <textarea id="admin-notes" class="swal2-textarea" 
                        placeholder="Add any notes about this decision..."
                        style="width: 100%; margin: 0; min-height: 80px;"></textarea>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Approve',
            preConfirm: () => {
                const payoutAmount = document.getElementById('payout-amount').value;
                const adminNotes = document.getElementById('admin-notes').value;
                return { payoutAmount: Number(payoutAmount) || 0, adminNotes };
            }
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('adminToken');
                const response = await axios.post('/admin/cancellation-requests/approve', {
                    requestId,
                    adminNotes: result.value.adminNotes || '',
                    payoutAmount: result.value.payoutAmount
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire('Approved!', response.data.message || 'The order has been cancelled.', 'success');
                fetchRequests();
            } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'Failed to approve', 'error');
            }
        }
    };

    const handleReject = async (requestId) => {
        const result = await Swal.fire({
            title: 'Reject Cancellation Request?',
            text: 'The delivery partner will need to complete this delivery.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Reject',
            input: 'textarea',
            inputLabel: 'Reason for Rejection',
            inputPlaceholder: 'Explain why this request is being rejected...',
            inputValidator: (value) => {
                if (!value) return 'Please provide a reason';
            }
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('adminToken');
                await axios.post('/admin/cancellation-requests/reject', {
                    requestId,
                    adminNotes: result.value
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                Swal.fire('Rejected', 'The partner has been notified to continue delivery.', 'info');
                fetchRequests();
            } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'Failed to reject', 'error');
            }
        }
    };

    const filteredRequests = requests.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'approved': return '#10b981';
            case 'rejected': return '#dc2626';
            default: return '#64748b';
        }
    };

    if (loading) {
        return (
            <div className="delivery-issues-page">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading cancellation requests...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="delivery-issues-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Delivery Issues
                    </h1>
                    <p>Review cancellation requests from delivery partners</p>
                </div>
                <div className="header-stats">
                    <div className="stat-pill pending">
                        <span>{requests.filter(r => r.status === 'pending').length}</span>
                        <span>Pending</span>
                    </div>
                </div>
            </div>

            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    Pending ({requests.filter(r => r.status === 'pending').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
                    onClick={() => setFilter('approved')}
                >
                    Approved ({requests.filter(r => r.status === 'approved').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setFilter('rejected')}
                >
                    Rejected ({requests.filter(r => r.status === 'rejected').length})
                </button>
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({requests.length})
                </button>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <h3>No {filter === 'all' ? '' : filter} requests</h3>
                    <p>Cancellation requests from partners will appear here</p>
                </div>
            ) : (
                <div className="requests-list">
                    {filteredRequests.map(request => (
                        <div key={request._id} className="request-card">
                            <div className="request-header">
                                <div className="request-info">
                                    <span className="order-id">Order #{request.order?._id?.slice(-6) || 'N/A'}</span>
                                    <span
                                        className="status-badge"
                                        style={{ background: `${getStatusColor(request.status)}20`, color: getStatusColor(request.status) }}
                                    >
                                        {request.status.toUpperCase()}
                                    </span>
                                </div>
                                <span className="request-date">
                                    {new Date(request.createdAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>

                            <div className="request-details">
                                <div className="issue-detail-row">
                                    <span className="label">Partner</span>
                                    <span className="value">{request.partnerName}</span>
                                </div>
                                <div className="issue-detail-row">
                                    <span className="label">Customer</span>
                                    <span className="value">{request.order?.userId?.name || 'Unknown'}</span>
                                </div>
                                <div className="issue-detail-row">
                                    <span className="label">Amount</span>
                                    <span className="value amount">₹{request.order?.totalAmount?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>

                            <div className="reason-box">
                                <span className="reason-label">Partner's Reason:</span>
                                <p className="reason-text">{request.reason}</p>
                            </div>

                            {request.adminReview?.adminNotes && (
                                <div className="admin-notes">
                                    <span className="notes-label">Admin Notes:</span>
                                    <p className="notes-text">{request.adminReview.adminNotes}</p>
                                </div>
                            )}

                            {request.status === 'pending' && (
                                <div className="request-actions">
                                    <button
                                        className="action-btn approve"
                                        onClick={() => handleApprove(request._id)}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Approve Cancellation
                                    </button>
                                    <button
                                        className="action-btn reject"
                                        onClick={() => handleReject(request._id)}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DeliveryIssues;
