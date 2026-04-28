/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  MessageSquare, 
  Bell, 
  Plus, 
  Search, 
  MapPin, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Camera,
  Link2 as LinkIcon,
  Sparkles
} from 'lucide-react';
import './NeighborsCommunity.css';
import { supabase } from '../../supabase';

const NeighborsCommunity = ({ onBack, location }) => {
  const currentArea = location?.split(',')[0] || 'Greenwood Hills';
  const currentFull = location || 'Ahmedabad, Gujarat';
  const [activeTab, setActiveTab] = useState('Feed');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ... rest of the code should map user_name to user etc in the render
  
  const groups = [
    { id: 1, name: 'Join', icon: <Plus size={24} />, isAction: true },
    { id: 2, name: 'Greenwood', initial: 'G', color: '#ff7622' },
    { id: 3, name: 'Local Safety', initial: 'L', color: '#64748b' },
    { id: 4, name: 'Pet Lovers', initial: 'P', color: '#ffb800' },
    { id: 5, name: 'Market', initial: 'M', color: '#ff7622' }
  ];

  const tabs = ['Feed', 'Groups', 'Safety', 'For Sale'];

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPosts(data || []);
    } catch (err) {
      console.error('Fetch posts error:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="community-page">
      <header className="community-header minimal">

        {/* Groups Horizontal Scroll */}
        <div className="groups-container">
          {groups.map((group) => (
            <div key={group.id} className="group-item" onClick={() => toast(`Joining ${group.name}...`)}>
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`group-circle ${group.isAction ? 'action-group' : ''}`}
                style={!group.isAction ? { border: `2.5px solid ${group.color}`, color: group.color } : {}}
              >
                {group.isAction ? group.icon : group.initial}
              </motion.div>
              <span>{group.name}</span>
            </div>
          ))}
        </div>

        {/* Section Tabs */}
        <div className="community-tabs">
          {tabs.map((tab) => (
            <button 
              key={tab} 
              className={`comm-tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="community-feed">
        {loading ? (
          <div className="discovery-loading">
            <div className="spinner"></div>
            <p>Gathering neighborhood updates...</p>
          </div>
        ) : (
          <>
            {/* Create Post Input */}
            <div className="create-post-card">
              <div className="user-avatar-small">U</div>
              <div className="input-wrapper-comm">
                <input 
                  type="text" 
                  placeholder="What's on your mind?" 
                  onFocus={() => toast.success('Tap to type your neighborhood update!')}
                />
                <div className="input-actions-comm">
                   <Camera size={18} onClick={() => toast('Opening Camera...')} />
                   <LinkIcon size={18} onClick={() => toast('Add Link coming soon!')} />
                </div>
              </div>
            </div>

            {/* Posts List */}
            <div className="posts-list">
              {posts.length === 0 && <p className="empty-state">No real updates yet. Be the first!</p>}
              {posts.map((post, i) => (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="post-card"
                >
                  <div className="post-header">
                     <div className="post-user-info">
                        <div className="post-avatar-initials">P</div>
                        <div className="name-time">
                           <div className="name-badge-row">
                              <h3>Passwala Resident</h3>
                              <div className="neighbor-verified-tag">VERIFIED</div>
                           </div>
                           <p>Satellite, Ahmedabad • <span>{new Date(post.created_at).toLocaleDateString()}</span></p>
                        </div>
                     </div>
                     <button className="post-more-btn" onClick={() => toast('Post options available soon.')}><MoreHorizontal size={18} /></button>
                  </div>
                  
                  <div className="post-body">
                     <p>{post.content}</p>
                     {post.image && (
                       <div className="post-image-wrapper">
                          <img src={post.image} alt="Post content" />
                       </div>
                     )}
                  </div>

                  <div className="post-actions-bar">
                     <div className="left-actions">
                        <button className="post-action-item" onClick={() => toast.success('Post Liked! ❤️')}><Heart size={18} /> {post.likes_count || 0}</button>
                        <button className="post-action-item" onClick={() => toast('Opening comments...')}><MessageSquare size={18} /> 0</button>
                        <button className="post-action-item second-btn" onClick={() => toast.success('You seconded this recommendation! ⭐')}>
                           <Sparkles size={16} color="var(--primary)" /> <span>Second</span>
                        </button>
                     </div>
                     <button className="post-action-item" onClick={() => toast.success('Share link copied!')}><Share2 size={18} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default NeighborsCommunity;
