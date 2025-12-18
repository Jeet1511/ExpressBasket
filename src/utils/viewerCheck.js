// Centralized viewer restriction utility
// Import this in any admin page that needs to hide buttons for viewers

export const isViewOnly = (admin) => {
  if (!admin) return false;
  return admin.role === 'normal_viewer' || admin.role === 'special_viewer';
};

export const getAdminFromStorage = () => {
  try {
    const adminData = localStorage.getItem('admin');
    return adminData ? JSON.parse(adminData) : null;
  } catch (error) {
    console.error('Error parsing admin data:', error);
    return null;
  }
};

// Use this in your components:
// import { isViewOnly, getAdminFromStorage } from '../../utils/viewerCheck';
// const admin = getAdminFromStorage();
// const viewOnly = isViewOnly(admin);
// Then wrap buttons: {!viewOnly && <button>Edit</button>}

export default { isViewOnly, getAdminFromStorage };
