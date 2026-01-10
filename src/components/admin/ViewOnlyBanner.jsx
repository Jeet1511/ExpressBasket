import React from 'react';
import { Eye, Lock } from 'lucide-react';

/**
 * ViewOnlyBanner - Displays a banner for viewer roles indicating read-only mode
 */
const ViewOnlyBanner = ({ role }) => {
    const isSpecialViewer = role === 'special_viewer';

    return (
        <div style={{
            background: isSpecialViewer
                ? 'linear-gradient(135deg, #ec4899, #8b5cf6)'
                : 'linear-gradient(135deg, #f59e0b, #ef4444)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
        }}>
            <Eye size={20} />
            <span style={{ fontWeight: '600', fontSize: '14px' }}>
                View-Only Mode — You can browse but cannot make any changes
            </span>
            <Lock size={16} style={{ opacity: 0.8 }} />
        </div>
    );
};

export default ViewOnlyBanner;
