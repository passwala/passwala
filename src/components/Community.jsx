import React from 'react';
import { toast } from 'react-hot-toast';
import { MessageSquare, Heart, Bookmark } from 'lucide-react';
import './Community.css';

const Community = () => {
  return (
    <section className="community" id="community">
      <div className="container">
        <div className="section-header">
           <span className="badge-primary">Community Voice</span>
           <h3 className="section-title">Neighborhood <span className="highlight">Recommends</span></h3>
        </div>
        
        <div className="community-grid">
          <div className="community-card glass card-hover flex-column">
             <div className="user-info">
                <div className="user-avatar gradient-bg">JD</div>
                <div className="user-details">
                   <strong>Jane Doe</strong>
                   <span>Satellite Resident</span>
                </div>
             </div>
             <p className="recommendation-text">
                "I just got my AC fixed by Vikas Tech and the experience was amazing. Transparent pricing and local trust! Highly recommend for anyone in Ahmedabad."
             </p>
             <div className="recommendation-footer">
                <div className="actions">
                    <button onClick={() => toast.success('Recommendation liked!')}><Heart size={16} /> 12</button>
                    <button onClick={() => toast('Opening discussion...', { icon: '💬' })}><MessageSquare size={16} /> 3</button>
                </div>
                <span className="time">2 hours ago</span>
             </div>
          </div>

          <div className="community-card glass card-hover flex-column focus">
             <div className="user-info">
                <div className="user-avatar gradient-bg">PK</div>
                <div className="user-details">
                   <strong>Priya K.</strong>
                   <span>Vastrapur Resident</span>
                </div>
             </div>
             <p className="recommendation-text">
                "The milk delivery from Local Fresh is consistently early. Best quality in the neighborhood so far! 🥛"
             </p>
             <div className="recommendation-footer">
                <div className="actions">
                    <button onClick={() => toast.success('Recommendation liked!')}><Heart size={16} /> 45</button>
                    <button onClick={() => toast('Opening discussion...', { icon: '💬' })}><MessageSquare size={16} /> 8</button>
                </div>
                <span className="time">5 hours ago</span>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Community;
