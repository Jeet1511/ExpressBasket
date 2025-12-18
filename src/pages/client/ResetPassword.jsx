import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../../utils/axios.js';
import './ResetPassword.css';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        verifyToken();
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await axios.get(`/verify-reset-token/${token}`);
            setTokenValid(true);
            setUser(response.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired reset link');
            setTokenValid(false);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setResetting(true);
        setError('');

        try {
            await axios.post('/reset-password', {
                token,
                action: 'reset',
                newPassword
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setResetting(false);
        }
    };

    const getPasswordStrength = () => {
        if (!newPassword) return { text: '', color: '', width: '0%' };
        if (newPassword.length < 6) return { text: 'Too short', color: '#dc3545', width: '25%' };
        if (newPassword.length < 8) return { text: 'Weak', color: '#ffc107', width: '50%' };
        if (newPassword.length < 12) return { text: 'Good', color: '#28a745', width: '75%' };
        return { text: 'Strong', color: '#20c997', width: '100%' };
    };

    const strength = getPasswordStrength();

    if (loading) {
        return (
            <div className="reset-password-container">
                <div className="reset-password-card">
                    <div className="loading-spinner"></div>
                    <p>Verifying reset link...</p>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="reset-password-container">
                <div className="reset-password-card error-card">
                    <div className="error-icon">
                        <svg className="animated-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h2>Invalid Reset Link</h2>
                    <p className="error-text">{error}</p>
                    <div className="error-reasons">
                        <p>This could happen if:</p>
                        <ul>
                            <li>The link has expired (valid for 1 hour)</li>
                            <li>The link has already been used</li>
                            <li>The link is invalid</li>
                        </ul>
                    </div>
                    <Link to="/forgot-password" className="retry-btn">
                        Request New Reset Link
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="reset-password-container">
                <div className="reset-password-card success-card">
                    <div className="success-icon">
                        <svg className="animated-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <h2>Password Reset Successful!</h2>
                    <p>Your password has been updated successfully.</p>
                    <p className="redirect-text">Redirecting to login page...</p>
                    <Link to="/login" className="login-btn">
                        Go to Login Now
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="reset-password-container">
            <div className="reset-password-card">
                <div className="header-icon">
                    <svg className="animated-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <path d="M9 12l2 2 4-4"></path>
                    </svg>
                </div>
                <h2>Reset Your Password</h2>
                <p className="user-info">Setting new password for: <strong>{user?.email}</strong></p>

                <form onSubmit={handleResetPassword}>
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                disabled={resetting}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {newPassword && (
                            <div className="password-strength">
                                <div className="strength-bar">
                                    <div
                                        className="strength-fill"
                                        style={{ width: strength.width, backgroundColor: strength.color }}
                                    ></div>
                                </div>
                                <span style={{ color: strength.color }}>{strength.text}</span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            disabled={resetting}
                        />
                    </div>

                    <button type="submit" className="submit-btn" disabled={resetting}>
                        {resetting ? (
                            <>
                                <span className="spinner"></span>
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </button>
                </form>

                <div className="footer-links">
                    <Link to="/login">← Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
