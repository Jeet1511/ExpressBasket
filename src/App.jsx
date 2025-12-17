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

// Components
import Header from './components/Header.jsx';
import Layout from './components/Layout.jsx';
import AdminLayout from './components/AdminLayout.jsx';

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
                <Route path="/profile" element={<Layout><Profile /></Layout>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLogin setIsAdmin={setIsAdmin} />} />
                <Route path="/admin/dashboard" element={
                  isAdmin ? <AdminLayout><AdminDashboard /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/add-product" element={
                  isAdmin ? <AdminLayout><AddProduct /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/edit-product/:id" element={
                  isAdmin ? <AdminLayout><EditProduct /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/categories" element={
                  isAdmin ? <AdminLayout><ManageCategories /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/products" element={
                  isAdmin ? <AdminLayout><ManageProducts /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/admins" element={
                  isAdmin ? <AdminLayout><ManageAdmins /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/users" element={
                  isAdmin ? <AdminLayout><ManageUsers /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/orders" element={
                  isAdmin ? <AdminLayout><ManageOrders /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/memberships" element={
                  isAdmin ? <AdminLayout><ManageMemberships /></AdminLayout> : <Navigate to="/admin" />
                } />
                <Route path="/admin/wallets" element={
                  isAdmin ? <AdminLayout><ManageWallets /></AdminLayout> : <Navigate to="/admin" />
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