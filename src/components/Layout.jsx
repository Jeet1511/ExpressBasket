import React from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import ChatBot from './ChatBot.jsx';

const Layout = ({ children }) => {
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