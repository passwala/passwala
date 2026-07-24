import React, { useState } from 'react';
import { ArrowLeft, Gift, Sparkles, Send, CreditCard, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './GiftCards.css';

const TEMPLATES = [
  { id: 'festival', label: '🪔 Festival', bg: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)', text: '#ffffff' },
  { id: 'birthday', label: '🎂 Birthday', bg: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', text: '#ffffff' },
  { id: 'congrats', label: '🎉 Congrats', bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', text: '#ffffff' },
  { id: 'general', label: '🎁 Gift', bg: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)', text: '#ffffff' }
];

const PRESETS = [250, 500, 1000, 2000, 5000];

const GiftCards = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    senderName: '',
    message: ''
  });

  const handlePresetClick = (val) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const val = e.target.value;
    setCustomAmount(val);
    if (val && !isNaN(val)) {
      setAmount(parseInt(val));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.recipientName || !formData.recipientEmail || !formData.senderName) {
      toast.error('Please fill in all recipient details.');
      return;
    }
    if (amount < 100) {
      toast.error('Minimum gift card amount is ₹100.');
      return;
    }

    toast.loading('Initializing gift card checkout...');
    setTimeout(() => {
      toast.dismiss();
      toast.success(`Gift card of ₹${amount} sent successfully to ${formData.recipientName}!`);
      navigate('/');
    }, 1500);
  };

  return (
    <div className="gc-root">
      <div className="gc-header">
        <button className="gc-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h2>Purchase Gift Cards</h2>
      </div>

      <div className="gc-container">
        {/* Left Col: Preview Card */}
        <div className="gc-preview-col">
          <h3 className="gc-section-title">Card Preview</h3>
          <div className="gc-preview-card" style={{ background: selectedTemplate.bg, color: selectedTemplate.text }}>
            <div className="gc-card-top">
              <div className="gc-logo-wrap">
                <Gift size={28} />
                <span>Passwala</span>
              </div>
              <span className="gc-card-badge">E-GIFT CARD</span>
            </div>
            <div className="gc-card-mid">
              <h3>{formData.recipientName || 'Recipient Name'}</h3>
              {formData.message && <p className="gc-card-msg">"{formData.message}"</p>}
            </div>
            <div className="gc-card-bottom">
              <div className="gc-val-label">
                <span>VALUE</span>
                <h4>₹{amount}</h4>
              </div>
              <span className="gc-card-sender">From: {formData.senderName || 'Sender Name'}</span>
            </div>
          </div>

          <div className="gc-template-row">
            {TEMPLATES.map(temp => (
              <button 
                key={temp.id} 
                className={`gc-temp-btn ${selectedTemplate.id === temp.id ? 'active' : ''}`}
                onClick={() => setSelectedTemplate(temp)}
              >
                {temp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Col: Details Form */}
        <form className="gc-form-col" onSubmit={handleSubmit}>
          <h3 className="gc-section-title">Select Amount (INR)</h3>
          <div className="gc-preset-row">
            {PRESETS.map(val => (
              <button 
                key={val} 
                type="button"
                className={`gc-preset-btn ${amount === val && !customAmount ? 'active' : ''}`}
                onClick={() => handlePresetClick(val)}
              >
                ₹{val}
              </button>
            ))}
          </div>

          <div className="gc-custom-wrap">
            <label>Or enter custom amount (Min ₹100):</label>
            <div className="gc-custom-input-box">
              <span>₹</span>
              <input 
                type="number" 
                placeholder="Other Amount" 
                value={customAmount} 
                onChange={handleCustomAmountChange}
                min="100"
              />
            </div>
          </div>

          <h3 className="gc-section-title" style={{ marginTop: '1.5rem' }}>Gift Details</h3>
          <div className="gc-form-grid">
            <div className="gc-input-group">
              <label>Recipient Name *</label>
              <input 
                type="text" 
                name="recipientName" 
                placeholder="Who is this for?" 
                value={formData.recipientName} 
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="gc-input-group">
              <label>Recipient Email *</label>
              <input 
                type="email" 
                name="recipientEmail" 
                placeholder="Where to deliver card?" 
                value={formData.recipientEmail} 
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="gc-input-group">
              <label>Sender Name *</label>
              <input 
                type="text" 
                name="senderName" 
                placeholder="Your Name" 
                value={formData.senderName} 
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="gc-input-group full-width">
              <label>Personal Message</label>
              <textarea 
                name="message" 
                placeholder="Write a sweet note..." 
                value={formData.message} 
                onChange={handleInputChange}
                maxLength={120}
              />
            </div>
          </div>

          <button type="submit" className="gc-submit-btn">
            <CreditCard size={18} />
            <span>Pay & Send Gift Card (₹{amount})</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default GiftCards;
