import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../../utils/axios';
import './ViewBill.css';

const ViewBill = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const billRef = useRef(null);

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/order/public/${orderId}`);
            setOrder(response.data);
            setError('');
        } catch (err) {
            setError('Order not found or has been removed');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="view-bill-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading invoice...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="view-bill-container">
                <div className="error-state">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <h2>Invoice Not Found</h2>
                    <p>{error || 'The requested invoice could not be found.'}</p>
                    <Link to="/" className="shop-more-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        Shop Now
                    </Link>
                </div>
            </div>
        );
    }

    const subtotal = order.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0;
    const deliveryCharge = subtotal > 500 ? 0 : 50;
    const total = order.totalAmount || (subtotal + deliveryCharge);

    const getStatusClass = (status) => {
        if (status === 'delivered') return 'status-delivered';
        if (status === 'cancelled') return 'status-cancelled';
        return 'status-pending';
    };

    return (
        <div className="view-bill-container">
            <div className="bill-page" ref={billRef}>
                {/* Header Actions */}
                <div className="bill-actions no-print">
                    <button onClick={handlePrint} className="print-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download / Print
                    </button>
                    <Link to="/" className="shop-more-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        Shop More
                    </Link>
                </div>

                {/* Bill Content */}
                <div className="bill-content">
                    {/* Header */}
                    <div className="bill-header">
                        <div className="company-info">
                            <h1>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                Express Basket
                            </h1>
                            <p>Your Trusted Online Grocery Store</p>
                            <p>expressbasket.help@gmail.com</p>
                        </div>
                        <div className="invoice-info">
                            <h2>INVOICE</h2>
                            <p className="order-id">Order #{order._id?.slice(-6).toUpperCase()}</p>
                            <p className="order-date">{new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <span className={`status-badge ${getStatusClass(order.status)}`}>
                                {order.status}
                            </span>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="customer-info">
                        <h3>Bill To</h3>
                        <p className="customer-name">{order.userId?.name || 'Customer'}</p>
                        <p>{order.userId?.email}</p>
                        <p>{order.userId?.phone}</p>
                        {order.shippingAddress && (
                            <p className="address">
                                {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                            </p>
                        )}
                    </div>

                    {/* Items Table */}
                    <table className="items-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items?.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{item.productId?.name || item.name || 'Product'}</td>
                                    <td>{item.quantity || 1}</td>
                                    <td>₹{(item.price || item.productId?.price || 0).toFixed(2)}</td>
                                    <td className="item-total">₹{((item.price || item.productId?.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="totals-section">
                        <div className="total-row">
                            <span>Subtotal:</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="total-row">
                            <span>Delivery:</span>
                            <span>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}</span>
                        </div>
                        {order.discount > 0 && (
                            <div className="total-row discount">
                                <span>Discount:</span>
                                <span>-₹{order.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="total-row grand-total">
                            <span>Grand Total:</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="payment-info">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>
                            Payment: {order.paymentMethod === 'wallet' ? 'Paid via Wallet' : order.paymentMethod === 'friend_wallet' ? "Paid via Friend's Wallet" : 'Cash on Delivery'}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="bill-footer">
                        <p>Thank you for shopping with Express Basket!</p>
                        <p>This is a computer-generated invoice and does not require a signature.</p>
                    </div>
                </div>

                {/* Shop More CTA */}
                <div className="cta-section no-print">
                    <h3>Want to order more groceries?</h3>
                    <p>Browse our wide selection of fresh produce, dairy, and more!</p>
                    <Link to="/" className="cta-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        Start Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ViewBill;
