import React from 'react';
import { Navigate } from 'react-router-dom';

// Access Denied Component
const AccessDenied = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center'
    }}>
        <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--danger-color, #ef4444)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: '1.5rem' }}
        >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
        <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: 'var(--text-color, #333)',
            marginBottom: '0.5rem'
        }}>
            Access Denied
        </h1>
        <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-secondary, #666)',
            maxWidth: '400px',
            lineHeight: '1.6'
        }}>
            You don't have permission to access this section.
            Please contact your Super Admin if you need access.
        </p>
        <a
            href="/admin/dashboard"
            style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--primary-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%))',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'transform 0.2s, box-shadow 0.2s'
            }}
        >
            Go to Dashboard
        </a>
    </div>
);

/**
 * Helper function to check if admin has required permission
 * @param {Object} admin - Admin object with role and permissions
 * @param {string} requiredPermission - The permission needed to access the route
 * @returns {boolean} - Whether admin has access
 */
export const hasPermission = (admin, requiredPermission) => {
    if (!admin) return false;

    // Super admin has access to everything
    if (admin.role === 'super_admin' || admin.role === 'superadmin') return true;

    // Special viewer can SEE everything (but not modify)
    if (admin.role === 'special_viewer') return true;

    // If no specific permission required, allow access
    if (!requiredPermission) return true;

    // Check if has view_everything permission (can see all sections)
    if (admin.permissions?.includes('view_everything')) return true;

    // Check if admin has the required permission (manage_*)
    if (admin.permissions?.includes(requiredPermission)) return true;

    // Also check for view permission (view_*)
    const viewPermission = requiredPermission.replace('manage_', 'view_');
    if (admin.permissions?.includes(viewPermission)) return true;

    return false;
};

/**
 * Helper function to check if admin can modify data (not a viewer)
 * @param {Object} admin - Admin object with role
 * @returns {boolean} - Whether admin can modify data
 */
export const canModify = (admin) => {
    if (!admin) return false;
    const viewerRoles = ['normal_viewer', 'special_viewer'];
    return !viewerRoles.includes(admin.role);
};

/**
 * Protected Route Component for Admin Panel
 * Checks authentication and permissions before rendering children
 */
const ProtectedAdminRoute = ({ children, requiredPermission }) => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('admin');

    // Not logged in - redirect to login
    if (!adminToken) {
        return <Navigate to="/admin" replace />;
    }

    // Parse admin data
    let admin = null;
    try {
        admin = adminData ? JSON.parse(adminData) : null;
    } catch (e) {
        console.error('Failed to parse admin data');
        return <Navigate to="/admin" replace />;
    }

    // Check permission
    if (!hasPermission(admin, requiredPermission)) {
        return <AccessDenied />;
    }

    // Has access - render children
    return children;
};

export default ProtectedAdminRoute;
