/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Wallet as WalletIcon, 
  Plus, 
  ChevronRight, 
  CreditCard, 
  ShieldCheck,
  History,
  TrendingDown,
  TrendingUp,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './ProfilePages.css';
import { supabase } from '../../supabase';

const Wallet = ({ user }) => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch balance from users table (assuming wallet_balance exists)
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .maybeSingle();
      
      if (userData && userData.wallet_balance !== undefined) {
        setBalance(userData.wallet_balance || 0);
      }

      // Fetch transactions (assuming wallet_transactions table)
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (txData) {
        setTransactions(txData);
      }
    } catch (err) {
      console.error('Failed to fetch wallet data', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchWalletData();
    } else {
      setLoading(false);
    }
  }, [user, fetchWalletData]);

  const handleAddBalance = () => {
    toast.success('Paytm/PhonePe Integration coming soon!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="profile-sub-page"
    >
      <header className="sub-page-header">
        <button className="back-btn-profile" onClick={() => navigate('/profile')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Passwala Wallet</h1>
      </header>

      <main className="wallet-content">
        <div className="wallet-card premium-orange-gradient">
           <div className="wallet-card-overlay"></div>
           <div className="wallet-card-header">
              <div className="card-logo">P</div>
              <ShieldCheck size={24} color="rgba(255,255,255,0.7)" />
           </div>
           <div className="wallet-balance-info">
              <span>AVAILABLE BALANCE</span>
              <h2>₹{balance.toFixed(2)}</h2>
           </div>
           <div className="wallet-card-bottom">
              <p>4521 •••• •••• 8932</p>
              <div className="card-brand">VIRTUAL</div>
           </div>
        </div>

        <div className="wallet-actions-row">
           <button className="wallet-action-btn" onClick={handleAddBalance}>
              <div className="action-icon add"><Plus size={24} /></div>
              <span>Add Money</span>
           </button>
           <button className="wallet-action-btn" onClick={() => toast('Transfer money functionality is under audit.')}>
              <div className="action-icon send"><CreditCard size={24} /></div>
              <span>Send Money</span>
           </button>
           <button className="wallet-action-btn" onClick={() => toast.success('50 Heroes Points Earned Today!')}>
              <div className="action-icon rewards"><Award size={24} /></div>
              <span>Rewards</span>
           </button>
        </div>

        <div className="section-header-compact">
           <h3>RECENT TRANSACTIONS</h3>
           <button className="view-all-link">SEE ALL</button>
        </div>

        <div className="transaction-list">
           {transactions.length === 0 && !loading && (
             <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No transactions yet</div>
           )}
           {transactions.map((tx, idx) => {
             const typeStr = tx.type || (tx.amount < 0 ? 'DEBIT' : 'CREDIT');
             const displayDate = tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (tx.date || 'Today');
             return (
               <div key={tx.id || idx} className="transaction-item glass card-hover">
                  <div className="tx-left">
                     <div className={`tx-icon-box ${typeStr.toLowerCase()}`}>
                        {typeStr === 'DEBIT' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                     </div>
                     <div className="tx-text">
                        <strong>{tx.title || tx.description || 'Wallet Transaction'}</strong>
                        <span>{displayDate} • {tx.status || 'COMPLETED'}</span>
                     </div>
                  </div>
                  <div className={`tx-amount ${typeStr.toLowerCase()}`}>
                     {typeStr === 'DEBIT' ? '-' : '+'}₹{Math.abs(tx.amount || 0).toFixed(2)}
                  </div>
               </div>
             );
           })}
        </div>

        <div className="wallet-security-banner glass">
           <ShieldCheck size={24} color="var(--primary)" />
           <div className="security-text">
              <strong>Bank-Grade Encryption</strong>
              <p>Your transactions are 100% secure with Passwala Trust Shield.</p>
           </div>
        </div>
      </main>
    </motion.div>
  );
};

export default Wallet;
