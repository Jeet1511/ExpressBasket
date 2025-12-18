import React, { useRef } from 'react';

const OrderBill = ({ order, user, onClose }) => {
    const billRef = useRef(null);

    const handleDownload = () => {
        const printWindow = window.open('', '_blank');
        const billContent = billRef.current.innerHTML;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - Order #${order._id.slice(-6).toUpperCase()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; color: #333; }
          .bill-container { max-width: 800px; margin: 0 auto; }
          .bill-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #667eea; }
          .company-info h1 { font-size: 28px; color: #667eea; margin-bottom: 5px; }
          .company-info p { color: #666; font-size: 13px; }
          .invoice-details { text-align: right; }
          .invoice-details h2 { font-size: 24px; color: #333; margin-bottom: 10px; }
          .invoice-details p { color: #666; font-size: 13px; margin-bottom: 3px; }
          .customer-info { margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .customer-info h3 { font-size: 14px; color: #667eea; margin-bottom: 10px; text-transform: uppercase; }
          .customer-info p { font-size: 14px; margin-bottom: 3px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .items-table th { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px; text-align: left; font-size: 13px; }
          .items-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
          .items-table tr:nth-child(even) { background: #f8f9fa; }
          .totals { margin-left: auto; width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .totals-row.total { font-weight: bold; font-size: 18px; color: #667eea; border-top: 2px solid #667eea; padding-top: 12px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
          .status-delivered { background: #d4edda; color: #155724; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-cancelled { background: #f8d7da; color: #721c24; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${billContent}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
        printWindow.document.close();
    };

    const getStatusClass = (status) => {
        if (status === 'delivered') return 'status-delivered';
        if (status === 'cancelled') return 'status-cancelled';
        return 'status-pending';
    };

    const subtotal = order.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0;
    const deliveryCharge = subtotal > 500 ? 0 : 50;
    const total = order.totalAmount || (subtotal + deliveryCharge);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

                {/* Action Buttons */}
                <div style={{
                    position: 'sticky',
                    top: 0,
                    background: 'white',
                    padding: '15px 20px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 10
                }}>
                    <h3 style={{ margin: 0, color: '#333' }}>Invoice</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleDownload}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: '#f1f1f1',
                                color: '#333',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Bill Content */}
                <div ref={billRef} className="bill-container" style={{ padding: '30px' }}>
                    {/* Header */}
                    <div className="bill-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '30px',
                        paddingBottom: '20px',
                        borderBottom: '2px solid #667eea'
                    }}>
                        <div className="company-info">
                            <h1 style={{ fontSize: '28px', color: '#667eea', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                Express Basket
                            </h1>
                            <p style={{ color: '#666', fontSize: '13px' }}>Your Trusted Online Grocery Store</p>
                            <p style={{ color: '#666', fontSize: '13px' }}>expressbasket.help@gmail.com</p>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            {/* QR Code */}
                            <div style={{ textAlign: 'center' }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent('https://expressbasket.vercel.app/bill/' + order._id)}`}
                                    alt="Order QR Code"
                                    style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px solid #667eea' }}
                                />
                                <p style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Scan for details</p>
                            </div>
                            <div className="invoice-details" style={{ textAlign: 'right' }}>
                                <h2 style={{ fontSize: '24px', color: '#333', marginBottom: '10px' }}>INVOICE</h2>
                                <p style={{ color: '#666', fontSize: '13px' }}>Order #{order._id.slice(-6).toUpperCase()}</p>
                                <p style={{ color: '#666', fontSize: '13px' }}>Date: {new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p style={{ marginTop: '10px' }}>
                                    <span className={`status-badge ${getStatusClass(order.status)}`} style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        background: order.status === 'delivered' ? '#d4edda' : order.status === 'cancelled' ? '#f8d7da' : '#fff3cd',
                                        color: order.status === 'delivered' ? '#155724' : order.status === 'cancelled' ? '#721c24' : '#856404'
                                    }}>{order.status}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="customer-info" style={{
                        marginBottom: '25px',
                        padding: '15px',
                        background: '#f8f9fa',
                        borderRadius: '8px'
                    }}>
                        <h3 style={{ fontSize: '14px', color: '#667eea', marginBottom: '10px', textTransform: 'uppercase' }}>Bill To</h3>
                        <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '3px' }}>{user?.name || 'Customer'}</p>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '3px' }}>{user?.email}</p>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '3px' }}>{user?.phone}</p>
                        {user?.address && (
                            <p style={{ fontSize: '14px', color: '#666' }}>
                                {user.address.street}, {user.address.city}, {user.address.state} - {user.address.pincode}
                            </p>
                        )}
                    </div>


                    {/* Items Table */}
                    <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                        <thead>
                            <tr>
                                <th style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '12px', textAlign: 'left', fontSize: '13px' }}>#</th>
                                <th style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '12px', textAlign: 'left', fontSize: '13px' }}>Item</th>
                                <th style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '12px', textAlign: 'center', fontSize: '13px' }}>Qty</th>
                                <th style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '12px', textAlign: 'right', fontSize: '13px' }}>Price</th>
                                <th style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '12px', textAlign: 'right', fontSize: '13px' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items?.map((item, index) => (
                                <tr key={index} style={{ background: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px' }}>{index + 1}</td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px' }}>
                                        {item.productId?.name || item.name || 'Product'}
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px', textAlign: 'center' }}>{item.quantity || 1}</td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px', textAlign: 'right' }}>₹{(item.price || item.productId?.price || 0).toFixed(2)}</td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '14px', textAlign: 'right', fontWeight: '600' }}>
                                        ₹{((item.price || item.productId?.price || 0) * (item.quantity || 1)).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="totals" style={{ marginLeft: 'auto', width: '300px' }}>
                        <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px' }}>
                            <span>Subtotal:</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px' }}>
                            <span>Delivery:</span>
                            <span>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}</span>
                        </div>
                        {order.discount > 0 && (
                            <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', color: '#28a745' }}>
                                <span>Discount:</span>
                                <span>-₹{order.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="totals-row total" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '12px 0 8px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#667eea',
                            borderTop: '2px solid #667eea',
                            marginTop: '5px'
                        }}>
                            <span>Grand Total:</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div style={{
                        marginTop: '25px',
                        padding: '15px',
                        background: '#e8f5e9',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span style={{ color: '#155724', fontSize: '14px' }}>
                            Payment: {order.paymentMethod === 'wallet' ? 'Paid via Wallet' : order.paymentMethod === 'friend_wallet' ? 'Paid via Friend\'s Wallet' : 'Cash on Delivery'}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="footer" style={{
                        textAlign: 'center',
                        marginTop: '40px',
                        paddingTop: '20px',
                        borderTop: '1px solid #eee',
                        color: '#888',
                        fontSize: '12px'
                    }}>
                        <p>Thank you for shopping with Express Basket!</p>
                        <p style={{ marginTop: '5px' }}>This is a computer-generated invoice and does not require a signature.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderBill;
