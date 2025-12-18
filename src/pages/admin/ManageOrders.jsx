import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import RouteConfigModal from '../../components/RouteConfigModal.jsx';
import useTrackingStatus from '../../hooks/useTrackingStatus.js';

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
      const response = await axios.get('/admin/delivery-partners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartners(response.data);
    } catch (error) {
      console.error('Error fetching partners:', error);
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
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`/admin/orders/${orderId}/assign-partner`, { partnerId }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Delivery partner assigned successfully'
      });

      fetchOrders();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to assign partner'
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
    const allStatuses = ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];
    return allStatuses.filter(status => {
      if (currentStatus === 'delivered') return status === 'delivered';
      if (currentStatus === 'cancelled') return status === 'cancelled';
      if (currentStatus === 'out_for_delivery') return ['out_for_delivery', 'delivered', 'cancelled'].includes(status);
      if (currentStatus === 'packed') return ['packed', 'out_for_delivery', 'delivered', 'cancelled'].includes(status);
      if (currentStatus === 'confirmed') return ['confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'].includes(status);
      return true;
    });
  };

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <ManageOrdersContainer>
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
                  ) : (
                    <StatusSelect
                      onChange={(e) => handleAssignPartner(order._id, e.target.value)}
                      defaultValue=""
                    >
                      <option value="">Assign Partner</option>
                      {partners.filter(p => p.isAvailable).map(partner => (
                        <option key={partner._id} value={partner._id}>
                          {partner.name}
                        </option>
                      ))}
                    </StatusSelect>
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