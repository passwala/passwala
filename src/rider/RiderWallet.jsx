import React from 'react';
import { IndianRupee, ArrowDownCircle, ArrowUpCircle, Wallet, History, Banknote } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './RiderPortal.css'; // Import custom styles

function RiderWallet({ stats }) {
  const transactions = [];

  const handlePayout = () => {
    toast.success('Payout request of ₹1,500 initiated successfully!');
  };

  return (
    <div className="rider-screen">
      <h2 className="rider-title">Wallet</h2>

      <div className="rider-gradient-card" style={{ background: 'linear-gradient(135deg, #2563eb, #4338ca)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Wallet color="#bfdbfe" size={24} />
            <p style={{ color: '#dbeafe', fontWeight: 500, letterSpacing: '0.05em', margin: 0 }}>Available Balance</p>
         </div>
         <h3 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1.5rem', marginTop: 0 }}>₹{stats?.earnings || 0}</h3>
         
         <div style={{ display: 'flex', gap: '0.75rem' }}>
             <button onClick={handlePayout} style={{ flex: 1, background: 'white', color: '#1d4ed8', padding: '0.75rem', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
                Request Payout
             </button>
         </div>
      </div>

      <div className="rider-grid-2">
         <div className="rider-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--rider-danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--rider-text-secondary)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cash in Hand</span>
                <Banknote size={18} color="var(--rider-danger)" />
            </div>
            <p style={{ fontWeight: 700, fontSize: '1.5rem', margin: 0 }}>₹0</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-danger)', marginTop: '0.5rem', fontWeight: 600, margin: '0.5rem 0 0 0' }}>To be deposited</p>
         </div>
         <div className="rider-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--rider-success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--rider-text-secondary)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Online</span>
                <IndianRupee size={18} color="var(--rider-success)" />
            </div>
            <p style={{ fontWeight: 700, fontSize: '1.5rem', margin: 0 }}>₹{stats?.earnings || 0}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-success)', marginTop: '0.5rem', fontWeight: 600, margin: '0.5rem 0 0 0' }}>Paid to wallet</p>
         </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontWeight: 700, margin: 0 }}>Recent Transactions</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--rider-primary)', fontWeight: 700, cursor: 'pointer' }}>View All</span>
         </div>
         
         {transactions.length > 0 ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {transactions.map((txn, i) => (
                   <div key={i} className="rider-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                         <div style={{ background: txn.type === 'credit' ? '#dcfce7' : '#fee2e2', color: txn.type === 'credit' ? 'var(--rider-success)' : 'var(--rider-danger)', padding: '0.5rem', borderRadius: '50%' }}>
                            {txn.type === 'credit' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                         </div>
                         <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>{txn.title}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: '0.25rem 0 0 0' }}>{txn.time}</p>
                         </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: txn.type === 'credit' ? 'var(--rider-success)' : 'var(--rider-text-primary)', fontSize: '1rem', margin: 0 }}>
                             {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                          </p>
                      </div>
                   </div>
                ))}
             </div>
         ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'white', borderRadius: '16px', border: '1px solid var(--rider-border)' }}>
               <Wallet size={32} color="#d1d5db" style={{ margin: '0 auto 0.5rem auto' }} />
               <p style={{ fontWeight: 600, color: 'var(--rider-text-secondary)', margin: 0 }}>No transactions yet.</p>
            </div>
         )}
      </div>
    </div>
  );
}

export default RiderWallet;
