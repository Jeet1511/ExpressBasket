import axios from 'axios';

// Configure axios defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

axios.defaults.baseURL = API_BASE_URL;

// Show errors in a user-friendly way without exposing file paths
const showError = (status, endpoint, errorData) => {
  const message = `API Error ${status}: ${endpoint}`;
  const details = errorData?.message || 'Request failed';

  // Log to console for debugging (only errors)
  console.error(`❌ ${status} ${endpoint}`, details);

  // Optional: Show toast notification (if you have a toast system)
  // You can uncomment this if you want visual error notifications
  // toast.error(`${message}\n${details}`);
};

// Add request interceptor (silent for success)
axios.interceptors.request.use(
  (config) => {
    // Silent - no logging for requests
    return config;
  },
  (error) => {
    console.error('❌ Request failed to send');
    return Promise.reject(error);
  }
);

// Add response interceptor (log only errors)
axios.interceptors.response.use(
  (response) => {
    // Silent for successful responses
    // You can monitor these in the Network tab
    return response;
  },
  (error) => {
    const endpoint = error.config?.url?.replace(/^.*\/api/, '/api') || 'unknown';
    const status = error.response?.status || 'Network Error';
    const errorData = error.response?.data;

    // Show error details
    showError(status, endpoint, errorData);

    return Promise.reject(error);
  }
);

export default axios;