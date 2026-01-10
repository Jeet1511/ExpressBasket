import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.jsx';
import { hasPermission } from './ProtectedAdminRoute.jsx';
import './AdminLayout.css';

// Lucide-style SVG Icons
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const ProductIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const CategoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const OrderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const LogoutIcon = () => (
  <svg className="logout-icon-animated" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const RocketIcon = () => (
  <svg className="sidebar-logo-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

// Snowflake component for animation
const Snowfall = () => (
  <div className="snowfall">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="snowflake">❄</div>
    ))}
  </div>
);

// User Profile Icon
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation(); // For active route detection
  const { theme, toggleTheme } = useTheme();

  // Get current admin from localStorage
  const [admin, setAdmin] = React.useState(null);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('profile'); // profile, contributions, mail

  // Notification badges state
  const [notifications, setNotifications] = React.useState({
    orders: 0,
    support: 0,
    faceRequests: 0,
    users: 0,
    deliveryPartners: 0
  });

  // Contributions state
  const [contributions, setContributions] = React.useState([]);
  const [chartData, setChartData] = React.useState([]);
  const [loadingContributions, setLoadingContributions] = React.useState(false);
  const [allAdmins, setAllAdmins] = React.useState([]);
  const [selectedAdminId, setSelectedAdminId] = React.useState('');
  const [viewingAll, setViewingAll] = React.useState(false);

  // Date range for contributions (default last 7 days)
  const getDefaultDates = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  };
  const [dateRange, setDateRange] = React.useState(getDefaultDates());
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  // Profile picture state with crop modal
  const [uploadingPicture, setUploadingPicture] = React.useState(false);
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [cropImage, setCropImage] = React.useState(null);
  const [cropZoom, setCropZoom] = React.useState(1);
  const [cropPosition, setCropPosition] = React.useState({ x: 0, y: 0 });
  const fileInputRef = React.useRef(null);
  const cropCanvasRef = React.useRef(null);
  const cropImageRef = React.useRef(null);
  const isDragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 });

  // Handle file selection - open crop modal (or upload directly for GIFs)
  const handleFileSelect = async (file) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG, JPEG, PNG, and GIF files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // For GIFs, upload directly without cropping (Cloudinary handles server-side crop)
    if (file.type === 'image/gif') {
      setUploadingPicture(true);
      try {
        const formData = new FormData();
        formData.append('profilePicture', file);

        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/profile/picture`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        const data = await response.json();
        if (response.ok) {
          const updatedAdmin = { ...admin, profilePicture: data.profilePicture };
          setAdmin(updatedAdmin);
          localStorage.setItem('admin', JSON.stringify(updatedAdmin));
        } else {
          alert(data.message || 'Failed to upload');
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload GIF');
      } finally {
        setUploadingPicture(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return;
    }

    // For other images, open crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropImage(e.target.result);
      setCropZoom(1);
      setCropPosition({ x: 0, y: 0 });
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle mouse/touch events for dragging
  const handleCropMouseDown = (e) => {
    isDragging.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - cropPosition.x, y: clientY - cropPosition.y };
  };

  const handleCropMouseMove = (e) => {
    if (!isDragging.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setCropPosition({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y
    });
  };

  const handleCropMouseUp = () => {
    isDragging.current = false;
  };

  // Crop and upload the image
  const handleCropConfirm = async () => {
    if (!cropImageRef.current) return;

    setUploadingPicture(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 300; // Output size
      canvas.width = size;
      canvas.height = size;

      const img = cropImageRef.current;
      const scale = cropZoom;
      const imgWidth = img.naturalWidth * scale;
      const imgHeight = img.naturalHeight * scale;

      // Calculate crop area (center of 200x200 preview)
      const previewSize = 200;
      const offsetX = (previewSize / 2) + cropPosition.x - (imgWidth / 2);
      const offsetY = (previewSize / 2) + cropPosition.y - (imgHeight / 2);

      // Draw scaled and positioned image
      const drawX = (size / previewSize) * offsetX;
      const drawY = (size / previewSize) * offsetY;
      const drawW = (size / previewSize) * imgWidth;
      const drawH = (size / previewSize) * imgHeight;

      // Create circular clip
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const formData = new FormData();
      formData.append('profilePicture', blob, 'profile.jpg');

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/profile/picture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        const updatedAdmin = { ...admin, profilePicture: data.profilePicture };
        setAdmin(updatedAdmin);
        localStorage.setItem('admin', JSON.stringify(updatedAdmin));
        setShowCropModal(false);
        setCropImage(null);
      } else {
        alert(data.message || 'Failed to upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const cancelCrop = () => {
    setShowCropModal(false);
    setCropImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeProfilePicture = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/profile/picture`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const updatedAdmin = { ...admin, profilePicture: null };
        setAdmin(updatedAdmin);
        localStorage.setItem('admin', JSON.stringify(updatedAdmin));
      }
    } catch (error) {
      console.error('Remove error:', error);
    }
  };

  React.useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (e) {
        console.error('Failed to parse admin data');
      }
    }
  }, []);

  // Check if a route is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Fetch notification counts
  const fetchNotifications = React.useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Fetch pending orders count
      const ordersRes = await fetch(`${baseUrl}/orders/pending-count`, { headers }).catch(() => null);
      const ordersData = ordersRes?.ok ? await ordersRes.json() : { count: 0 };

      // Fetch pending support tickets count
      const supportRes = await fetch(`${baseUrl}/support/pending-count`, { headers }).catch(() => null);
      const supportData = supportRes?.ok ? await supportRes.json() : { count: 0 };

      // Fetch pending face registration requests (super admin only)
      const faceRes = await fetch(`${baseUrl}/admin/face-recognition/pending-count`, { headers }).catch(() => null);
      const faceData = faceRes?.ok ? await faceRes.json() : { count: 0 };

      setNotifications({
        orders: ordersData.count || 0,
        support: supportData.count || 0,
        faceRequests: faceData.count || 0,
        users: 0,
        deliveryPartners: 0
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Fetch notifications on mount and every 30 seconds
  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Clear admin session when navigating away from admin panel
  React.useEffect(() => {
    const handleLocationChange = () => {
      const currentPath = window.location.pathname;
      const hasAdminToken = localStorage.getItem('adminToken');

      // If user is on admin route but has no token (session was cleared), redirect to login
      if (currentPath.startsWith('/admin') && currentPath !== '/admin' && !hasAdminToken) {
        navigate('/admin', { replace: true });
        return;
      }

      // If user navigates away from /admin routes, clear session
      if (!currentPath.startsWith('/admin')) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminToken');
      }
    };

    // Check on mount and on popstate
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin');
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  // Get role display name
  const getRoleDisplay = (role) => {
    const roleNames = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'vendor': 'Vendor',
      'normal_viewer': 'Normal Viewer',
      'special_viewer': 'Special Viewer'
    };
    return roleNames[role] || role;
  };

  const openProfile = () => {
    setNewUsername(admin?.username || '');
    setActiveTab('profile');
    setEditingName(false);
    setShowProfileModal(true);
  };

  const handleUpdateName = async () => {
    if (!newUsername.trim()) return;

    // For now, just update locally (you can add API call later)
    const updatedAdmin = { ...admin, username: newUsername.trim() };
    setAdmin(updatedAdmin);
    localStorage.setItem('admin', JSON.stringify(updatedAdmin));
    setEditingName(false);
  };

  const fetchContributions = async (viewAll = false, adminIdFilter = '') => {
    setLoadingContributions(true);
    try {
      const token = localStorage.getItem('adminToken');
      let url = viewAll ? '/admin/contributions/all' : '/admin/contributions/me';
      const params = new URLSearchParams();
      if (adminIdFilter) params.append('adminId', adminIdFilter);
      if (dateRange.from) params.append('fromDate', dateRange.from);
      if (dateRange.to) params.append('toDate', dateRange.to);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setContributions(data.contributions || []);
      setChartData(data.chartData || []);
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
    } finally {
      setLoadingContributions(false);
    }
  };

  const fetchAllAdmins = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/contributions/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAllAdmins(data);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  };

  // Export contributions as CSV
  const exportToCSV = () => {
    if (contributions.length === 0) {
      alert('No contributions to export');
      return;
    }

    // Simple date format that Excel handles well
    const formatDateForExcel = (dateStr) => {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `${date} ${time}`;
    };

    const headers = ['DateTime', 'Action', 'Description', 'Admin'];
    const rows = contributions.map(c => [
      formatDateForExcel(c.createdAt),
      (c.action || 'N/A').replace(/_/g, ' '),
      (c.description || 'No description').replace(/,/g, ';').replace(/"/g, "'"),
      c.admin?.username || admin?.username || 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contributions_${dateRange.from}_to_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Export contributions as PDF (simple HTML to print/PDF)
  const exportToPDF = () => {
    if (contributions.length === 0) {
      alert('No contributions to export');
      return;
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleString('en-IN');
      } catch {
        return 'N/A';
      }
    };

    const printWindow = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Contributions Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px; }
          .info { color: #666; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #28a745; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 30px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Contributions Report</h1>
        <p class="info"><strong>Period:</strong> ${dateRange.from} to ${dateRange.to}</p>
        <p class="info"><strong>Total Activities:</strong> ${contributions.length}</p>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Action</th>
              <th>Description</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            ${contributions.map(c => `
              <tr>
                <td>${formatDate(c.createdAt)}</td>
                <td>${(c.action || 'N/A').replace(/_/g, ' ')}</td>
                <td>${c.description || 'No description'}</td>
                <td>${c.admin?.username || admin?.username || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="footer">Generated on ${new Date().toLocaleString('en-IN')}</p>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    setShowExportMenu(false);
  };

  // Fetch contributions when tab changes to contributions
  React.useEffect(() => {
    if (activeTab === 'contributions' && showProfileModal) {
      fetchContributions(viewingAll, selectedAdminId);
      if (admin?.role === 'super_admin') {
        fetchAllAdmins();
      }
    }
  }, [activeTab, showProfileModal, viewingAll, selectedAdminId]);

  return (
    <div className="admin-layout">
      {/* Snowfall Background */}
      <Snowfall />

      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>
            <RocketIcon />
            Admin Panel
          </h2>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard - accessible to all */}
          <Link to="/admin/dashboard" className={`nav-item ${isActive('/admin/dashboard') ? 'active' : ''}`}>
            <DashboardIcon />
            <span>Dashboard</span>
          </Link>

          {/* Products - requires manage_products permission */}
          {hasPermission(admin, 'manage_products') && (
            <Link to="/admin/products" className={`nav-item ${isActive('/admin/products') ? 'active' : ''}`}>
              <ProductIcon />
              <span>Products</span>
            </Link>
          )}

          {/* Categories - requires manage_categories permission */}
          {hasPermission(admin, 'manage_categories') && (
            <Link to="/admin/categories" className={`nav-item ${isActive('/admin/categories') ? 'active' : ''}`}>
              <CategoryIcon />
              <span>Categories</span>
            </Link>
          )}

          {/* Orders - requires manage_orders permission */}
          {hasPermission(admin, 'manage_orders') && (
            <Link to="/admin/orders" className={`nav-item ${isActive('/admin/orders') ? 'active' : ''}`}>
              <OrderIcon />
              <span>Orders</span>
              {notifications.orders > 0 && <span className="nav-badge">{notifications.orders}</span>}
            </Link>
          )}

          {/* Orders Map - accessible to all admins */}
          <Link to="/admin/orders-map" className={`nav-item ${isActive('/admin/orders-map') ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Orders Map</span>
          </Link>

          {/* Delivery Partners - accessible to all admins */}
          <Link to="/admin/delivery-partners" className={`nav-item ${isActive('/admin/delivery-partners') ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"></path>
            </svg>
            <span>Delivery Partners</span>
          </Link>

          {/* Delivery Issues - Cancellation requests from partners */}
          <Link to="/admin/delivery-issues" className={`nav-item ${isActive('/admin/delivery-issues') ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Delivery Issues</span>
          </Link>

          {/* Users - requires manage_users permission, hidden from normal_viewer, disabled for special_viewer */}
          {hasPermission(admin, 'manage_users') && admin?.role !== 'normal_viewer' && (
            admin?.role === 'special_viewer' ? (
              <div className="nav-item disabled" title="View only - No access to user data" onClick={(e) => e.preventDefault()}>
                <UsersIcon />
                <span>Users</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', opacity: 0.5 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            ) : (
              <Link to="/admin/users" className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                <UsersIcon />
                <span>Users</span>
              </Link>
            )
          )}

          {/* Support Requests - All admins can handle support */}
          <Link to="/admin/support" className={`nav-item ${isActive('/admin/support') ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
            </svg>
            <span>Support</span>
            {notifications.support > 0 && <span className="nav-badge">{notifications.support}</span>}
          </Link>

          {/* Manage Admins - requires manage_admins permission */}
          {hasPermission(admin, 'manage_admins') && (
            <Link to="/admin/admins" className={`nav-item ${isActive('/admin/admins') ? 'active' : ''}`}>
              <SettingsIcon />
              <span>Manage Admins</span>
            </Link>
          )}

          {/* Admin Directory - View all admins */}
          <Link to="/admin/directory" className={`nav-item ${isActive('/admin/directory') ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Admin Directory</span>
          </Link>

          {/* Face Recognition Management - Super Admin only */}
          {admin?.role === 'super_admin' && (
            <Link to="/admin/face-recognition" className={`nav-item ${isActive('/admin/face-recognition') ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
              <span>Face Recognition</span>
              {notifications.faceRequests > 0 && <span className="nav-badge">{notifications.faceRequests}</span>}
            </Link>
          )}

          {/* My Face ID - For regular admins to register/manage their own face */}
          {admin?.role !== 'super_admin' && (
            <Link to="/admin/request-face-registration" className={`nav-item ${isActive('/admin/request-face-registration') ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
              <span>My Face ID</span>
            </Link>
          )}

          {/* Memberships - requires manage_memberships permission */}
          {hasPermission(admin, 'manage_memberships') && (
            <Link to="/admin/memberships" className={`nav-item ${isActive('/admin/memberships') ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              <span>Memberships</span>
            </Link>
          )}

          {/* Wallets - requires manage_wallets permission */}
          {hasPermission(admin, 'manage_wallets') && (
            <Link to="/admin/wallets" className={`nav-item ${isActive('/admin/wallets') ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <span>Wallets</span>
            </Link>
          )}

          {/* Mail Center - Super Admin & Special Viewer */}
          {(admin?.role === 'super_admin' || admin?.role === 'special_viewer') && (
            <Link to="/admin/mails" className={`nav-item ${isActive('/admin/mails') ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Mail Center</span>
            </Link>
          )}

          {/* Tracking Toggle - Show for all admins (will check super admin in the page itself) */}
          <Link to="/admin/tracking-toggle" className={`nav-item ${isActive('/admin/tracking-toggle') ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Tracking Toggle</span>
          </Link>

          {/* Server - Super Admin & Special Viewer */}
          {(admin?.role === 'super_admin' || admin?.role === 'special_viewer') && (
            <Link to="/admin/server" className={`nav-item server-nav-item ${isActive('/admin/server') ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
              <span>Server</span>
            </Link>
          )}

          <button onClick={handleLogout} className="nav-item logout-btn-animated">
            <svg className="logout-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>
            <RocketIcon />
            Express Basket Admin
          </h1>

          <div className="header-right">
            {/* Admin Profile Section */}
            {admin && (
              <div className="admin-profile" onClick={openProfile} style={{ cursor: 'pointer' }} title="Click to view profile">
                <div
                  className="profile-avatar"
                  style={admin.profilePicture ? {
                    backgroundImage: `url(${admin.profilePicture})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  } : {}}
                >
                  {!admin.profilePicture && (admin.username ? admin.username.charAt(0).toUpperCase() : 'A')}
                </div>
                <div className="profile-info">
                  <span className="profile-name">{admin.username || 'Admin'}</span>
                  <span className="profile-email">{admin.email}</span>
                </div>
                <span className={`profile-role role-${admin.role}`}>
                  {getRoleDisplay(admin.role)}
                </span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              className="admin-theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <span className="sun-icon">☀️</span>
              <span className="moon-icon">🌙</span>
              <span className="toggle-ball"></span>
            </button>
          </div>
        </header>
        <div className="admin-content">
          {children}
        </div>
      </main>

      {/* Profile Modal */}
      {
        showProfileModal && (
          <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
              <div className="profile-modal-header">
                <h2>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Admin Profile
                </h2>
                <button className="close-btn" onClick={() => setShowProfileModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Profile Tabs */}
              <div className="profile-tabs">
                <button
                  className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile
                </button>
                <button
                  className={`profile-tab ${activeTab === 'contributions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('contributions')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  Contributions
                </button>
                <button
                  className={`profile-tab ${activeTab === 'mail' ? 'active' : ''}`}
                  onClick={() => setActiveTab('mail')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Mail
                </button>
              </div>

              <div className="profile-modal-content">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="profile-tab-content">
                    <div className="profile-card">
                      {/* Profile Picture with Upload */}
                      <div className="profile-avatar-container">
                        <div
                          className="profile-avatar-large"
                          style={{
                            backgroundImage: admin?.profilePicture ? `url(${admin.profilePicture})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {!admin?.profilePicture && (admin?.username ? admin.username.charAt(0).toUpperCase() : 'A')}
                          <div className="avatar-overlay">
                            {uploadingPicture ? (
                              <div className="upload-spinner"></div>
                            ) : (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                              </svg>
                            )}
                          </div>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileSelect(e.target.files[0])}
                        />
                        {admin?.profilePicture && (
                          <button className="remove-avatar-btn" onClick={removeProfilePicture}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="profile-details">
                        <div className="profile-field">
                          <label>Name</label>
                          {editingName ? (
                            <div className="edit-field">
                              <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                autoFocus
                              />
                              <button className="save-btn" onClick={handleUpdateName}>Save</button>
                              <button className="cancel-btn" onClick={() => setEditingName(false)}>Cancel</button>
                            </div>
                          ) : (
                            <div className="field-value">
                              <span>{admin?.username || 'Admin'}</span>
                              <button className="edit-icon-btn" onClick={() => setEditingName(true)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="profile-field">
                          <label>Email</label>
                          <div className="field-value">{admin?.email}</div>
                        </div>

                        <div className="profile-field">
                          <label>Role</label>
                          <span className={`role-badge role-${admin?.role}`}>
                            {getRoleDisplay(admin?.role)}
                          </span>
                        </div>

                        <div className="profile-field">
                          <label>Permissions</label>
                          <div className="permissions-list">
                            {admin?.permissions?.map((perm, idx) => (
                              <span key={idx} className="permission-tag">{perm.replace(/_/g, ' ')}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contributions Tab */}
                {activeTab === 'contributions' && (
                  <div className="profile-tab-content">
                    <div className="contributions-section">
                      {/* Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ margin: 0 }}>{viewingAll ? 'All Contributions' : 'Your Contributions'}</h3>
                        {admin?.role === 'super_admin' && (
                          <button
                            onClick={() => { setViewingAll(!viewingAll); setSelectedAdminId(''); }}
                            style={{
                              padding: '8px 16px',
                              background: viewingAll ? 'var(--btn-primary)' : 'var(--nav-link-hover)',
                              color: viewingAll ? 'white' : 'var(--text-color)',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            {viewingAll ? 'View Mine' : 'View All Admins'}
                          </button>
                        )}
                      </div>

                      {/* Date Range & Filter Row */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        marginBottom: '16px',
                        padding: '14px',
                        background: 'var(--nav-link-hover)',
                        borderRadius: '10px',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From:</label>
                          <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--input-bg)',
                              color: 'var(--text-color)',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To:</label>
                          <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--input-bg)',
                              color: 'var(--text-color)',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        {viewingAll && (
                          <select
                            value={selectedAdminId}
                            onChange={(e) => setSelectedAdminId(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--input-bg)',
                              color: 'var(--text-color)',
                              fontSize: '12px'
                            }}
                          >
                            <option value="">All Admins</option>
                            {allAdmins.map(a => (
                              <option key={a._id} value={a._id}>{a.username}</option>
                            ))}
                          </select>
                        )}

                        <button
                          onClick={() => fetchContributions(viewingAll, selectedAdminId)}
                          style={{
                            padding: '8px 16px',
                            background: 'var(--btn-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          Apply Filter
                        </button>

                        {/* Export Dropdown */}
                        <div style={{ position: 'relative', marginLeft: 'auto' }}>
                          <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Export
                          </button>
                          {showExportMenu && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              marginTop: '4px',
                              background: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                              zIndex: 100,
                              minWidth: '140px',
                              overflow: 'hidden'
                            }}>
                              <button
                                onClick={exportToPDF}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-color)',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                                onMouseOver={(e) => e.target.style.background = 'var(--nav-link-hover)'}
                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                Export as PDF
                              </button>
                              <button
                                onClick={exportToCSV}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-color)',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                                onMouseOver={(e) => e.target.style.background = 'var(--nav-link-hover)'}
                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                Export as Excel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {loadingContributions ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p>
                      ) : (
                        <>
                          {/* Simple Bar Chart with horizontal scroll */}
                          <div style={{
                            background: 'var(--nav-link-hover)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                          }}>
                            <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>Activity Chart</p>
                            <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '8px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                height: '100px',
                                gap: '6px',
                                minWidth: chartData.length > 7 ? `${chartData.length * 45}px` : '100%'
                              }}>
                                {chartData.map((day, idx) => {
                                  const maxCount = Math.max(...chartData.map(d => d.count), 1);
                                  const height = (day.count / maxCount) * 100;
                                  return (
                                    <div key={idx} style={{
                                      flex: chartData.length <= 7 ? 1 : 'none',
                                      width: chartData.length > 7 ? '40px' : 'auto',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center'
                                    }}>
                                      <span style={{ fontSize: '10px', color: 'var(--text-color)', marginBottom: '4px' }}>{day.count}</span>
                                      <div style={{
                                        width: '100%',
                                        height: `${height}%`,
                                        minHeight: '4px',
                                        background: 'linear-gradient(180deg, var(--btn-primary), #764ba2)',
                                        borderRadius: '4px 4px 0 0',
                                        transition: 'height 0.3s ease'
                                      }}></div>
                                      <span style={{ fontSize: '8px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap' }}>
                                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                            Total: {contributions.length} activities
                          </p>

                          {/* Activity List */}
                          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {contributions.length === 0 ? (
                              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>No activities yet</p>
                            ) : (
                              contributions.slice(0, 15).map((c, idx) => (
                                <div key={idx} style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '12px',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  marginBottom: '8px',
                                  background: 'var(--nav-link-hover)'
                                }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--btn-primary), #764ba2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                    </svg>
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {c.description}
                                    </p>
                                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                      {new Date(c.createdAt).toLocaleString('en-IN')}
                                      {c.admin?.username && viewingAll && ` • ${c.admin.username}`}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Mail Tab */}
                {activeTab === 'mail' && (
                  <div className="profile-tab-content">
                    <div className="mail-section">
                      <h3>Admin Mail</h3>
                      {admin?.role === 'super_admin' ? (
                        <div className="mail-actions">
                          <p>As a Super Admin, you can send mails to users from the Mail Center.</p>
                          <Link
                            to="/admin/mails"
                            className="mail-center-btn"
                            onClick={() => setShowProfileModal(false)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                              <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            Go to Mail Center
                          </Link>
                        </div>
                      ) : (
                        <div className="mail-placeholder">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                          <p>Mail features are available for Super Admins only.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Image Crop Modal */}
      {
        showCropModal && cropImage && (
          <div className="crop-modal-overlay" onClick={cancelCrop}>
            <div className="crop-modal" onClick={e => e.stopPropagation()}>
              <div className="crop-modal-header">
                <h3>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                    <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path>
                    <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path>
                  </svg>
                  Crop Profile Picture
                </h3>
                <button className="close-btn" onClick={cancelCrop}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="crop-preview-container">
                <p className="crop-hint">Drag to reposition • Use slider to zoom</p>
                <div
                  className="crop-preview"
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  onMouseLeave={handleCropMouseUp}
                  onTouchStart={handleCropMouseDown}
                  onTouchMove={handleCropMouseMove}
                  onTouchEnd={handleCropMouseUp}
                >
                  <img
                    ref={cropImageRef}
                    src={cropImage}
                    alt="Crop preview"
                    style={{
                      transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom})`,
                      cursor: 'grab'
                    }}
                    draggable={false}
                  />
                  <div className="crop-circle-overlay"></div>
                </div>
              </div>

              <div className="crop-controls">
                <label>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                />
                <label>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </label>
              </div>

              <div className="crop-actions">
                <button className="crop-cancel-btn" onClick={cancelCrop}>Cancel</button>
                <button className="crop-confirm-btn" onClick={handleCropConfirm} disabled={uploadingPicture}>
                  {uploadingPicture ? (
                    <>
                      <div className="btn-spinner"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Apply & Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AdminLayout;