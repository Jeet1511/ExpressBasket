import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import './PartnerAuth.css';

const PartnerAuth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });
    const [registerData, setRegisterData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        vehicleType: 'bike',
        vehicleNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('/partner/login', loginData);

            localStorage.setItem('partnerToken', response.data.token);
            localStorage.setItem('partnerInfo', JSON.stringify(response.data.partner));

            navigate('/partner/dashboard');
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Login failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post('/partner/register', {
                name: registerData.name,
                email: registerData.email,
                phone: registerData.phone,
                password: registerData.password,
                vehicle: {
                    type: registerData.vehicleType,
                    number: registerData.vehicleNumber
                }
            });

            await Swal.fire({
                icon: 'success',
                title: 'Application Submitted!',
                html: `
                    <p>Your delivery partner application has been submitted.</p>
                    <p><strong>What's next?</strong></p>
                    <ul style="text-align: left; margin: 20px auto; max-width: 300px;">
                        <li>Admin will review your application</li>
                        <li>You'll be notified via email</li>
                        <li>Once approved, you can log in</li>
                    </ul>
                `,
                confirmButtonText: 'OK',
                confirmButtonColor: '#10b981'
            });

            setIsLogin(true);
            setRegisterData({
                name: '',
                email: '',
                phone: '',
                password: '',
                vehicleType: 'bike',
                vehicleNumber: ''
            });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'Registration failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="partner-auth-container">
            <div className="partner-auth-left">
                <div className="partner-brand">
                    <div className="brand-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 17h4V5H2v12h3" />
                            <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
                            <path d="M14 17h1" />
                            <circle cx="7.5" cy="17.5" r="2.5" />
                            <circle cx="17.5" cy="17.5" r="2.5" />
                        </svg>
                    </div>
                    <h1>Express Basket</h1>
                    <p>Delivery Partner Portal</p>
                </div>
                <div className="partner-features">
                    <div className="feature-item">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <span>Earn competitive pay per delivery</span>
                    </div>
                    <div className="feature-item">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Flexible working hours</span>
                    </div>
                    <div className="feature-item">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>Deliver in your local area</span>
                    </div>
                    <div className="feature-item">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>Insurance coverage provided</span>
                    </div>
                </div>
            </div>

            <div className="partner-auth-right">
                <div className="partner-auth-card">
                    <div className="auth-tabs">
                        <button
                            className={`auth-tab ${isLogin ? 'active' : ''}`}
                            onClick={() => setIsLogin(true)}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            Sign In
                        </button>
                        <button
                            className={`auth-tab ${!isLogin ? 'active' : ''}`}
                            onClick={() => setIsLogin(false)}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            Register
                        </button>
                    </div>

                    {isLogin ? (
                        <form onSubmit={handleLogin} className="auth-form">
                            <h2>Welcome Back</h2>
                            <p className="form-subtitle">Sign in to access your dashboard</p>

                            <div className="input-group">
                                <div className="input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={loginData.email}
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                    placeholder="Email address"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <div className="input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    placeholder="Password"
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="btn-spinner"></div>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="auth-form">
                            <h2>Become a Partner</h2>
                            <p className="form-subtitle">Join our delivery network today</p>

                            <div className="input-group">
                                <div className="input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={registerData.name}
                                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                    placeholder="Full name"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <div className="input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={registerData.email}
                                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                    placeholder="Email address"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <div className="input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </div>
                                <input
                                    type="tel"
                                    value={registerData.phone}
                                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                    placeholder="Phone number"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <div className="input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={registerData.password}
                                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                    placeholder="Create password"
                                    required
                                    minLength="6"
                                />
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <select
                                        value={registerData.vehicleType}
                                        onChange={(e) => setRegisterData({ ...registerData, vehicleType: e.target.value })}
                                    >
                                        <option value="bike">Bike</option>
                                        <option value="scooter">Scooter</option>
                                        <option value="car">Car</option>
                                        <option value="van">Van</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <input
                                        type="text"
                                        value={registerData.vehicleNumber}
                                        onChange={(e) => setRegisterData({ ...registerData, vehicleNumber: e.target.value })}
                                        placeholder="Vehicle number"
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="btn-spinner"></div>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Submit Application
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </>
                                )}
                            </button>

                            <div className="info-box">
                                <div className="info-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                    <span>Application reviewed within 24 hours</span>
                                </div>
                                <div className="info-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    <span>Email notification upon approval</span>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PartnerAuth;
