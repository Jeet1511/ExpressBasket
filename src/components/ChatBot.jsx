import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { useUser } from '../context/UserContext.jsx';
import { useCart } from '../context/CartContext.jsx';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(20px); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
`;

const bounce = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4); }
  50% { box-shadow: 0 0 0 15px rgba(102, 126, 234, 0); }
`;

const typing = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Styled Components
const ChatContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9998;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const ChatButton = styled.button`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  animation: ${pulse} 2s infinite;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
  }
  
  svg {
    animation: ${float} 3s ease-in-out infinite;
  }
`;

const ChatWindow = styled.div`
  position: absolute;
  bottom: 75px;
  right: 0;
  width: 400px;
  height: 550px;
  background: var(--card-bg, #ffffff);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${props => props.$isClosing ? fadeOut : fadeIn} 0.3s ease forwards;
  
  @media (max-width: 480px) {
    width: 95vw;
    height: 75vh;
    right: -10px;
  }
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
`;

const BotAvatar = styled.div`
  width: 45px;
  height: 45px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${bounce} 2s ease-in-out infinite;
  
  svg {
    color: white;
  }
`;

const HeaderInfo = styled.div`
  flex: 1;
  
  h3 {
    color: white;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  span {
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    
    &::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #4ade80;
      border-radius: 50%;
    }
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: var(--bg-color, #f8f9fa);
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
`;

const Message = styled.div`
  display: flex;
  gap: 10px;
  animation: ${slideIn} 0.3s ease forwards;
  animation-delay: ${props => props.$delay || '0s'};
  opacity: 0;
  
  ${props => props.$isUser && css`
    flex-direction: row-reverse;
  `}
`;

const MessageAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.$isUser ? 'linear-gradient(135deg, #f093fb, #f5576c)' : 'linear-gradient(135deg, #667eea, #764ba2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  svg {
    width: 16px;
    height: 16px;
    color: white;
  }
`;

const MessageBubble = styled.div`
  max-width: 75%;
  padding: 12px 16px;
  border-radius: ${props => props.$isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
  background: ${props => props.$isUser ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'var(--card-bg, white)'};
  color: ${props => props.$isUser ? 'white' : 'var(--text-color, #333)'};
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line;
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 5px;
  padding: 15px;
  
  span {
    width: 8px;
    height: 8px;
    background: #667eea;
    border-radius: 50%;
    animation: ${typing} 1s infinite;
    
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

const QuickActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 15px 20px;
  background: var(--card-bg, white);
  border-top: 1px solid var(--border-color, #eee);
`;

const QuickActionButton = styled.button`
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid var(--border-color, #ddd);
  background: var(--bg-color, #f8f9fa);
  color: var(--text-color, #333);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    width: 14px;
    height: 14px;
  }
  
  &:hover {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-color: transparent;
    transform: translateY(-2px);
    
    svg {
      stroke: white;
    }
  }
`;

const ProductCard = styled.div`
  background: var(--bg-color, #f8f9fa);
  border-radius: 12px;
  padding: 12px;
  margin-top: 10px;
  display: flex;
  gap: 12px;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  
  &:hover {
    background: var(--card-bg, white);
    border-color: #1a8754;
    transform: translateX(5px);
    box-shadow: 0 2px 8px rgba(26, 135, 84, 0.15);
  }
  
  img {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    object-fit: cover;
  }
  
  .info {
    flex: 1;
    
    h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: var(--text-color, #333);
    }
    
    .price {
      font-weight: 600;
      color: #1a8754;
      font-size: 14px;
    }
    
    .old-price {
      text-decoration: line-through;
      color: #999;
      font-size: 12px;
      margin-left: 5px;
    }
    
    .discount {
      background: #dcfce7;
      color: #16a34a;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
    }
  }
  
  .view-icon {
    color: #1a8754;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover .view-icon {
    opacity: 1;
  }
`;

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  vertical-align: middle;
  
  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`;

// Lucide-style Icons
const BotIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <circle cx="8" cy="16" r="1" fill="white" />
    <circle cx="16" cy="16" r="1" fill="white" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const StoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
  </svg>
);

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const HelpCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const AwardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const ShoppingCartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Get user context and location
  const { user } = useUser();
  const { cart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        const greeting = user
          ? `Hi ${user.name}! I'm your shopping assistant. I can tell you about this page, your account, show deals, and more!`
          : "Hi there! I'm your shopping assistant. I can help you discover products, find deals, and tell you about our store!";
        addBotMessage(greeting);
      }, 500);
    }
  }, [isOpen]);

  const addBotMessage = (text, products = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { text, isUser: false, products, time: new Date() }]);
    }, 800);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { text, isUser: true, time: new Date() }]);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  };

  // Page info based on current route
  const getPageInfo = () => {
    const path = location.pathname;
    const pages = {
      '/': { name: 'Home', desc: 'Browse featured products, categories, and search for anything you need!' },
      '/store': { name: 'Store', desc: 'View all products, filter by category, and find exactly what you\'re looking for.' },
      '/cart': { name: 'Cart', desc: 'Review your cart items, update quantities, and proceed to checkout.' },
      '/profile': { name: 'Profile', desc: 'View your account details, order history, wallet balance, and loyalty badges.' },
      '/categories': { name: 'Categories', desc: 'Explore all product categories available in our store.' },
      '/login': { name: 'Login/Signup', desc: 'Sign in to your account or create a new one to start shopping.' }
    };
    return pages[path] || { name: 'Page', desc: 'You\'re exploring our grocery store website.' };
  };

  const showCurrentPage = () => {
    addUserMessage("What's on this page?");
    const pageInfo = getPageInfo();
    const cartInfo = cart.length > 0 ? `\n\nYou have ${cart.length} item(s) in your cart.` : '';
    addBotMessage(`You're on the ${pageInfo.name} page!\n\n${pageInfo.desc}${cartInfo}`);
  };

  const showMyAccount = () => {
    addUserMessage("Show my account details");

    if (!user) {
      addBotMessage("You're not logged in yet.\n\nTo see your account details, please log in first. Click on 'Profile' in the header to sign in or create an account!");
      return;
    }

    const walletBalance = user.walletBalance || 0;
    // loyaltyBadge is an object with .type property
    const badgeType = user.loyaltyBadge?.type || user.loyaltyBadge || 'none';
    const badgeDisplay = typeof badgeType === 'string'
      ? badgeType.charAt(0).toUpperCase() + badgeType.slice(1)
      : 'None';

    const accountInfo = `Your Account Details

Name: ${user.name}
Email: ${user.email}
Phone: ${user.phone || 'Not set'}
Wallet Balance: Rs.${walletBalance.toLocaleString()}
Loyalty Badge: ${badgeDisplay}
Cart Items: ${cart.length}`;

    addBotMessage(accountInfo);
  };

  const showAboutWebsite = () => {
    addUserMessage("Tell me about this website");
    addBotMessage(`Welcome to Express Basket!

We're your one-stop grocery store with:

- Fresh vegetables & fruits
- Dairy products
- Bakery items
- Quick add-to-cart shopping
- Wallet system for easy payments
- Loyalty badges & rewards
- Fast delivery to your doorstep

Explore categories, find deals, and enjoy hassle-free shopping!`);
  };

  const fetchNewProducts = async () => {
    addUserMessage("Show me new products");
    try {
      const response = await axios.get('/products');
      const products = response.data || [];
      const newest = products
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);

      if (newest.length > 0) {
        addBotMessage("Here are the newest arrivals! Click any product to view:", newest);
      } else {
        addBotMessage("No new products found. Check back soon!");
      }
    } catch (error) {
      addBotMessage("Sorry, couldn't fetch products. Please try again!");
    }
  };

  const fetchPriceDrops = async () => {
    addUserMessage("Show me deals & discounts");
    try {
      const response = await axios.get('/products');
      const products = response.data || [];
      const deals = products
        .filter(p => (p.originalPrice && p.originalPrice > p.price) || p.discount > 0)
        .slice(0, 5);

      if (deals.length > 0) {
        addBotMessage("Hot deals with price drops! Click any to view:", deals);
      } else {
        addBotMessage("No special deals right now, but keep checking!");
      }
    } catch (error) {
      addBotMessage("Sorry, couldn't fetch deals. Please try again!");
    }
  };

  const showHelp = () => {
    addUserMessage("What can you do?");
    addBotMessage(`I can help you with:

- My Account: Your profile & wallet info
- This Page: Info about current page
- About Us: Learn about our store
- New Products: Latest arrivals
- Deals: Products with discounts

I know everything about this website and can guide you around!`);
  };

  return (
    <ChatContainer>
      {isOpen && (
        <ChatWindow $isClosing={isClosing}>
          <ChatHeader>
            <BotAvatar>
              <BotIcon />
            </BotAvatar>
            <HeaderInfo>
              <h3>Shopping Assistant</h3>
              <span>{user ? `Hi, ${user.name}!` : 'Always here to help'}</span>
            </HeaderInfo>
            <CloseButton onClick={handleClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </CloseButton>
          </ChatHeader>

          <ChatMessages>
            {messages.map((msg, index) => (
              <Message key={index} $isUser={msg.isUser} $delay={`${index * 0.1}s`}>
                <MessageAvatar $isUser={msg.isUser}>
                  {msg.isUser ? <UserIcon /> : <BotIcon />}
                </MessageAvatar>
                <div>
                  <MessageBubble $isUser={msg.isUser}>
                    {msg.text}
                  </MessageBubble>
                  {msg.products && msg.products.map((product, i) => (
                    <ProductCard
                      key={i}
                      onClick={() => {
                        // Navigate to store with product ID as highlight parameter
                        // The category could be an object with _id or just an ID string
                        const categoryId = product.category?._id || product.category;
                        const productId = product._id;
                        if (categoryId && typeof categoryId === 'string') {
                          navigate(`/store?category=${encodeURIComponent(categoryId)}&highlight=${productId}`);
                        } else {
                          // Fallback to search by product name with highlight
                          navigate(`/store?search=${encodeURIComponent(product.name)}&highlight=${productId}`);
                        }
                        handleClose();
                      }}
                      title={`View ${product.name}`}
                    >
                      <img
                        src={product.image?.startsWith('http') ? product.image : '/placeholder-image.png'}
                        alt={product.name}
                        onError={(e) => { e.target.src = '/placeholder-image.png'; }}
                      />
                      <div className="info">
                        <h4>{product.name}</h4>
                        <div>
                          <span className="price">Rs.{product.price}</span>
                          {product.originalPrice > product.price && (
                            <>
                              <span className="old-price">Rs.{product.originalPrice}</span>
                              <span className="discount">
                                {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="view-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </ProductCard>
                  ))}
                </div>
              </Message>
            ))}

            {isTyping && (
              <Message>
                <MessageAvatar>
                  <BotIcon />
                </MessageAvatar>
                <MessageBubble>
                  <TypingIndicator>
                    <span></span>
                    <span></span>
                    <span></span>
                  </TypingIndicator>
                </MessageBubble>
              </Message>
            )}

            <div ref={messagesEndRef} />
          </ChatMessages>

          <QuickActions>
            <QuickActionButton onClick={showMyAccount}>
              <UserIcon /> My Account
            </QuickActionButton>
            <QuickActionButton onClick={showCurrentPage}>
              <MapPinIcon /> This Page
            </QuickActionButton>
            <QuickActionButton onClick={showAboutWebsite}>
              <StoreIcon /> About Us
            </QuickActionButton>
            <QuickActionButton onClick={fetchNewProducts}>
              <SparklesIcon /> New
            </QuickActionButton>
            <QuickActionButton onClick={fetchPriceDrops}>
              <FlameIcon /> Deals
            </QuickActionButton>
            <QuickActionButton onClick={showHelp}>
              <HelpCircleIcon /> Help
            </QuickActionButton>
          </QuickActions>
        </ChatWindow>
      )}

      <ChatButton onClick={() => !isOpen && setIsOpen(true)} style={{ display: isOpen ? 'none' : 'flex' }}>
        <BotIcon />
      </ChatButton>
    </ChatContainer>
  );
};

export default ChatBot;
