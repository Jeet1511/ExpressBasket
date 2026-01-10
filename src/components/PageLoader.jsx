import React from 'react';
import { ShoppingCart } from 'lucide-react';
import './PageLoader.css';

const PageLoader = ({ message = 'Loading...' }) => {
    return (
        <div className="page-loader">
            <div className="loader-content">
                <div className="loader-icon-container">
                    <div className="loader-ring"></div>
                    <div className="loader-ring delay-1"></div>
                    <div className="loader-ring delay-2"></div>
                    <ShoppingCart className="loader-icon" size={32} />
                </div>
                <div className="loader-text">
                    <span className="loader-brand">Express Basket</span>
                    <span className="loader-message">{message}</span>
                </div>
                <div className="loader-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    );
};

export default PageLoader;
