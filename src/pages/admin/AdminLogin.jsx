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
    // Mouse position is now updated directly via CSS variables in useEffect (no state needed)
    const [focusedField, setFocusedField] = useState(null);
    const [redirecting, setRedirecting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const containerRef = useRef(null);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();



    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate inputs first
        if (!formData.email || !formData.password) {
            setIsScanning(true);
            setLoading(true);
            setError('');

            // Wait 1 second while showing animation, then show error
            setTimeout(() => {
                setIsScanning(false);
                setLoading(false);
                setError('Please enter both email and password');
            }, 1000);
            return;
        }

        // Start scanning animation
        setIsScanning(true);
        setLoading(true);
        setError('');

        // Wait 1 second to show the scanning animation
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const response = await axios.post('/admin/login', formData);
            localStorage.setItem('adminToken', response.data.token);
            localStorage.setItem('admin', JSON.stringify(response.data.admin));
            setIsAdmin(true);
            setRedirecting(true);
            // Navigate after 1 second of animation
            navigate('/admin/dashboard', { replace: true });
        } catch (err) {
            console.error('Admin login error:', err);
            const message = err?.response?.data?.message || err.message || 'Login failed';
            setIsScanning(false);
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
        >
            {/* Animated Background */}
            <div className="animated-bg">
                {/* Cyber Grid */}
                <div className="cyber-grid"></div>

                {/* Matrix Rain Effect */}
                <div className="matrix-rain">
                    {[...Array(25)].map((_, i) => (
                        <div key={i} className="matrix-column" style={{
                            left: `${(i / 25) * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${8 + Math.random() * 8}s`
                        }}>
                            {[...Array(15)].map((_, j) => (
                                <span key={j} style={{ animationDelay: `${j * 0.1}s` }}>
                                    {String.fromCharCode(0x30A0 + Math.random() * 96)}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Gradient Orbs */}
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>

                {/* Circuit Lines */}
                <svg className="circuit-lines" viewBox="0 0 1920 1080" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="50%" stopColor="#28a745" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>
                    <path className="circuit-path path-1" d="M0,200 L300,200 L350,150 L600,150 L650,200 L900,200" />
                    <path className="circuit-path path-2" d="M1920,300 L1600,300 L1550,350 L1300,350 L1250,300 L1000,300" />
                    <path className="circuit-path path-3" d="M0,600 L200,600 L250,650 L500,650 L550,600 L800,600" />
                    <path className="circuit-path path-4" d="M1920,800 L1700,800 L1650,750 L1400,750 L1350,800 L1100,800" />
                </svg>

                {/* Hexagon Pattern */}
                <div className="hex-pattern">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="hex" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 4}s`
                        }}></div>
                    ))}
                </div>

                {/* Data Streams */}
                <div className="data-streams">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="data-stream" style={{
                            left: `${10 + i * 12}%`,
                            animationDelay: `${i * 0.5}s`
                        }}></div>
                    ))}
                </div>

                {/* Floating Shapes */}
                <div className="floating-shapes">
                    {[...Array(16)].map((_, i) => (
                        <div key={i} className={`shape shape-${i % 4}`} style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${15 + Math.random() * 10}s`
                        }}></div>
                    ))}
                </div>

                {/* Particles */}
                <div className="particle-field">
                    {[...Array(40)].map((_, i) => (
                        <div key={i} className="particle" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}></div>
                    ))}
                </div>

                {/* Glitch Overlay */}
                <div className="glitch-overlay"></div>
            </div>



            {/* Glass Card */}
            <div className={`admin-login-card ${isScanning ? 'scanning' : ''}`}>
                {/* Animated Border - Only show when scanning */}
                {isScanning && <div className="card-border-glow"></div>}

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
