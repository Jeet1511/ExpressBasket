import React, { useEffect, useRef, useState } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import ChatBot from './ChatBot.jsx';
import { useToast } from '../context/ToastContext.jsx';
import axios from '../utils/axios';

const Layout = ({ children }) => {
  const { showMailToast } = useToast();
  const lastCountRef = useRef(0);
  const isFirstCheck = useRef(true);

  useEffect(() => {
    const checkMails = async () => {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      try {
        const response = await axios.get('/user/mails', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const newUnreadCount = response.data.unreadCount || 0;

        // Only show notification if there are new mails (not on first load)
        if (!isFirstCheck.current && newUnreadCount > lastCountRef.current) {
          const newMails = newUnreadCount - lastCountRef.current;
          showMailToast(newMails);
        }

        isFirstCheck.current = false;
        lastCountRef.current = newUnreadCount;
      } catch (error) {
        // Silently fail - user might not be logged in
      }
    };

    // Initial check
    checkMails();

    // Poll every 15 seconds for new mails
    const interval = setInterval(checkMails, 15000);

    return () => clearInterval(interval);
  }, [showMailToast]);

  return (
    <div className="layout">
      <Header />
      <main className="main-content">
        {children}
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
};

export default Layout;