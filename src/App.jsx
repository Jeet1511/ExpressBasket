import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { CartProvider } from './context/CartContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import axios from './utils/axios';

// Client Pages
import Home from './pages/client/Home.jsx';
import Categories from './pages/client/Categories.jsx';
import Cart from './pages/client/Cart.jsx';
import Store from './pages/client/Store.jsx';
import LoginSignup from './pages/client/LoginSignup.jsx';
import Profile from './pages/client/Profile.jsx';
import ForgotPassword from './pages/client/ForgotPassword.jsx';
import ResetPassword from './pages/client/ResetPassword.jsx';
import OrderTracking from './pages/client/OrderTracking.jsx';
import ViewBill from './pages/client/ViewBill.jsx';
import Gamification from './pages/client/Gamification.jsx';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AddProduct from './pages/admin/AddProduct.jsx';
import EditProduct from './pages/admin/EditProduct.jsx';
import ManageProducts from './pages/admin/ManageProducts.jsx';
import ManageCategories from './pages/admin/ManageCategories.jsx';
import ManageAdmins from './pages/admin/ManageAdmins.jsx';
import ManageUsers from './pages/admin/ManageUsers.jsx';
import ManageOrders from './pages/admin/ManageOrders.jsx';
import ManageMemberships from './pages/admin/ManageMemberships.jsx';
import ManageWallets from './pages/admin/ManageWallets.jsx';
import ManageDeliveryPartners from './pages/admin/ManageDeliveryPartners.jsx';
import TrackingToggle from './pages/admin/TrackingToggle.jsx';
import ManageMails from './pages/admin/ManageMails.jsx';
import ServerManagement from './pages/admin/ServerManagement.jsx';

// Components
import Header from './components/Header.jsx';
import Layout from './components/Layout.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute.jsx';
import MaintenanceOverlay from './components/admin/MaintenanceOverlay.jsx';

// Global Styles
import './global.css';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: var(--bg-color);
  transition: background-color 0.3s ease;
`;

// Wrapper component to handle maintenance mode for client routes
const ClientRoute = ({ children, maintenanceMode }) => {
  if (maintenanceMode) {
    return <MaintenanceOverlay />;
  }
  return children;
};

function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    // Check if admin token exists in localStorage
    const token = localStorage.getItem('adminToken');
    return !!token;
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);

  // Check server maintenance status on app load
  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await axios.get('/server/status');
        setMaintenanceMode(response.data.maintenanceMode);
      } catch (error) {
        console.error('Error checking server status:', error);
        // If can't reach server, assume it's available
        setMaintenanceMode(false);
      } finally {
        setMaintenanceChecked(true);
      }
    };

    checkMaintenanceStatus();

    // Poll for maintenance status every 5 seconds for real-time updates
    const interval = setInterval(checkMaintenanceStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider>
      <UserProvider>
        <SocketProvider>
          <CartProvider>
            <ToastProvider>
              <AppContainer>
                <Routes>
                  {/* Client Routes - wrapped with maintenance check */}
                  <Route path="/" element={<ClientRoute maintenanceMode={maintenanceMode}><Layout><Home /></Layout></ClientRoute>} />
                  <Route path="/categories" element={<ClientRoute maintenanceMode={maintenanceMode}><Layout><Categories /></Layout></ClientRoute>} />
                  <Route path="/cart" element={<ClientRoute maintenanceMode={maintenanceMode}><Layout><Cart /></Layout></ClientRoute>} />
                  <Route path="/store" element={<ClientRoute maintenanceMode={maintenanceMode}><Layout><Store /></Layout></ClientRoute>} />
                  <Route path="/login" element={<ClientRoute maintenanceMode={maintenanceMode}><LoginSignup /></ClientRoute>} />
                  <Route path="/forgot-password" element={<ClientRoute maintenanceMode={maintenanceMode}><ForgotPassword /></ClientRoute>} />
                  <Route path="/reset-password/:token" element={<ClientRoute maintenanceMode={maintenanceMode}><ResetPassword /></ClientRoute>} />
                  <Route path="/profile" element={<ClientRoute maintenanceMode={maintenanceMode}><Layout><Profile /></Layout></ClientRoute>} />
                  <Route path="/gamification" element={<ClientRoute maintenanceMode={maintenanceMode}><Layout><Gamification /></Layout></ClientRoute>} />
                  <Route path="/track-order/:orderId" element={<ClientRoute maintenanceMode={maintenanceMode}><Layout><OrderTracking /></Layout></ClientRoute>} />
                  <Route path="/bill/:orderId" element={<ClientRoute maintenanceMode={maintenanceMode}><ViewBill /></ClientRoute>} />

                  {/* Admin Routes - NOT affected by maintenance mode */}
                  <Route path="/admin" element={<AdminLogin setIsAdmin={setIsAdmin} />} />

                  {/* Dashboard - accessible to all admin roles */}
                  <Route path="/admin/dashboard" element={
                    <ProtectedAdminRoute>
                      <AdminLayout><AdminDashboard /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Products - requires manage_products permission */}
                  <Route path="/admin/add-product" element={
                    <ProtectedAdminRoute requiredPermission="manage_products">
                      <AdminLayout><AddProduct /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />
                  <Route path="/admin/edit-product/:id" element={
                    <ProtectedAdminRoute requiredPermission="manage_products">
                      <AdminLayout><EditProduct /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />
                  <Route path="/admin/products" element={
                    <ProtectedAdminRoute requiredPermission="manage_products">
                      <AdminLayout><ManageProducts /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Categories - requires manage_categories permission */}
                  <Route path="/admin/categories" element={
                    <ProtectedAdminRoute requiredPermission="manage_categories">
                      <AdminLayout><ManageCategories /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Admins - requires manage_admins permission */}
                  <Route path="/admin/admins" element={
                    <ProtectedAdminRoute requiredPermission="manage_admins">
                      <AdminLayout><ManageAdmins /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Users - requires manage_users permission */}
                  <Route path="/admin/users" element={
                    <ProtectedAdminRoute requiredPermission="manage_users">
                      <AdminLayout><ManageUsers /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Orders - requires manage_orders permission */}
                  <Route path="/admin/orders" element={
                    <ProtectedAdminRoute requiredPermission="manage_orders">
                      <AdminLayout><ManageOrders /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Memberships - requires manage_memberships permission */}
                  <Route path="/admin/memberships" element={
                    <ProtectedAdminRoute requiredPermission="manage_memberships">
                      <AdminLayout><ManageMemberships /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Wallets - requires manage_wallets permission */}
                  <Route path="/admin/wallets" element={
                    <ProtectedAdminRoute requiredPermission="manage_wallets">
                      <AdminLayout><ManageWallets /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Delivery Partners - requires manage_orders permission */}
                  <Route path="/admin/delivery-partners" element={
                    <ProtectedAdminRoute requiredPermission="manage_orders">
                      <AdminLayout><ManageDeliveryPartners /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Tracking Toggle - Super Admin Only */}
                  <Route path="/admin/tracking-toggle" element={
                    <ProtectedAdminRoute>
                      <AdminLayout><TrackingToggle /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Mail Center - Super Admin Only */}
                  <Route path="/admin/mails" element={
                    <ProtectedAdminRoute>
                      <AdminLayout><ManageMails /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />

                  {/* Server Management - Super Admin Only */}
                  <Route path="/admin/server" element={
                    <ProtectedAdminRoute>
                      <AdminLayout><ServerManagement /></AdminLayout>
                    </ProtectedAdminRoute>
                  } />
                </Routes>
              </AppContainer>
            </ToastProvider>
          </CartProvider>
        </SocketProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;