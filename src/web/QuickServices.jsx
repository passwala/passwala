import React from 'react';
import { toast } from 'react-hot-toast';
import { PenTool, Zap, Droplets, Hammer, Trash2, Monitor } from 'lucide-react';
import { supabase } from '../supabase';
import './QuickServices.css';


const QuickServices = () => {
  const [categories, setCategories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data, error } = await supabase.from('service_categories').select('*').limit(6);
        if (!error && data) {
          setCategories(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCats();
  }, []);

  const getFallbackIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('ac')) return <PenTool />;
    if (n.includes('elect')) return <Zap />;
    if (n.includes('plumb')) return <Droplets />;
    if (n.includes('carp')) return <Hammer />;
    if (n.includes('clean')) return <Trash2 />;
    return <Monitor />;
  };

  return (
    <section className="quick-services">
      <div className="container">
        <h3 className="section-title">Quick Services</h3>
        <div className="services-grid-icon">
          {loading ? (
            <div style={{ padding: '2rem', color: '#64748b', textAlign: 'center', width: '100%' }}>Loading services...</div>
          ) : categories.length === 0 ? (
            <div style={{ padding: '2rem', color: '#64748b', textAlign: 'center', width: '100%' }}>No services listed yet.</div>
          ) : (
            categories.map(s => (
              <div 
                key={s.id} 
                className="service-icon-card glass card-hover" 
                onClick={() => {
                  toast(`Explore ${s.name} in the local hub!`, { icon: '🔍' });
                }}
              >
                <div className="icon-box">
                  {s.icon_url ? <img src={s.icon_url} alt={s.name} style={{ width: '24px', height: '24px' }} /> : getFallbackIcon(s.name)}
                </div>
                <span>{s.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default QuickServices;
