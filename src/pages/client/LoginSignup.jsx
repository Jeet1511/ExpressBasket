import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  padding: 20px;
  position: relative;
`;

const AuthBox = styled.div`
  background: var(--card-bg);
  border-radius: 20px;
  box-shadow: 0 15px 35px var(--shadow-dark);
  width: 100%;
  max-width: 400px;
  padding: 40px;
  position: relative;
`;

const ThemeToggle = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  background: var(--card-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10;
  
  &:hover {
    transform: scale(1.1);
    border-color: var(--btn-primary);
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: var(--text-color);
  }
`;

const AuthTabs = styled.div`
  display: flex;
  margin-bottom: 30px;
  border-bottom: 2px solid var(--border-light);
`;

const AuthTab = styled.button`
  flex: 1;
  padding: 15px;
  background: none;
  border: none;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.active ? '#667eea' : 'var(--text-secondary)'};
  border-bottom: 2px solid ${props => props.active ? '#667eea' : 'transparent'};
  cursor: pointer;
  transition: all 0.3s;
  text-shadow: ${props => props.active ? '0 0 10px rgba(102, 126, 234, 0.5)' : 'none'};
  
  &:hover {
    color: #667eea;
    text-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
  }
`;

const AuthTitle = styled.h2`
  text-align: center;
  margin-bottom: 30px;
  color: white;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 12px 20px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
`;

const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  position: relative;
`;

const FormLabel = styled.label`
  display: inline-block;
  margin-bottom: 8px;
  color: white;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 5px 14px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  font-size: 13px;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--input-border);
  border-radius: 10px;
  font-size: 16px;
  transition: all 0.3s ease;
  background-color: var(--input-bg) !important;
  color: var(--input-text) !important;
  
  &::placeholder {
    color: #667eea !important;
    opacity: 0.8;
    font-weight: 500;
  }
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
  }
`;


const SubmitButton = styled.button`
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 10px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    background: linear-gradient(135deg, #a0a0a0, #808080);
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const ErrorMessage = styled.div`
  color: var(--btn-danger);
  font-size: 14px;
  margin-top: 5px;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s;
  opacity: 1;
  z-index: 10;
  
  &:hover {
    color: #667eea;
  }
  
  i {
    font-size: 18px;
  }
`;

const PasswordInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const ForgotPasswordLink = styled(Link)`
  display: block;
  text-align: center;
  margin-top: 15px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
  
  &:hover {
    color: #667eea;
    text-decoration: underline;
  }
`;

const LoginSignup = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { login: userLogin } = useUser();

  const validateForm = () => {
    const newErrors = {};

    if (!isLogin) {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }

      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login using UserContext
        const result = await userLogin(formData.email, formData.password);

        if (!result.success) {
          throw new Error(result.message);
        }

        Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          text: 'Welcome back to Basket',
          timer: 1500,
          showConfirmButton: false
        });

        navigate('/');
      } else {
        // Signup
        await axios.post('/signup', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone
        });

        Swal.fire({
          icon: 'success',
          title: 'Account Created!',
          text: 'Account created successfully',
          timer: 1500,
          showConfirmButton: false
        });

        setIsLogin(true);
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: ''
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  return (
    <AuthContainer>
      <AuthBox>
        <ThemeToggle onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          )}
        </ThemeToggle>
        <AuthTabs>
          <AuthTab
            active={isLogin}
            onClick={() => setIsLogin(true)}
          >
            Login
          </AuthTab>
          <AuthTab
            active={!isLogin}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </AuthTab>
        </AuthTabs>

        <AuthTitle>
          {isLogin ? 'Login to Your Account' : 'Create Account'}
        </AuthTitle>

        <AuthForm onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <FormGroup>
                <FormLabel>Full Name</FormLabel>
                <FormInput
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
                {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
              </FormGroup>

              <FormGroup>
                <FormLabel>Phone Number</FormLabel>
                <FormInput
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter 10-digit phone number"
                />
                {errors.phone && <ErrorMessage>{errors.phone}</ErrorMessage>}
              </FormGroup>
            </>
          )}

          <FormGroup>
            <FormLabel>Email</FormLabel>
            <FormInput
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
            />
            {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <FormLabel>Password</FormLabel>
            <PasswordInputWrapper>
              <FormInput
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                style={{ paddingRight: '45px' }}
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </PasswordToggle>
            </PasswordInputWrapper>
            {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
          </FormGroup>

          {!isLogin && (
            <FormGroup>
              <FormLabel>Confirm Password</FormLabel>
              <PasswordInputWrapper>
                <FormInput
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  style={{ paddingRight: '45px' }}
                />
                <PasswordToggle
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </PasswordToggle>
              </PasswordInputWrapper>
              {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword}</ErrorMessage>}
            </FormGroup>
          )}

          <SubmitButton type="submit" disabled={loading}>
            {loading ? (
              <i className="expDel_spinner fa-spin"></i>
            ) : isLogin ? (
              'Login'
            ) : (
              'Create Account'
            )}
          </SubmitButton>

          {isLogin && (
            <ForgotPasswordLink to="/forgot-password">
              Forgot Password?
            </ForgotPasswordLink>
          )}
        </AuthForm>
      </AuthBox>
    </AuthContainer>
  );
};

export default LoginSignup;