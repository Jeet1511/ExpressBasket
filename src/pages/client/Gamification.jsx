import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import styled from 'styled-components';
import Swal from 'sweetalert2';
import {
  Gamepad2,
  Trophy,
  Calendar,
  TrendingUp,
  Flame,
  Gift,
  CreditCard,
  Award,
  Users,
  Star,
  Zap,
  ShoppingBag,
  Target,
  Crown,
  CalendarCheck,
  Sunrise,
  Moon,
  CheckCircle,
  Ticket
} from 'lucide-react';

// Icon renderer for achievements
const getAchievementIcon = (iconName) => {
  const iconMap = {
    'ShoppingBag': ShoppingBag,
    'Target': Target,
    'TrendingUp': TrendingUp,
    'Crown': Crown,
    'CalendarCheck': CalendarCheck,
    'Flame': Flame,
    'Star': Star,
    'Sunrise': Sunrise,
    'Moon': Moon
  };

  const IconComponent = iconMap[iconName] || Award;
  return <IconComponent size={48} />;
};

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 10px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 36px;
  color: var(--text-color);
  margin-bottom: 10px;
  
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  font-size: 18px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-bottom: 20px;
  }
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, ${props => props.$gradient || '#1a8754, #20c997'});
  padding: 30px;
  border-radius: 15px;
  color: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const StatValue = styled.div`
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 10px;
  
  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const StatLabel = styled.div`
  font-size: 16px;
  opacity: 0.9;
`;

const Section = styled.div`
  background: var(--card-bg);
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 10px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  color: var(--text-color);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CheckInButton = styled.button`
  background: linear-gradient(135deg, #1a8754, #20c997);
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(26, 135, 84, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(26, 135, 84, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AchievementsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
`;

const AchievementCard = styled.div`
  background: ${props => props.$unlocked ? 'linear-gradient(135deg, #f7971e, #ffd200)' : 'var(--input-bg)'};
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  opacity: ${props => props.$unlocked ? 1 : 0.5};
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const AchievementIcon = styled.div`
  font-size: 48px;
  margin-bottom: 10px;
`;

const AchievementName = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
  color: ${props => props.$unlocked ? 'white' : 'var(--text-color)'};
`;

const AchievementDesc = styled.div`
  font-size: 12px;
  color: ${props => props.$unlocked ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'};
`;

const LeaderboardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const LeaderboardRow = styled.tr`
  border-bottom: 1px solid var(--border-color);
  
  &:hover {
    background: var(--nav-link-hover);
  }
`;

const LeaderboardCell = styled.td`
  padding: 15px;
  color: var(--text-color);
`;

const Rank = styled.span`
  font-weight: bold;
  font-size: 20px;
  color: ${props => {
    if (props.rank === 1) return '#FFD700';
    if (props.rank === 2) return '#C0C0C0';
    if (props.rank === 3) return '#CD7F32';
    return 'var(--text-color)';
  }};
`;

const RewardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`;

const RewardCard = styled.div`
  background: var(--input-bg);
  padding: 20px;
  border-radius: 10px;
  border: 2px solid ${props => props.$canAfford ? '#4CAF50' : 'var(--border-color)'};
`;

const RewardName = styled.div`
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 10px;
  color: var(--text-color);
`;

const RewardDesc = styled.div`
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 10px;
`;

const RewardCost = styled.div`
  color: var(--text-secondary);
  margin-bottom: 15px;
`;

const RedeemButton = styled.button`
  width: 100%;
  padding: 10px;
  background: ${props => props.disabled ? 'var(--border-color)' : '#4CAF50'};
  color: white;
  border: none;
  border-radius: 5px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-weight: bold;
  
  &:hover:not(:disabled) {
    background: #45a049;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Tab = styled.button`
  padding: 10px 20px;
  background: ${props => props.$active ? 'var(--btn-primary)' : 'var(--input-bg)'};
  color: ${props => props.$active ? 'white' : 'var(--text-color)'};
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: ${props => props.$active ? 'bold' : 'normal'};
`;

const Gamification = () => {
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [myCodes, setMyCodes] = useState([]);
  const [giftCodeFilter, setGiftCodeFilter] = useState('active'); // active, redeemed, expired
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('userToken');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
    fetchMyCodes();
  }, []);

  useEffect(() => {
    if (stats) {
      fetchLeaderboard();
    }
  }, [leaderboardPeriod]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const [statsRes, achievementsRes, rewardsRes, myRewardsRes] = await Promise.all([
        axios.get('/gamification/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/gamification/achievements'),
        axios.get('/gamification/rewards'),
        axios.get('/gamification/my-rewards', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats({
        ...statsRes.data,
        myRewards: myRewardsRes.data
      });
      setAchievements(achievementsRes.data);
      setRewards(rewardsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      setError(error.response?.data?.message || 'Failed to load gamification data');
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`/gamification/leaderboard?period=${leaderboardPeriod}`);
      setLeaderboard(res.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.post('/gamification/check-in', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        // Generate calendar HTML
        let calendarHTML = '<div style="margin: 20px 0;"><div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #667eea;">📅 Your 30-Day Progress</div><div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 15px 0;">';

        for (let day = 1; day <= 30; day++) {
          let bgColor = '#f0f0f0', textColor = '#999', icon = '';
          if (day <= res.data.streak) { bgColor = '#4CAF50'; textColor = 'white'; icon = '✓'; }
          else if (day === res.data.streak + 1) { bgColor = '#667eea'; textColor = 'white'; icon = '★'; }
          const isMilestone = day % 7 === 0;
          calendarHTML += `<div style="background: ${bgColor}; color: ${textColor}; padding: 10px; border-radius: 6px; text-align: center; font-weight: ${isMilestone ? 'bold' : 'normal'}; border: ${isMilestone ? '2px solid #FFD700' : 'none'};"><div style="font-size: 14px; font-weight: bold;">${day}</div><div style="font-size: 16px; margin-top: 3px;">${icon}</div>${isMilestone ? '<div style="font-size: 10px; margin-top: 2px;">🏆</div>' : ''}</div>`;
        }
        calendarHTML += '</div><div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; font-size: 11px;"><div style="display: flex; align-items: center; gap: 4px;"><div style="width: 16px; height: 16px; background: #4CAF50; border-radius: 3px;"></div><span>Checked</span></div><div style="display: flex; align-items: center; gap: 4px;"><div style="width: 16px; height: 16px; background: #667eea; border-radius: 3px;"></div><span>Next</span></div><div style="display: flex; align-items: center; gap: 4px;"><div style="width: 16px; height: 16px; background: #f0f0f0; border-radius: 3px;"></div><span>Upcoming</span></div><div style="display: flex; align-items: center; gap: 4px;"><span>🏆</span><span>Milestone</span></div></div></div>';

        // Show beautiful success modal with calendar
        await Swal.fire({
          title: '🎉 Check-In Successful!',
          html: `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
              <div style="font-size: 24px; font-weight: bold; color: #4CAF50; margin-bottom: 15px;">
                +${res.data.points} Points Earned!
                ${res.data.bonusApplied ? `<div style="font-size: 14px; color: #FFD700; margin-top: 5px;">🎁 +${res.data.bonusPercentage}% Streak Bonus Applied!</div>` : ''}
              </div>
              <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 10px; margin: 15px 0;">
                <div style="font-size: 16px; margin-bottom: 5px;">🔥 Current Streak</div>
                <div style="font-size: 32px; font-weight: bold;">${res.data.streak} Days</div>
                ${res.data.streak % 30 === 0 ? '<div style="font-size: 12px; margin-top: 5px;">🏆 30-Day Milestone Reached!</div>' : ''}
              </div>
              ${calendarHTML}
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                <div style="background: #f0f0f0; padding: 10px; border-radius: 8px;">
                  <div style="font-size: 12px; color: #666;">Total Points</div>
                  <div style="font-size: 20px; font-weight: bold; color: #667eea;">${res.data.totalPoints}</div>
                </div>
                <div style="background: #f0f0f0; padding: 10px; border-radius: 8px;">
                  <div style="font-size: 12px; color: #666;">Level</div>
                  <div style="font-size: 20px; font-weight: bold; color: #764ba2;">${res.data.levelName}</div>
                </div>
              </div>
              <div style="margin-top: 15px; font-size: 14px; color: #666;">
                ${res.data.streak < 30 ? `Keep your streak going! ${30 - (res.data.streak % 30)} days until next bonus! 🚀` : 'Amazing streak! Keep it up! 🚀'}
              </div>
            </div>
          `,
          confirmButtonText: 'Awesome!',
          confirmButtonColor: '#667eea',
          width: '650px',
          showClass: {
            popup: 'animate__animated animate__bounceIn'
          }
        });
        fetchData();
      } else {
        // Already checked in today
        Swal.fire({
          icon: 'info',
          title: 'Already Checked In',
          text: res.data.message || 'You have already checked in today. Come back tomorrow!',
          confirmButtonColor: '#667eea'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Check-In Failed',
        text: error.response?.data?.message || 'Something went wrong. Please try again.',
        confirmButtonColor: '#f44336'
      });
    }
  };

  const handleRedeem = async (rewardId) => {
    if (!window.confirm('Are you sure you want to redeem this reward?')) return;

    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.post('/gamification/redeem', { rewardId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Redemption failed');
    }
  };

  const fetchMyCodes = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.get('/gift-codes/my-codes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyCodes(res.data.codes || []);
    } catch (error) {
      console.error('Error fetching gift codes:', error);
    }
  };

  const handleRedeemGiftCode = async (reward) => {
    const result = await Swal.fire({
      title: 'Redeem Gift Code',
      text: 'Convert your points into a gift code that can be used for discounts on orders?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4caf50',
      cancelButtonColor: '#f44336',
      confirmButtonText: 'Yes, redeem!'
    });

    if (!result.isConfirmed) return;

    // Debug logging
    console.log('=== REDEEM DEBUG ===');
    console.log('Reward object:', reward);

    try {
      const token = localStorage.getItem('userToken');
      const res = await axios.post('/gamification/redeem-gift-code', {
        rewardId: reward.id || reward._id,
        pointCost: reward.pointsCost || reward.pointCost,
        discountAmount: reward.value || reward.discountAmount || reward.discount || reward.amount || 50
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await Swal.fire({
        title: 'Success!',
        html: `<p>${res.data.message}</p><p><strong>Your Code: ${res.data.code}</strong></p>`,
        icon: 'success',
        confirmButtonColor: '#4caf50'
      });

      fetchData();
      fetchMyCodes();
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: error.response?.data?.message || 'Redemption failed',
        icon: 'error',
        confirmButtonColor: '#f44336'
      });
    }
  };

  if (loading) {
    return <Container><div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-color)' }}>Loading...</div></Container>;
  }

  if (error) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-color)' }}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--btn-primary)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </Container>
    );
  }

  if (!stats) {
    return <Container><div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-color)' }}>No data available</div></Container>;
  }

  const isUnlocked = (achievementId) => {
    return stats.achievements && stats.achievements.some(a => a.id === achievementId);
  };

  return (
    <Container>
      <Header>
        <Title><Gamepad2 size={36} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }} /> Gamification Hub</Title>
        <Subtitle>Earn points, unlock achievements, and climb the leaderboard!</Subtitle>
      </Header>

      <StatsGrid>
        <StatCard $gradient="#1a8754, #20c997">
          <StatValue>{stats.points}</StatValue>
          <StatLabel>Total Points</StatLabel>
        </StatCard>
        <StatCard $gradient="#ff6b6b, #ee5a6f">
          <StatValue>Level {stats.level}</StatValue>
          <StatLabel>{stats.levelName}</StatLabel>
        </StatCard>
        <StatCard $gradient="#4facfe, #00f2fe">
          <StatValue>{stats.achievementCount}</StatValue>
          <StatLabel>Achievements Unlocked</StatLabel>
        </StatCard>
        <StatCard $gradient="#43e97b, #38f9d7">
          <StatValue>{stats.checkInStreak}</StatValue>
          <StatLabel>Day Streak <Flame size={20} style={{ display: 'inline-block', verticalAlign: 'middle' }} /></StatLabel>
        </StatCard>
      </StatsGrid>

      <Section>
        <SectionTitle><Calendar size={24} style={{ marginRight: '8px' }} /> Daily Check-In</SectionTitle>
        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
          Check in daily to earn points and build your streak! Current streak: {stats.checkInStreak} days
        </p>

        {/* Streak Bonus Info */}
        <div style={{
          background: 'var(--input-bg)',
          padding: '15px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'center',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '5px', color: '#f59e0b' }}>🎁 Streak Bonus</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-color)' }}>
            Complete 30 days for +30% bonus on all future check-ins!
          </div>
          <div style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-secondary)' }}>
            Progress: {stats.checkInStreak % 30}/30 days
          </div>
        </div>


        <CheckInButton onClick={handleCheckIn}>
          Check In Now
        </CheckInButton>
      </Section>

      {/* My Gift Codes Section */}
      <Section>
        <SectionTitle><Gift size={24} style={{ marginRight: '8px' }} /> My Gift Codes</SectionTitle>
        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
          Your gift codes - redeem points below to get more!
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
          {['active', 'redeemed', 'expired'].map(filter => (
            <button
              key={filter}
              onClick={() => setGiftCodeFilter(filter)}
              style={{
                background: giftCodeFilter === filter ? 'var(--btn-primary)' : 'transparent',
                color: giftCodeFilter === filter ? 'white' : 'var(--text-color)',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'capitalize',
                transition: 'all 0.3s'
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Gift Code List */}
        {(() => {
          const now = new Date();
          const filteredCodes = myCodes.filter(code => {
            if (giftCodeFilter === 'active') {
              return !code.isUsed && new Date(code.expiresAt) > now;
            } else if (giftCodeFilter === 'redeemed') {
              return code.isUsed;
            } else { // expired
              return !code.isUsed && new Date(code.expiresAt) <= now;
            }
          });

          if (filteredCodes.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <Gift size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <div>No {giftCodeFilter} gift codes</div>
                {giftCodeFilter === 'active' && (
                  <div style={{ fontSize: '13px', marginTop: '8px' }}>
                    Redeem rewards below to get gift codes!
                  </div>
                )}
              </div>
            );
          }

          return (
            <RewardsGrid>
              {filteredCodes.map((code) => (
                <RewardCard
                  key={code._id}
                  style={{
                    opacity: code.isUsed || new Date(code.expiresAt) <= now ? 0.6 : 1,
                    border: `2px solid ${code.isUsed ? '#9E9E9E' : 'var(--btn-primary)'}`
                  }}
                >
                  <RewardName style={{ fontFamily: 'monospace', fontSize: '18px' }}>
                    {code.code}
                  </RewardName>
                  <RewardDesc>₹{code.discountAmount} discount</RewardDesc>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                    {code.isUsed
                      ? `Used on ${new Date(code.usedAt).toLocaleDateString()}`
                      : `Expires: ${new Date(code.expiresAt).toLocaleDateString()}`
                    }
                  </div>
                  {code.isUsed && (
                    <div style={{
                      marginTop: '10px',
                      padding: '6px 12px',
                      background: 'rgba(76, 175, 80, 0.1)',
                      borderRadius: '4px',
                      color: '#4CAF50',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      ✓ Redeemed
                    </div>
                  )}
                  {!code.isUsed && new Date(code.expiresAt) <= now && (
                    <div style={{
                      marginTop: '10px',
                      padding: '6px 12px',
                      background: 'rgba(244, 67, 54, 0.1)',
                      borderRadius: '4px',
                      color: '#f44336',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      ⏰ Expired
                    </div>
                  )}
                </RewardCard>
              ))}
            </RewardsGrid>
          );
        })()}
      </Section>

      {/* Redeem Rewards Section */}
      <Section>
        <SectionTitle><Gift size={24} style={{ marginRight: '8px' }} /> Redeem Rewards</SectionTitle>
        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
          Convert your points into gift codes for discounts
        </p>
        <RewardsGrid>
          {rewards && rewards.filter(r => r.type === 'discount').map(reward => {
            const cost = reward.pointsCost || reward.pointCost || 0;
            const canAfford = stats.points >= cost;
            return (
              <RewardCard key={reward.id || reward._id} style={{ position: 'relative', paddingTop: '30px' }}>
                {/* Points Badge */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: canAfford ? 'linear-gradient(135deg, #1a8754, #20c997)' : 'linear-gradient(135deg, #e67e22, #f39c12)',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Zap size={14} fill="white" /> {cost} Points
                </div>

                <RewardName style={{ marginTop: '10px' }}>{reward.name}</RewardName>

                {/* Show discount value prominently */}
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: 'var(--btn-primary)',
                  margin: '15px 0'
                }}>
                  ₹{reward.value || reward.discountAmount || reward.discount || '0'} OFF
                </div>

                <RewardDesc>{reward.description}</RewardDesc>

                {/* Show if user can afford */}
                {!canAfford && (
                  <div style={{
                    fontSize: '12px',
                    color: '#dc3545',
                    margin: '10px 0 5px',
                    fontWeight: '500'
                  }}>
                    Need {cost - stats.points} more points
                  </div>
                )}

                <RedeemButton
                  onClick={() => handleRedeemGiftCode(reward)}
                  disabled={!canAfford}
                  style={{ marginTop: '15px' }}
                >
                  {!canAfford ? 'Not Enough Points' : 'Redeem Now'}
                </RedeemButton>
              </RewardCard>
            );
          })}
        </RewardsGrid>
      </Section>

      <Section>
        <SectionTitle><Trophy size={24} style={{ marginRight: '8px' }} /> Achievements</SectionTitle>
        <AchievementsGrid>
          {achievements.map(achievement => (
            <AchievementCard key={achievement.id} $unlocked={isUnlocked(achievement.id)}>
              <AchievementIcon>{getAchievementIcon(achievement.icon)}</AchievementIcon>
              <AchievementName $unlocked={isUnlocked(achievement.id)}>{achievement.name}</AchievementName>
              <AchievementDesc $unlocked={isUnlocked(achievement.id)}>{achievement.description}</AchievementDesc>
              <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                +{achievement.points} points
              </div>
            </AchievementCard>
          ))}
        </AchievementsGrid>
      </Section>

      <Section>
        <SectionTitle><TrendingUp size={24} style={{ marginRight: '8px' }} /> Leaderboard</SectionTitle>
        <TabContainer>
          <Tab $active={leaderboardPeriod === 'all'} onClick={() => setLeaderboardPeriod('all')}>All Time</Tab>
          <Tab $active={leaderboardPeriod === 'monthly'} onClick={() => setLeaderboardPeriod('monthly')}>Monthly</Tab>
          <Tab $active={leaderboardPeriod === 'weekly'} onClick={() => setLeaderboardPeriod('weekly')}>Weekly</Tab>
        </TabContainer>
        <LeaderboardTable>
          <tbody>
            {leaderboard.map((user, index) => (
              <LeaderboardRow key={index}>
                <LeaderboardCell>
                  <Rank rank={index + 1}>#{index + 1}</Rank>
                </LeaderboardCell>
                <LeaderboardCell>{user.userId?.name || 'Anonymous'}</LeaderboardCell>
                <LeaderboardCell>{user.points} points</LeaderboardCell>
                <LeaderboardCell>Level {user.level} - {user.levelName}</LeaderboardCell>
              </LeaderboardRow>
            ))}
          </tbody>
        </LeaderboardTable>
      </Section>

    </Container>
  );
};

export default Gamification;
