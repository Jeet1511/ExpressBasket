import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import FaceCapture from '../../components/admin/FaceCapture';
import './RequestFaceRegistration.css';
import { Camera, CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft, RefreshCw, Trash2, Edit3 } from 'lucide-react';

const RequestFaceRegistration = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: info, 2: capture, 3: result
    const [faceDescriptor, setFaceDescriptor] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStatus, setCurrentStatus] = useState(null);
    const [requestType, setRequestType] = useState('add'); // 'add', 'update', 'delete'
    const [isActionInProgress, setIsActionInProgress] = useState(false); // Track update/delete flow
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Delete confirmation dialog

    useEffect(() => {
        checkCurrentStatus();
    }, []);

    const checkCurrentStatus = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/face-recognition/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentStatus(response.data);
        } catch (err) {
            console.error('Error checking status:', err);
        }
    };

    const handleFaceDetected = (descriptor) => {
        setFaceDescriptor(descriptor);
    };

    // NEW: Handle multi-angle capture completion
    const handleMultiAngleComplete = (descriptorsArray) => {
        console.log(`✅ Captured ${descriptorsArray.length} angles for face recognition`);
        // Use the first (center) descriptor as primary, store all for enhanced recognition
        const primaryDescriptor = descriptorsArray[0]?.descriptor;
        const additionalDescriptors = descriptorsArray.slice(1).map(d => d.descriptor);

        setFaceDescriptor({
            primary: primaryDescriptor,
            additional: additionalDescriptors,
            isMultiAngle: true
        });

        // Auto-advance to submit
        setStep(3);
        submitMultiAngleRequest(primaryDescriptor, additionalDescriptors);
    };

    const submitMultiAngleRequest = async (primary, additional) => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/admin/face-recognition/request', {
                faceDescriptor: primary,
                additionalDescriptors: additional,
                requestType: requestType,
                isMultiAngle: true
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus('success');
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const handleCapture = () => {
        if (!faceDescriptor && requestType !== 'delete') {
            setError('No face detected. Please ensure your face is visible.');
            return;
        }
        setStep(3);
        submitRequest();
    };

    const submitRequest = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/admin/face-recognition/request', {
                faceDescriptor: requestType === 'delete' ? null : faceDescriptor,
                requestType: requestType
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus('success');
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const handleError = (errorMsg) => {
        setError(errorMsg);
    };

    // Direct delete face data (no approval needed)
    const handleDeleteFace = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete('/admin/face-recognition/delete-my-face', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Success - close modal and refresh status
            setShowDeleteConfirm(false);
            setCurrentStatus({ ...currentStatus, enabled: false });
            setStatus('success');
            setStep(3);
            setIsActionInProgress(true);
            setRequestType('delete');

            // Show success message
            alert('Face recognition data has been deleted successfully!');

            // Refresh status from server
            await checkCurrentStatus();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete face data');
            alert('Failed to delete: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const startRequest = (type) => {
        setRequestType(type);
        setIsActionInProgress(true); // Mark that we're in action mode
        setStatus(null); // Reset status
        setError(''); // Clear errors
        if (type === 'delete') {
            setStep(3);
            submitDeleteRequest();
        } else {
            setStep(2);
        }
    };

    const submitDeleteRequest = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/admin/face-recognition/request', {
                faceDescriptor: null,
                requestType: 'delete'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus('success');
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.message || 'Failed to submit delete request');
        } finally {
            setLoading(false);
        }
    };

    const getRequestTypeInfo = () => {
        switch (requestType) {
            case 'update':
                return {
                    title: 'Update Face Data',
                    description: 'Capture a new face image to replace your existing face data.',
                    successMessage: 'Your face update request has been sent to the super admin for approval.'
                };
            case 'delete':
                return {
                    title: 'Delete Face Data',
                    description: 'Remove your face recognition capability.',
                    successMessage: 'Your face deletion request has been sent to the super admin for approval.'
                };
            default:
                return {
                    title: 'Add Face Recognition',
                    description: 'Enable face recognition login for your account.',
                    successMessage: 'Your face registration request has been sent to the super admin for approval.'
                };
        }
    };

    // If already has face recognition enabled AND not in action mode - Show management options
    if (currentStatus?.enabled && !isActionInProgress) {
        return (
            <div className="request-face-registration">
                <div className="rfr-header">
                    <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                        <ArrowLeft size={20} />
                        Back
                    </button>
                    <h1>Manage My Face Recognition</h1>
                </div>

                <div className="rfr-container">
                    <div className="rfr-manage-card">
                        <div className="manage-status">
                            <CheckCircle size={48} className="status-icon success" />
                            <div>
                                <h2>Face Recognition Active</h2>
                                <p>Your face recognition is enabled and working</p>
                            </div>
                        </div>

                        <div className="manage-actions">
                            <div className="action-card" onClick={() => startRequest('update')}>
                                <div className="action-icon update">
                                    <RefreshCw size={24} />
                                </div>
                                <div className="action-info">
                                    <h3>Update Face</h3>
                                    <p>Replace your current face data with a new capture</p>
                                </div>
                            </div>

                            <div className="action-card delete-card" onClick={() => setShowDeleteConfirm(true)}>
                                <div className="action-icon delete">
                                    <Trash2 size={24} />
                                </div>
                                <div className="action-info">
                                    <h3>Delete Face</h3>
                                    <p>Remove face recognition from your account</p>
                                </div>
                            </div>
                        </div>

                        <div className="manage-note">
                            <AlertCircle size={18} />
                            <span>Updates require super admin approval. Delete is instant.</span>
                        </div>

                        {/* Delete Confirmation Modal */}
                        {showDeleteConfirm && (
                            <div className="delete-confirm-overlay">
                                <div className="delete-confirm-modal">
                                    <div className="confirm-icon">
                                        <Trash2 size={48} />
                                    </div>
                                    <h3>Are you sure?</h3>
                                    <p>This will permanently remove your face recognition data. You won't be able to login with face ID until you register again.</p>
                                    <div className="confirm-actions">
                                        <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                                            Cancel
                                        </button>
                                        <button className="btn-danger" onClick={handleDeleteFace} disabled={loading}>
                                            {loading ? 'Deleting...' : 'Yes, Delete My Face'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // If has pending request
    if (currentStatus?.requestStatus === 'pending') {
        return (
            <div className="request-face-registration">
                <div className="rfr-container">
                    <div className="rfr-status-card pending">
                        <Clock size={64} className="status-icon pulse" />
                        <h2>Request Pending</h2>
                        <p>Your face registration request is awaiting super admin approval.</p>
                        <p className="status-date">
                            Requested: {new Date(currentStatus.requestedAt).toLocaleDateString()}
                        </p>
                        <button className="btn-secondary" onClick={() => navigate('/admin/dashboard')}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If request was rejected
    if (currentStatus?.requestStatus === 'rejected') {
        return (
            <div className="request-face-registration">
                <div className="rfr-container">
                    <div className="rfr-status-card rejected">
                        <XCircle size={64} className="status-icon" />
                        <h2>Request Rejected</h2>
                        <p>Your previous face registration request was rejected.</p>
                        {currentStatus.rejectionReason && (
                            <div className="rejection-reason">
                                <AlertCircle size={20} />
                                <span>{currentStatus.rejectionReason}</span>
                            </div>
                        )}
                        <button className="btn-primary" onClick={() => {
                            setCurrentStatus({ ...currentStatus, requestStatus: 'none' });
                        }}>
                            Submit New Request
                        </button>
                        <button className="btn-secondary" onClick={() => navigate('/admin/dashboard')}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="request-face-registration">
            <div className="rfr-header">
                <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                    <ArrowLeft size={20} />
                    Back
                </button>
                <h1>{getRequestTypeInfo().title}</h1>
                <div className="step-indicator">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                    <div className="step-line"></div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
                </div>
            </div>

            <div className="rfr-container">
                {/* Step 1: Information */}
                {step === 1 && (
                    <div className="rfr-step">
                        <div className="info-card">
                            <Camera size={48} className="info-icon" />
                            <h2>Face Recognition Setup</h2>
                            <p>Enable face recognition login for faster and more secure access to the admin panel.</p>

                            <div className="info-list">
                                <div className="info-item">
                                    <CheckCircle size={20} />
                                    <span>Your face data will be encrypted and stored securely</span>
                                </div>
                                <div className="info-item">
                                    <CheckCircle size={20} />
                                    <span>Super admin approval is required before activation</span>
                                </div>
                                <div className="info-item">
                                    <CheckCircle size={20} />
                                    <span>You can request changes anytime</span>
                                </div>
                                <div className="info-item">
                                    <CheckCircle size={20} />
                                    <span>Password login will remain available as backup</span>
                                </div>
                            </div>

                            <div className="requirements">
                                <h3>Requirements:</h3>
                                <ul>
                                    <li>Good lighting conditions</li>
                                    <li>Clear view of your face</li>
                                    <li>Camera access permission</li>
                                    <li>Stable internet connection</li>
                                </ul>
                            </div>

                            <button className="btn-primary btn-large" onClick={() => setStep(2)}>
                                Continue to Face Capture
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Face Capture */}
                {step === 2 && (
                    <div className="rfr-step">
                        <div className="capture-card">
                            <h2>{requestType === 'update' ? 'Capture New Face' : 'Capture Your Face'}</h2>
                            <p>Position your face in the frame and ensure good lighting</p>

                            <FaceCapture
                                onFaceDetected={handleFaceDetected}
                                onMultiAngleComplete={handleMultiAngleComplete}
                                onError={handleError}
                                mode="register"
                            />

                            {error && (
                                <div className="error-message">
                                    <XCircle size={20} />
                                    {error}
                                </div>
                            )}

                            <div className="capture-actions">
                                <button className="btn-secondary" onClick={() => setStep(1)}>
                                    Back
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={handleCapture}
                                    disabled={!faceDescriptor}
                                >
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Result */}
                {step === 3 && (
                    <div className="rfr-step">
                        {loading ? (
                            <div className="result-card">
                                <div className="spinner-large"></div>
                                <h2>Submitting Request...</h2>
                                <p>Please wait while we process your request</p>
                            </div>
                        ) : status === 'success' ? (
                            <div className="result-card success">
                                <CheckCircle size={64} className="status-icon success-icon" />
                                <h2>Request Submitted!</h2>
                                <p>{getRequestTypeInfo().successMessage}</p>
                                <p className="info-text">You will be notified once your request is reviewed.</p>
                                <button className="btn-primary" onClick={() => navigate('/admin/dashboard')}>
                                    Back to Dashboard
                                </button>
                            </div>
                        ) : (
                            <div className="result-card error">
                                <XCircle size={64} className="status-icon error-icon" />
                                <h2>Submission Failed</h2>
                                <p>{error}</p>
                                <div className="error-actions">
                                    <button className="btn-secondary" onClick={() => setStep(requestType === 'delete' ? 1 : 2)}>
                                        Try Again
                                    </button>
                                    <button className="btn-primary" onClick={() => navigate('/admin/dashboard')}>
                                        Back to Dashboard
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestFaceRegistration;
