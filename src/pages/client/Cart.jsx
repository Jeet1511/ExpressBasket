import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCart } from '../../context/CartContext.jsx';
import { useUser } from '../../context/UserContext.jsx';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';

const CartContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const CartTitle = styled.h1`
  font-size: 36px;
  margin-bottom: 30px;
  color: var(--text-color);
`;

const CartContent = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CartItems = styled.div`
  background: var(--card-bg);
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 6px var(--shadow);
`;

const CartItem = styled.div`
  display: grid;
  grid-template-columns: 100px 2fr 1fr auto;
  gap: 20px;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--border-light);
  
  @media (max-width: 768px) {
    grid-template-columns: 80px 1fr;
    gap: 10px;
  }
`;

const ItemImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 5px;
`;

const ItemDetails = styled.div``;

const ItemName = styled.h3`
  font-size: 18px;
  margin-bottom: 5px;
  color: var(--text-color);
`;

const ItemPrice = styled.p`
  color: var(--btn-primary);
  font-weight: 500;
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const QuantityButton = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  border-radius: 5px;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-color);
  
  &:hover {
    background: var(--border-light);
  }
`;

const QuantityDisplay = styled.span`
  font-size: 16px;
  min-width: 30px;
  text-align: center;
  color: var(--text-color);
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 5px;
  
  &:hover {
    color: #c82333;
  }
`;

const CartSummary = styled.div`
  background: var(--card-bg);
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 4px 6px var(--shadow);
  height: fit-content;
`;

const SummaryTitle = styled.h2`
  font-size: 20px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-color);
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: ${props => props.total ? '18px' : '16px'};
  font-weight: ${props => props.total ? '600' : '400'};
  color: ${props => props.total ? 'var(--text-color)' : 'var(--text-secondary)'};
`;

const EmptyCart = styled.div`
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg);
  border-radius: 10px;
  
  h3 {
    font-size: 24px;
    color: var(--text-color);
  }
  
  p {
    margin-bottom: 20px;
    color: var(--text-secondary);
  }
`;

const CheckoutButton = styled.button`
  width: 100%;
  padding: 15px;
  background-color: var(--btn-primary);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 18px;
  font-weight: 500;
  margin-top: 20px;
  cursor: pointer;
  
  &:hover {
    background-color: var(--btn-primary-hover);
  }
`;

const ContinueButton = styled.button`
  width: 100%;
  padding: 15px;
  background-color: var(--btn-secondary);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 10px;
  cursor: pointer;
  
  &:hover {
    background-color: var(--btn-secondary-hover);
  }
`;

const PaymentModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const PaymentOption = styled.button`
  width: 100%;
  padding: 15px 20px;
  border: 2px solid ${props => props.selected ? 'var(--btn-primary)' : 'var(--border-color)'};
  background: ${props => props.selected ? 'rgba(40, 167, 69, 0.1)' : 'var(--card-bg)'};
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  transition: all 0.2s;
  text-align: left;
  
  &:hover {
    border-color: var(--btn-primary);
  }
`;

const WalletBadge = styled.span`
  background: var(--btn-primary);
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

const Cart = () => {
  const { cart, total, removeFromCart, updateQuantity, clearCart, placeOrder, reorderItems } = useCart();
  const { user } = useUser();
  const [walletBalance, setWalletBalance] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [friendPhone, setFriendPhone] = useState('');
  const [friendData, setFriendData] = useState(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState('');
  const [previousOrders, setPreviousOrders] = useState([]);
  const [reorderLoading, setReorderLoading] = useState(null);

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
      fetchPreviousOrders();
    }
  }, [user]);

  const fetchPreviousOrders = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/user/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Get last 3 orders for quick reorder
      setPreviousOrders(response.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleReorder = async (order) => {
    setReorderLoading(order._id);
    const success = await reorderItems(order.items);
    setReorderLoading(null);
    if (success) {
      Swal.fire({
        title: 'Items Added!',
        text: 'Items from your previous order have been added to cart',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/user/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleQuantityChange = (productId, newQuantity) => {
    updateQuantity(productId, newQuantity);
  };

  const lookupFriend = async () => {
    if (!friendPhone || friendPhone.length < 10) {
      setFriendError('Please enter a valid 10-digit phone number');
      return;
    }

    setFriendLoading(true);
    setFriendError('');
    setFriendData(null);

    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/user/find-friend/${friendPhone}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriendData(response.data);
    } catch (error) {
      setFriendError(error.response?.data?.message || 'User not found');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      Swal.fire({
        title: 'Login Required',
        text: 'Please login to place an order',
        icon: 'warning',
        confirmButtonText: 'Login'
      }).then(() => {
        window.location.href = '/login';
      });
      return;
    }

    if (!user.address || !user.address.street) {
      Swal.fire({
        title: 'Address Required',
        text: 'Please update your profile with delivery address',
        icon: 'warning',
        confirmButtonText: 'Update Profile'
      }).then(() => {
        window.location.href = '/profile';
      });
      return;
    }

    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    // Use component-level grandTotal which includes membership discounts

    if (paymentMethod === 'wallet') {
      if (walletBalance < grandTotal) {
        Swal.fire({
          title: 'Insufficient Balance',
          html: `
            <p>Your wallet balance: <strong>₹${walletBalance.toFixed(2)}</strong></p>
            <p>Amount required: <strong>₹${grandTotal.toFixed(2)}</strong></p>
            <p style="color: #666; margin-top: 15px;">Buying via money will be added very soon!</p>
          `,
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        return;
      }

      try {
        const token = localStorage.getItem('userToken');
        await axios.post('/user/wallet/pay',
          { amount: grandTotal, description: `Order payment` },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        await placeOrder(user.address, 'wallet');
        setShowPaymentModal(false);

        Swal.fire({
          title: 'Order Placed!',
          text: `Payment of ₹${grandTotal.toFixed(2)} made from your wallet`,
          icon: 'success'
        });

        fetchWalletBalance();
      } catch (error) {
        Swal.fire({
          title: 'Payment Failed',
          text: error.response?.data?.message || 'Failed to process payment',
          icon: 'error'
        });
      }
    } else if (paymentMethod === 'friend') {
      if (!friendData) {
        Swal.fire({
          title: 'Select Friend',
          text: "Please enter your friend's phone number and search",
          icon: 'warning'
        });
        return;
      }

      try {
        const token = localStorage.getItem('userToken');

        // Prepare cart items for the request
        const cartItemsForRequest = cart.map(item => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        }));

        const response = await axios.post('/user/wallet/pay-friend',
          {
            friendId: friendData.id,
            amount: grandTotal,
            cartItems: cartItemsForRequest,
            shippingAddress: user.address,
            description: `Order payment for ${user.name}`
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setShowPaymentModal(false);

        Swal.fire({
          title: 'Request Sent! 📩',
          html: `
            <p>Payment request of <strong>₹${grandTotal.toFixed(2)}</strong> sent to <strong>${friendData.name}</strong>!</p>
            <p style="color: #666; margin-top: 15px; font-size: 14px;">
              Your friend will receive a notification and can approve or reject from their mailbox.
            </p>
            <p style="color: #888; margin-top: 10px; font-size: 12px;">
              Request expires in 30 minutes
            </p>
          `,
          icon: 'success'
        });

        // Clear cart after sending request
        clearCart();
      } catch (error) {
        Swal.fire({
          title: 'Request Failed',
          text: error.response?.data?.message || 'Failed to send payment request',
          icon: 'error'
        });
      }
    }
  };

  // Membership benefits configuration
  const membershipBenefits = {
    silver: { discount: 5, freeDeliveryThreshold: 300, price: 99 },
    gold: { discount: 10, freeDeliveryThreshold: 0, price: 199 },
    platinum: { discount: 15, freeDeliveryThreshold: 0, price: 499 }
  };

  // Get user's badge type
  const userBadge = user?.loyaltyBadge?.type;
  const hasMembership = userBadge && userBadge !== 'none' && membershipBenefits[userBadge];

  // Calculate membership discount
  const membershipDiscount = hasMembership
    ? (total * membershipBenefits[userBadge].discount / 100)
    : 0;
  const discountedTotal = total - membershipDiscount;

  // Calculate delivery charge based on membership
  let deliveryCharge = 50; // Default delivery charge
  if (hasMembership) {
    const threshold = membershipBenefits[userBadge].freeDeliveryThreshold;
    if (threshold === 0 || total >= threshold) {
      deliveryCharge = 0;
    }
  } else if (total > 500) {
    deliveryCharge = 0;
  }

  const grandTotal = discountedTotal + deliveryCharge;

  if (cart.length === 0) {
    return (
      <CartContainer>
        <CartTitle>Cart</CartTitle>
        <EmptyCart>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" strokeWidth="1">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <h3>Cart is empty</h3>
          <p>Add some delicious groceries to get started!</p>
          <ContinueButton onClick={() => window.location.href = '/'}>
            Continue Shopping
          </ContinueButton>
        </EmptyCart>

        {/* Previous Orders for Quick Reorder */}
        {user && previousOrders.length > 0 && (
          <div style={{
            marginTop: '30px',
            background: 'var(--card-bg)',
            borderRadius: '16px',
            padding: '25px',
            boxShadow: '0 4px 12px var(--shadow)'
          }}>
            <h3 style={{
              color: 'var(--text-color)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '18px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Quick Reorder
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {previousOrders.map(order => (
                <div key={order._id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  background: 'var(--bg-color)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div>
                    <p style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px' }}>
                      Order #{order._id.slice(-6).toUpperCase()}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {new Date(order.orderDate).toLocaleDateString('en-IN')} • {order.items.length} items • ₹{order.totalAmount?.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReorder(order)}
                    disabled={reorderLoading === order._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      opacity: reorderLoading === order._id ? 0.7 : 1
                    }}
                  >
                    {reorderLoading === order._id ? (
                      'Adding...'
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Reorder
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CartContainer>
    );
  }

  return (
    <CartContainer>
      <CartTitle>Cart ({cart.length} items)</CartTitle>

      <CartContent>
        <CartItems>
          {cart.map(item => (
            <CartItem key={item._id}>
              <ItemImage
                src={item.image && (item.image.startsWith('http') ? item.image : `${item.image.startsWith('/') ? '' : '/'}${item.image}`) || 'https://via.placeholder.com/100x100?text=No+Image'}
                alt={item.name}
              />

              <ItemDetails>
                <ItemName>{item.name}</ItemName>
                <ItemPrice>₹{item.price}</ItemPrice>
              </ItemDetails>

              <QuantityControl>
                <QuantityButton onClick={() => handleQuantityChange(item._id, item.quantity - 1)}>
                  -
                </QuantityButton>
                <QuantityDisplay>{item.quantity}</QuantityDisplay>
                <QuantityButton onClick={() => handleQuantityChange(item._id, item.quantity + 1)}>
                  +
                </QuantityButton>
              </QuantityControl>

              <RemoveButton onClick={() => removeFromCart(item._id)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </RemoveButton>
            </CartItem>
          ))}

          {/* Quick Reorder Section - For logged in users */}
          {user && previousOrders.length > 0 && (
            <div style={{
              marginTop: '25px',
              paddingTop: '20px',
              borderTop: '2px dashed var(--border-color)'
            }}>
              <h4 style={{
                color: 'var(--text-color)',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Quick Reorder from Previous Orders
              </h4>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                {previousOrders.map(order => (
                  <button
                    key={order._id}
                    onClick={() => handleReorder(order)}
                    disabled={reorderLoading === order._id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '12px 18px',
                      background: reorderLoading === order._id ? 'var(--bg-color)' : 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minWidth: '100px',
                      opacity: reorderLoading === order._id ? 0.7 : 1
                    }}
                  >
                    <span style={{ fontSize: '11px', opacity: 0.9 }}>
                      {new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    <span>{order.items.length} items</span>
                    <span style={{ fontSize: '10px' }}>₹{order.totalAmount?.toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CartItems>

        <CartSummary>
          <SummaryTitle>Order Summary</SummaryTitle>

          <SummaryRow>
            <span>Subtotal</span>
            <span>₹{total.toFixed(2)}</span>
          </SummaryRow>

          {/* Membership Discount */}
          {hasMembership && membershipDiscount > 0 && (
            <SummaryRow style={{ color: '#28a745' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                {userBadge.charAt(0).toUpperCase() + userBadge.slice(1)} Discount ({membershipBenefits[userBadge].discount}%)
              </span>
              <span>-₹{membershipDiscount.toFixed(2)}</span>
            </SummaryRow>
          )}

          <SummaryRow>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Delivery Charges
              {hasMembership && deliveryCharge === 0 && (
                <span style={{
                  fontSize: '10px',
                  background: userBadge === 'platinum' ? 'linear-gradient(135deg, #e5e4e2, #9370db)' :
                    userBadge === 'gold' ? 'linear-gradient(135deg, #ffd700, #ffb347)' :
                      'linear-gradient(135deg, #c0c0c0, #a8a8a8)',
                  color: '#333',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontWeight: '600'
                }}>
                  {userBadge.toUpperCase()} PERK
                </span>
              )}
            </span>
            <span style={{ color: deliveryCharge === 0 ? '#28a745' : 'inherit', fontWeight: deliveryCharge === 0 ? '600' : 'normal' }}>
              {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}
            </span>
          </SummaryRow>

          {deliveryCharge > 0 && !hasMembership && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Add ₹{(500 - total).toFixed(2)} more for FREE delivery
            </p>
          )}

          {deliveryCharge > 0 && hasMembership && userBadge === 'silver' && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Add ₹{(300 - total).toFixed(2)} more for FREE delivery (Silver Perk)
            </p>
          )}

          {/* Membership Upgrade Hint */}
          {!hasMembership && user && (
            <div style={{
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px dashed var(--btn-primary)',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '15px',
              fontSize: '12px',
              color: 'var(--text-color)'
            }}>
              <strong>Save with Membership!</strong>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Get up to 15% discount + free delivery
              </p>
            </div>
          )}

          {user && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>Wallet Balance</span>
                <span style={{ fontSize: '20px', fontWeight: '700' }}>₹{walletBalance.toFixed(2)}</span>
              </div>
            </div>
          )}

          <SummaryRow total>
            <span>Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </SummaryRow>

          <CheckoutButton onClick={handleCheckout}>
            Choose Payment Method
          </CheckoutButton>

          <ContinueButton onClick={() => window.location.href = '/'}>
            Continue Shopping
          </ContinueButton>
        </CartSummary>
      </CartContent>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <PaymentModal onClick={() => setShowPaymentModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Select Payment Method
            </h2>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Total: <strong style={{ color: 'var(--text-color)', fontSize: '20px' }}>₹{grandTotal.toFixed(2)}</strong>
            </p>

            {/* Wallet Payment Option */}
            <PaymentOption
              selected={paymentMethod === 'wallet'}
              onClick={() => setPaymentMethod('wallet')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={paymentMethod === 'wallet' ? 'var(--btn-primary)' : 'currentColor'} strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px' }}>Pay with Wallet</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Balance: ₹{walletBalance.toFixed(2)}</p>
              </div>
              {walletBalance >= grandTotal && <WalletBadge>Sufficient</WalletBadge>}
            </PaymentOption>

            {/* Friend Payment Option */}
            <PaymentOption
              selected={paymentMethod === 'friend'}
              onClick={() => setPaymentMethod('friend')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={paymentMethod === 'friend' ? 'var(--btn-primary)' : 'currentColor'} strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px' }}>Pay via Friend</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Let a friend pay from their wallet</p>
              </div>
            </PaymentOption>

            {/* Friend Phone Lookup */}
            {paymentMethod === 'friend' && (
              <div style={{
                background: 'var(--bg-color)',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '15px'
              }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Friend's Phone Number
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit phone"
                    value={friendPhone}
                    onChange={(e) => setFriendPhone(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-color)'
                    }}
                  />
                  <button
                    onClick={lookupFriend}
                    disabled={friendLoading}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--btn-primary)',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {friendLoading ? '...' : 'Find'}
                  </button>
                </div>

                {friendError && (
                  <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '10px' }}>{friendError}</p>
                )}

                {friendData && (
                  <div style={{
                    marginTop: '15px',
                    padding: '12px',
                    background: 'rgba(40, 167, 69, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid var(--btn-primary)'
                  }}>
                    <p style={{ fontWeight: '600', color: 'var(--text-color)' }}>{friendData.name}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{friendData.phone}</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button
                onClick={processPayment}
                style={{
                  flex: 1,
                  padding: '15px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--btn-primary)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Buy Now
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  flex: 1,
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-color)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </ModalContent>
        </PaymentModal>
      )}
    </CartContainer>
  );
};

export default Cart;