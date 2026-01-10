import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import './AdminLogin.css';
import { useTheme } from '../../context/ThemeContext';
import FaceRecognitionLogin from '../../components/admin/FaceRecognitionLogin';
import { Shield, Mail, Lock, Eye, EyeOff, ScanFace, ArrowLeft, Sun, Moon, Sparkles } from 'lucide-react';

const AdminLogin = ({ setIsAdmin }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showFaceLogin, setShowFaceLogin] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [focusedField, setFocusedField] = useState(null);
    const [redirecting, setRedirecting] = useState(false);
    const containerRef = useRef(null);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    // Track mouse movement for reactive effects
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setMousePosition({ x, y });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/admin/login', formData);
            localStorage.setItem('adminToken', response.data.token);
            localStorage.setItem('admin', JSON.stringify(response.data.admin));
            setIsAdmin(true);
            setRedirecting(true);
            // Immediately navigate without showing loading state
            navigate('/admin/dashboard', { replace: true });
        } catch (err) {
            console.error('Admin login error:', err);
            const message = err?.response?.data?.message || err.message || 'Login failed';
            setError(message);
            setLoading(false);
        }
    };

    const handleFaceLoginSuccess = (data) => {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('admin', JSON.stringify(data.admin));
        setIsAdmin(true);
        setShowFaceLogin(false);
        setRedirecting(true);
        navigate('/admin/dashboard', { replace: true });
    };

    // Hide everything when redirecting to prevent flash
    if (redirecting) {
        return null;
    }

    return (
        <div
            className="admin-login-container"
            ref={containerRef}
            style={{
                '--mouse-x': `${mousePosition.x}%`,
                '--mouse-y': `${mousePosition.y}%`
            }}
        >
            {/* Animated Background */}
            <div className="animated-bg">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
                <div className="floating-shapes">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className={`shape shape-${i % 4}`} style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${15 + Math.random() * 10}s`
                        }}></div>
                    ))}
                </div>
                <div className="particle-field">
                    {[...Array(50)].map((_, i) => (
                        <div key={i} className="particle" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}></div>
                    ))}
                </div>
            </div>

            {/* Mouse Following Glow */}
            <div className="mouse-glow"></div>

            {/* Glass Card */}
            <div className="admin-login-card">
                {/* Animated Border */}
                <div className="card-border-glow"></div>

                {/* Theme Toggle */}
                <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
                    <div className="toggle-track">
                        <Sun size={14} className="sun-icon" />
                        <Moon size={14} className="moon-icon" />
                        <div className="toggle-thumb"></div>
                    </div>
                </button>

                {/* Logo Section */}
                <div className="logo-section">
                    <div className="logo-container">
                        <div className="logo-ring ring-1"></div>
                        <div className="logo-ring ring-2"></div>
                        <div className="logo-ring ring-3"></div>
                        <div className="logo-icon">
                            <Shield size={36} strokeWidth={1.5} />
                        </div>
                    </div>
                    <div className="logo-text">
                        <h1>Express Basket</h1>
                        <p>
                            <Sparkles size={14} />
                            Administrator Portal
                            <Sparkles size={14} />
                        </p>
                    </div>
                </div>

                {/* Login Form */}
                <form className="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-alert">
                            <div className="error-icon">!</div>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={`input-group ${focusedField === 'email' ? 'focused' : ''} ${formData.email ? 'has-value' : ''}`}>
                        <div className="input-icon">
                            <Mail size={20} />
                        </div>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                            required
                            autoComplete="email"
                        />
                        <label>Email Address</label>
                        <div className="input-highlight"></div>
                    </div>

                    <div className={`input-group ${focusedField === 'password' ? 'focused' : ''} ${formData.password ? 'has-value' : ''}`}>
                        <div className="input-icon">
                            <Lock size={20} />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                            required
                            autoComplete="current-password"
                        />
                        <label>Password</label>
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <div className="input-highlight"></div>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        <span className="btn-bg"></span>
                        <span className="btn-content">
                            <Shield size={18} />
                            Access Dashboard
                        </span>
                    </button>

                    <div className="divider">
                        <span>or continue with</span>
                    </div>

                    <button type="button" className="face-login-button" onClick={() => setShowFaceLogin(true)}>
                        <span className="btn-bg"></span>
                        <span className="btn-content">
                            <ScanFace size={20} />
                            Face Recognition
                        </span>
                    </button>
                </form>

                <FaceRecognitionLogin
                    isOpen={showFaceLogin}
                    onClose={() => setShowFaceLogin(false)}
                    onLoginSuccess={handleFaceLoginSuccess}
                />

                <a href="/" className="back-link">
                    <ArrowLeft size={16} />
                    <span>Back to Store</span>
                </a>
            </div>
        </div>
    );
};

export default AdminLogin;
