import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { CartProvider } from './context/CartContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { UserProvider } from './context/UserContext.jsx';

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

// Components
import Header from './components/Header.jsx';
import Layout from './components/Layout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import ProtectedAdminRoute from './components/ProtectedAdminRoute.jsx';

// Global Styles
import './global.css';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: var(--bg-color);
  transition: background-color 0.3s ease;
`;

function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    // Check if admin token exists in localStorage
    const token = localStorage.getItem('adminToken');
    return !!token;
  });

  return (
    <ThemeProvider>
      <UserProvider>
        <CartProvider>
          <ToastProvider>
            <AppContainer>
              <Routes>
                {/* Client Routes */}
                <Route path="/" element={<Layout><Home /></Layout>} />
                <Route path="/categories" element={<Layout><Categories /></Layout>} />
                <Route path="/cart" element={<Layout><Cart /></Layout>} />
                <Route path="/store" element={<Layout><Store /></Layout>} />
                <Route path="/login" element={<LoginSignup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/profile" element={<Layout><Profile /></Layout>} />
                <Route path="/track-order/:orderId" element={<Layout><OrderTracking /></Layout>} />
                <Route path="/bill/:orderId" element={<ViewBill />} />

                {/* Admin Routes */}
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
              </Routes>
            </AppContainer>
          </ToastProvider>
        </CartProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;