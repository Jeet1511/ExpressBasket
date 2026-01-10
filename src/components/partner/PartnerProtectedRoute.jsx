import React from 'react';
import { Navigate } from 'react-router-dom';

const PartnerProtectedRoute = ({ children }) => {
    const partnerToken = localStorage.getItem('partnerToken');

    if (!partnerToken) {
        return <Navigate to="/partner" replace />;
    }

    return children;
};

export default PartnerProtectedRoute;
