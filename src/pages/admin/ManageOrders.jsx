import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import RouteConfigModal from '../../components/admin/RouteConfigModal.jsx';
import useTrackingStatus from '../../hooks/useTrackingStatus.js';
import ViewOnlyBanner from '../../components/admin/ViewOnlyBanner';
import { io } from 'socket.io-client';

const ManageOrdersContainer = styled.div``;

const Section = styled.section`
  background: var(--card-bg);
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 6px var(--shadow);
  margin-bottom: 30px;
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  color: var(--text-color);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--border-light);
`;

const OrdersTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 12px 15px;
    background-color: var(--nav-link-hover);
    color: var(--text-color);
    font-weight: 600;
    border-bottom: 2px solid var(--border-color);
  }

  td {
    padding: 12px 15px;
    border-bottom: 1px solid var(--border-color);
  }

  tr:hover {
    background-color: var(--nav-link-hover);
  }
`;

const ActionButton = styled.button`
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 5px;

  &.view {
    background-color: var(--info-bg);
    color: var(--info-text);

    &:hover {
      background-color: var(--info-bg);
    }
  }

  &.track {
    background-color: #667eea;
    color: white;

    &:hover {
      background-color: #5568d3;
    }
  }

  &.delete {
    background-color: var(--btn-danger);
    color: white;

    &:hover {
      background-color: var(--btn-danger-hover);
    }
  }
`;

const StatusSelect = styled.select`
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  background: var(--bg-color);
  color: var(--text-color);
`;

const ManageOrders = () => {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showRouteConfigModal, setShowRouteConfigModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [locationSimulator, setLocationSimulator] = useState({ lat: '', lng: '' });
  const { trackingEnabled } = useTrackingStatus();

  // Viewer role check - viewers cannot edit
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');
  const viewOnly = admin?.role === 'normal_viewer' || admin?.role === 'special_viewer';

  useEffect(() => {
    fetchOrders();
    fetchPartners();
  }, []);

  // Real-time order updates via Socket.io
  useEffect(() => {
    const socket = io(window.location.origin.replace(':5174', ':5000'), {
      transports: ['websocket', 'polling']
    });

    // Join admin room
    socket.emit('authenticate', localStorage.getItem('adminToken'));
    socket.on('authenticated', () => {
      socket.emit('join-admin-room');
    });

    // Listen for new orders
    socket.on('new_order', (data) => {
      console.log('📦 New order received:', data.order);
      // Add new order to the top of the list
      setOrders(prevOrders => [data.order, ...prevOrders]);

      // Show notification
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'New Order Received!',
        text: `Order #${data.order._id?.slice(-6)} - ₹${data.order.totalAmount}`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    });

    // Listen for order status changes (e.g., delivered)
    socket.on('order_status_changed', (data) => {
      console.log('📝 Order status changed:', data);
      // Update order status in the list
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order._id === data.orderId
            ? { ...order, status: data.status }
            : order
        )
      );

      // Show notification for delivered orders
      if (data.status === 'delivered') {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'Order Delivered!',
          text: `Order #${data.orderId?.slice(-6)} has been delivered`,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch orders'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      // Fetch only available (online, approved, active) partners
      const response = await axios.get('/admin/available-partners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartners(response.data);
    } catch (error) {
      console.error('Error fetching available partners:', error);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/admin/orders/${orderId}/status`, {
        status: newStatus,
        message: `Order ${newStatus}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Order status updated successfully'
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update order status'
      });
    }
  };

  const handleAssignPartner = async (orderId, partnerId) => {
    if (!partnerId) return;

    try {
      const token = localStorage.getItem('adminToken');
      // Use the delivery assign endpoint
      const response = await axios.post('/admin/delivery/assign',
        { orderId, partnerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire({
        icon: 'success',
        title: 'Partner Assigned',
        text: 'Delivery partner assigned. Waiting for partner to accept.',
        html: `<p>Delivery partner assigned successfully!</p>
               <p style="margin-top: 10px; font-size: 14px; color: #666;">
                 Waiting for partner to accept the delivery.
               </p>`,
        timer: 3000
      });

      fetchOrders();
      fetchPartners(); // Refresh partners list
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Assignment Failed',
        text: error.response?.data?.message || 'Failed to assign partner. Make sure order is packed first.'
      });
    }
  };

  const handleUpdateLocation = async () => {
    if (!locationSimulator.lat || !locationSimulator.lng) {
      Swal.fire('Error', 'Please enter both latitude and longitude', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/admin/orders/${selectedOrder._id}/location`, {
        lat: parseFloat(locationSimulator.lat),
        lng: parseFloat(locationSimulator.lng)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Location updated successfully'
      });

      setLocationSimulator({ lat: '', lng: '' });
      fetchOrders();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update location'
      });
    }
  };

  const openTrackingModal = (order) => {
    setSelectedOrder(order);
    setShowTrackingModal(true);
  };

  const openRouteConfigModal = (order) => {
    setSelectedOrder(order);
    setShowRouteConfigModal(true);
  };

  const handleRouteSet = () => {
    fetchOrders(); // Refresh orders after route is set
  };

  const handleDelete = async (orderId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--btn-danger)',
      cancelButtonColor: 'var(--btn-secondary)',
      confirmButtonText: 'Delete'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.delete(`/admin/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Order deleted successfully'
        });

        fetchOrders();
      } catch (error) {
        console.error('Error deleting order:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete order'
        });
      }
    }
  };

  const getStatusOptions = (currentStatus) => {
    // Base statuses that admins can set manually
    const baseStatuses = ['pending', 'confirmed', 'packed', 'cancelled'];

    // Delivery statuses only visible after order is packed
    const deliveryStatuses = ['out_for_delivery', 'delivered'];

    if (currentStatus === 'delivered') return ['delivered'];
    if (currentStatus === 'cancelled') return ['cancelled'];
    if (currentStatus === 'out_for_delivery') return ['out_for_delivery', 'delivered', 'cancelled'];
    if (currentStatus === 'packed') return [...baseStatuses, ...deliveryStatuses];
    if (currentStatus === 'confirmed') return ['confirmed', 'packed', 'cancelled'];
    if (currentStatus === 'pending') return ['pending', 'confirmed', 'packed', 'cancelled'];

    return baseStatuses;
  };

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <ManageOrdersContainer>
      {viewOnly && <ViewOnlyBanner role={admin?.role} />}
      <Section>
        <SectionTitle>All Orders</SectionTitle>
        <OrdersTable>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Partner</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order._id}>
                <td>#{order._id.slice(-8)}</td>
                <td>{order.userId?.name || 'Unknown'}</td>
                <td>{order.items?.length || 0} items</td>
                <td>₹{order.totalAmount?.toLocaleString() || 0}</td>
                <td>
                  <StatusSelect
                    value={order.status}
                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                    disabled={viewOnly}
                    style={viewOnly ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  >
                    {getStatusOptions(order.status).map(status => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </StatusSelect>
                </td>
                <td>
                  {order.deliveryPartner?.name ? (
                    <span style={{ fontSize: '12px', color: 'var(--btn-primary)' }}>
                      {order.deliveryPartner.name}
                    </span>
                  ) : order.status === 'packed' ? (
                    <StatusSelect
                      onChange={(e) => handleAssignPartner(order._id, e.target.value)}
                      defaultValue=""
                      disabled={viewOnly}
                      style={viewOnly ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                    >
                      <option value="">Select Partner ({partners.length} online)</option>
                      {partners.map(partner => (
                        <option key={partner._id} value={partner._id}>
                          {partner.name} - {partner.vehicle?.type || 'bike'}
                        </option>
                      ))}
                    </StatusSelect>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {order.status === 'pending' || order.status === 'confirmed'
                        ? 'Pack order first'
                        : order.status === 'out_for_delivery'
                          ? 'In delivery'
                          : '-'}
                    </span>
                  )}
                </td>
                <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                <td>
                  {trackingEnabled && !viewOnly && (
                    <ActionButton className="track" onClick={() => openRouteConfigModal(order)}>
                      🗺️ Route
                    </ActionButton>
                  )}
                  {trackingEnabled && !viewOnly && (
                    <ActionButton className="track" onClick={() => openTrackingModal(order)}>
                      Track
                    </ActionButton>
                  )}
                  {!viewOnly && (
                    <ActionButton className="delete" onClick={() => handleDelete(order._id)}>
                      Delete
                    </ActionButton>
                  )}
                  {viewOnly && <span style={{ color: 'var(--text-secondary)' }}>View Only</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </OrdersTable>
      </Section>

      {/* Tracking Modal */}
      {showTrackingModal && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowTrackingModal(false)}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: 'var(--text-color)', marginBottom: '20px' }}>
              Order Tracking Controls
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <strong style={{ color: 'var(--text-color)' }}>Order ID:</strong> #{selectedOrder._id.slice(-8)}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <strong style={{ color: 'var(--text-color)' }}>Current Status:</strong>{' '}
              <span style={{
                padding: '4px 12px',
                background: 'var(--btn-primary)',
                color: 'white',
                borderRadius: '12px',
                fontSize: '14px'
              }}>
                {selectedOrder.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>

            {selectedOrder.deliveryPartner && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: 'var(--text-color)' }}>Delivery Partner:</strong>{' '}
                  {selectedOrder.deliveryPartner.name}
                </div>

                <div style={{
                  background: 'var(--bg-color)',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ color: 'var(--text-color)', marginBottom: '15px' }}>
                    Location Simulator
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px' }}>
                    Simulate delivery partner location for testing
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-color)', marginBottom: '5px', fontSize: '14px' }}>
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={locationSimulator.lat}
                        onChange={(e) => setLocationSimulator({ ...locationSimulator, lat: e.target.value })}
                        placeholder="19.0760"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          background: 'var(--card-bg)',
                          color: 'var(--text-color)'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'var(--text-color)', marginBottom: '5px', fontSize: '14px' }}>
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={locationSimulator.lng}
                        onChange={(e) => setLocationSimulator({ ...locationSimulator, lng: e.target.value })}
                        placeholder="72.8777"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          background: 'var(--card-bg)',
                          color: 'var(--text-color)'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateLocation}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'var(--btn-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Update Location
                  </button>

                  {selectedOrder.deliveryPartner.currentLocation && (
                    <div style={{ marginTop: '15px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Current Location:</strong><br />
                      Lat: {selectedOrder.deliveryPartner.currentLocation.lat?.toFixed(6)}<br />
                      Lng: {selectedOrder.deliveryPartner.currentLocation.lng?.toFixed(6)}
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              onClick={() => setShowTrackingModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--bg-color)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Route Configuration Modal */}
      {showRouteConfigModal && selectedOrder && (
        <RouteConfigModal
          order={selectedOrder}
          onClose={() => setShowRouteConfigModal(false)}
          onRouteSet={handleRouteSet}
        />
      )}
    </ManageOrdersContainer>
  );
};

export default ManageOrders;