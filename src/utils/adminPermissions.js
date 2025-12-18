// Helper function to check if admin has view-only access
export const isViewOnly = (admin) => {
    return admin?.role === 'normal_viewer' || admin?.role === 'special_viewer';
};

// Helper function to check if admin can view a specific section
export const canView = (admin, section) => {
    if (!admin) return false;

    // Super admin can view everything
    if (admin.role === 'super_admin' || admin.role === 'superadmin') return true;

    // Check view_everything permission
    if (admin.permissions?.includes('view_everything')) return true;

    // Check specific view permission
    const viewPermission = `view_${section}`;
    return admin.permissions?.includes(viewPermission);
};

// Helper function to check if admin can edit
export const canEdit = (admin, section) => {
    if (!admin) return false;

    // Viewers cannot edit
    if (isViewOnly(admin)) return false;

    // Super admin can edit everything
    if (admin.role === 'super_admin' || admin.role === 'superadmin') return true;

    // Check manage permission
    const managePermission = `manage_${section}`;
    return admin.permissions?.includes(managePermission);
};

export default { isViewOnly, canView, canEdit };
