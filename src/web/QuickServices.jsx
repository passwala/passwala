import React from 'react';
import { toast } from 'react-hot-toast';
import { PenTool, Zap, Droplets, Hammer, Trash2, Monitor } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './QuickServices.css';

const services = [
  { id: 301, name: 'AC Repair',    icon: <PenTool />, price: 999,  provider: 'Vikas Tech' },
  { id: 302, name: 'Electrician', icon: <Zap />,      price: 299,  provider: 'Sparky' },
  { id: 303, name: 'Plumber',     icon: <Droplets />, price: 399,  provider: 'AquaFix' },
  { id: 304, name: 'Carpenter',   icon: <Hammer />,   price: 499,  provider: 'WoodWorks' },
  { id: 305, name: 'Cleaning',    icon: <Trash2 />,   price: 2999, provider: 'CleanPro' },
  { id: 306, name: 'Appliance',   icon: <Monitor />,  price: 599,  provider: 'FixIt Zone' },
];

const QuickServices = () => {
  const { addToCart } = useCart();
  return (
    <section className="quick-services">
      <div className="container">
        <h3 className="section-title">Quick Services</h3>
        <div className="services-grid-icon">
          {services.map(s => (
            <div 
              key={s.id} 
              className="service-icon-card glass card-hover" 
              onClick={() => {
              addToCart({ id: s.id, name: s.name, price: s.price, provider: s.provider, type: 'service' });
              toast.success(`${s.name} added to cart! 🛒`, { icon: '🛠️' });
            }}
            >
              <div className="icon-box">{s.icon}</div>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickServices;
