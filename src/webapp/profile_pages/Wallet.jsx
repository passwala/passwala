import React, { useState } from 'react';
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

const Wallet = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(452.50);
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'DEBIT', title: 'Order Payment', amount: -150.00, date: 'Mar 28', status: 'COMPLETED' },
    { id: 2, type: 'CREDIT', title: 'Referral Bonus', amount: 50.00, date: 'Mar 25', status: 'COMPLETED' },
    { id: 3, type: 'CREDIT', title: 'Added Money', amount: 500.00, date: 'Mar 20', status: 'COMPLETED' },
    { id: 4, type: 'DEBIT', title: 'Milk Subscription', amount: -45.00, date: 'Mar 18', status: 'COMPLETED' }
  ]);

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
           {transactions.map((tx, idx) => (
             <div key={tx.id} className="transaction-item glass card-hover">
                <div className="tx-left">
                   <div className={`tx-icon-box ${tx.type.toLowerCase()}`}>
                      {tx.type === 'DEBIT' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                   </div>
                   <div className="tx-text">
                      <strong>{tx.title}</strong>
                      <span>{tx.date} • {tx.status}</span>
                   </div>
                </div>
                <div className={`tx-amount ${tx.type.toLowerCase()}`}>
                   {tx.type === 'DEBIT' ? '-' : '+'}₹{Math.abs(tx.amount).toFixed(2)}
                </div>
             </div>
           ))}
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
