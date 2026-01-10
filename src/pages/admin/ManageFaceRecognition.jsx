import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import FaceCapture from '../../components/admin/FaceCapture';
import './ManageFaceRecognition.css';
import { Users, CheckCircle, XCircle, Trash2, Upload, Clock, UserPlus } from 'lucide-react';

const ManageFaceRecognition = () => {
    const [activeTab, setActiveTab] = useState('pending'); // pending, registered, addFace
    const [pendingRequests, setPendingRequests] = useState([]);
    const [registeredFaces, setRegisteredFaces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);

    // Add Face tab states
    const [allAdmins, setAllAdmins] = useState([]);
    const [selectedAdmin, setSelectedAdmin] = useState('');
    const [faceDescriptor, setFaceDescriptor] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPendingRequests();
        } else if (activeTab === 'registered') {
            fetchRegisteredFaces();
        } else if (activeTab === 'addFace') {
            fetchAllAdmins();
        }
    }, [activeTab]);

    const fetchPendingRequests = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/face-recognition/requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingRequests(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch pending requests');
        } finally {
            setLoading(false);
        }
    };

    const fetchRegisteredFaces = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/face-recognition/registered', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRegisteredFaces(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch registered faces');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllAdmins = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/admins', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllAdmins(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch admins');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFace = async () => {
        if (!selectedAdmin) {
            setError('Please select an admin');
            return;
        }
        if (!faceDescriptor) {
            setError('Please capture face data');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/admin/face-recognition/update/${selectedAdmin}`, {
                faceDescriptor
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Face data added successfully!');
            setSelectedAdmin('');
            setFaceDescriptor(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add face data');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (requestId) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/admin/face-recognition/approve/${requestId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Face registration approved successfully!');
            fetchPendingRequests();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve request');
        }
    };

    const handleReject = async (requestId) => {
        if (!rejectionReason.trim()) {
            setError('Please provide a rejection reason');
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/admin/face-recognition/reject/${requestId}`,
                { reason: rejectionReason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Face registration rejected');
            setRejectionReason('');
            setSelectedRequest(null);
            fetchPendingRequests();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject request');
        }
    };

    const handleDeleteFace = async (adminId, adminName) => {
        if (!window.confirm(`Are you sure you want to delete face data for ${adminName}? They will need to request approval again.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`/admin/face-recognition/${adminId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Face data deleted successfully');
            fetchRegisteredFaces();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete face data');
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="manage-face-recognition">
            <div className="mfr-header">
                <div className="mfr-title">
                    <Users size={32} />
                    <div>
                        <h1>Face Recognition Management</h1>
                        <p>Manage face registration requests and registered faces</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mfr-tabs">
                <button
                    className={`mfr-tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    <Clock size={18} />
                    Pending Requests
                    {pendingRequests.length > 0 && (
                        <span className="badge">{pendingRequests.length}</span>
                    )}
                </button>
                <button
                    className={`mfr-tab ${activeTab === 'registered' ? 'active' : ''}`}
                    onClick={() => setActiveTab('registered')}
                >
                    <CheckCircle size={18} />
                    Registered Faces
                    {registeredFaces.length > 0 && (
                        <span className="badge">{registeredFaces.length}</span>
                    )}
                </button>
                <button
                    className={`mfr-tab ${activeTab === 'addFace' ? 'active' : ''}`}
                    onClick={() => setActiveTab('addFace')}
                >
                    <UserPlus size={18} />
                    Add Face
                </button>
            </div>

            {/* Messages */}
            {error && (
                <div className="mfr-message error">
                    <XCircle size={20} />
                    {error}
                </div>
            )}
            {success && (
                <div className="mfr-message success">
                    <CheckCircle size={20} />
                    {success}
                </div>
            )}

            {/* Content */}
            <div className="mfr-content">
                {loading ? (
                    <div className="mfr-loading">
                        <div className="spinner"></div>
                        <p>Loading...</p>
                    </div>
                ) : (
                    <>
                        {/* Pending Requests Tab */}
                        {activeTab === 'pending' && (
                            <div className="mfr-pending">
                                {pendingRequests.length === 0 ? (
                                    <div className="mfr-empty">
                                        <Clock size={48} />
                                        <h3>No Pending Requests</h3>
                                        <p>All face registration requests have been processed</p>
                                    </div>
                                ) : (
                                    <div className="mfr-grid">
                                        {pendingRequests.map((request) => (
                                            <div key={request._id} className="mfr-request-card">
                                                <div className="mfr-card-header">
                                                    <div className="mfr-admin-avatar">
                                                        {request.adminName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="mfr-admin-info">
                                                        <h3>{request.adminName}</h3>
                                                        <p>{request.adminEmail}</p>
                                                        <span className="mfr-role-badge">{request.adminRole}</span>
                                                    </div>
                                                </div>

                                                <div className="mfr-request-details">
                                                    <div className="mfr-detail-item">
                                                        <Clock size={16} />
                                                        <span>Requested: {formatDate(request.requestedAt)}</span>
                                                    </div>
                                                </div>

                                                <div className="mfr-card-actions">
                                                    <button
                                                        className="mfr-btn approve"
                                                        onClick={() => handleApprove(request._id)}
                                                    >
                                                        <CheckCircle size={18} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="mfr-btn reject"
                                                        onClick={() => setSelectedRequest(request._id)}
                                                    >
                                                        <XCircle size={18} />
                                                        Reject
                                                    </button>
                                                </div>

                                                {/* Rejection Modal */}
                                                {selectedRequest === request._id && (
                                                    <div className="mfr-rejection-modal">
                                                        <h4>Rejection Reason</h4>
                                                        <textarea
                                                            value={rejectionReason}
                                                            onChange={(e) => setRejectionReason(e.target.value)}
                                                            placeholder="Enter reason for rejection..."
                                                            rows="3"
                                                        />
                                                        <div className="mfr-modal-actions">
                                                            <button
                                                                className="mfr-btn-sm cancel"
                                                                onClick={() => {
                                                                    setSelectedRequest(null);
                                                                    setRejectionReason('');
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                className="mfr-btn-sm reject"
                                                                onClick={() => handleReject(request._id)}
                                                            >
                                                                Confirm Rejection
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Registered Faces Tab */}
                        {activeTab === 'registered' && (
                            <div className="mfr-registered">
                                {registeredFaces.length === 0 ? (
                                    <div className="mfr-empty">
                                        <Users size={48} />
                                        <h3>No Registered Faces</h3>
                                        <p>No admins have face recognition enabled yet</p>
                                    </div>
                                ) : (
                                    <div className="mfr-table-container">
                                        <table className="mfr-table">
                                            <thead>
                                                <tr>
                                                    <th>Admin</th>
                                                    <th>Role</th>
                                                    <th>Registered</th>
                                                    <th>Last Used</th>
                                                    <th>Approved By</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {registeredFaces.map((admin) => (
                                                    <tr key={admin._id}>
                                                        <td>
                                                            <div className="mfr-table-admin">
                                                                <div
                                                                    className="mfr-table-avatar"
                                                                    style={admin.profilePicture ? {
                                                                        backgroundImage: `url(${admin.profilePicture})`,
                                                                        backgroundSize: 'cover',
                                                                        backgroundPosition: 'center'
                                                                    } : {}}
                                                                >
                                                                    {!admin.profilePicture && admin.username.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="mfr-table-name">{admin.username}</div>
                                                                    <div className="mfr-table-email">{admin.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="mfr-role-badge">{admin.role}</span>
                                                        </td>
                                                        <td>{formatDate(admin.faceRecognition.registeredAt)}</td>
                                                        <td>
                                                            {admin.faceRecognition.lastUsed
                                                                ? formatDate(admin.faceRecognition.lastUsed)
                                                                : 'Never'}
                                                        </td>
                                                        <td>
                                                            {admin.faceRecognition.approvedBy?.username || 'N/A'}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="mfr-btn-icon delete"
                                                                onClick={() => handleDeleteFace(admin._id, admin.username)}
                                                                title="Delete face data"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Add Face Tab */}
                        {activeTab === 'addFace' && (
                            <div className="mfr-add-face">
                                <div className="add-face-card">
                                    <h2>Add Face for Admin</h2>
                                    <p>Select an admin and capture their face data to enable face recognition</p>

                                    <div className="admin-selector">
                                        <label htmlFor="admin-select">Select Admin:</label>
                                        <select
                                            id="admin-select"
                                            value={selectedAdmin}
                                            onChange={(e) => setSelectedAdmin(e.target.value)}
                                            className="admin-select-dropdown"
                                        >
                                            <option value="">-- Choose an admin --</option>
                                            {allAdmins.map((admin) => (
                                                <option key={admin._id} value={admin._id}>
                                                    {admin.username} ({admin.email}) - {admin.role}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedAdmin && (
                                        <div className="face-capture-section">
                                            <h3>Capture Face</h3>
                                            <FaceCapture
                                                onFaceDetected={(descriptor) => setFaceDescriptor(descriptor)}
                                                onError={(err) => setError(err)}
                                                mode="register"
                                            />

                                            <div className="add-face-actions">
                                                <button
                                                    className="mfr-btn-large submit"
                                                    onClick={handleAddFace}
                                                    disabled={!faceDescriptor || submitting}
                                                >
                                                    {submitting ? 'Adding...' : 'Add Face Data'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!selectedAdmin && (
                                        <div className="mfr-empty">
                                            <UserPlus size={48} />
                                            <h3>Select an Admin</h3>
                                            <p>Choose an admin from the dropdown to add their face data</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ManageFaceRecognition;
