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
import { DEFAULT_LOCATION } from '../../utils/constants';
import { useTranslation } from '../LanguageContext';

const NeighborsCommunity = ({ onBack, location }) => {
  const { t } = useTranslation();
  const currentArea = location?.split(',')[0] || 'Greenwood Hills';
  const currentFull = location || DEFAULT_LOCATION;
  const [activeTab, setActiveTab] = useState('Feed');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('passwala_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [groups, setGroups] = useState([
    { id: 1, name: 'Join', icon: <Plus size={24} />, isAction: true },
    { id: 2, name: 'Greenwood', initial: 'G', color: '#ff7622' },
    { id: 3, name: 'Local Safety', initial: 'L', color: 'var(--text-secondary)' },
    { id: 4, name: 'Pet Lovers', initial: 'P', color: '#ffb800' },
    { id: 5, name: 'Market', initial: 'M', color: '#ff7622' }
  ]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const tabs = [
    { key: 'Feed', label: t('feed') },
    { key: 'Groups', label: t('groups') },
    { key: 'Safety', label: t('safety') },
    { key: 'For Sale', label: t('for_sale') }
  ];

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      if (!supabase) return;

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users (
            full_name,
            photo_url
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formatted = (data || []).map(p => ({
        ...p,
        user_name: p.users?.full_name || 'Passwala Resident',
        user_photo: p.users?.photo_url
      }));

      setPosts(formatted);
    } catch (err) {
      console.error('Fetch posts error:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = () => {
    const name = prompt("Enter new Group Hub name:");
    if (!name) return;
    const initials = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 2);
    const colors = ['#ff7622', '#64748b', '#ffb800', '#10b981', '#3b82f6', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    setGroups(prev => [
      ...prev.slice(0, 1),
      { id: Date.now(), name, initial: initials || 'N', color: randomColor },
      ...prev.slice(1)
    ]);
    toast.success(`Created & Joined group: ${name}! 🎉`);
  };

  const handleSelectGroup = (group) => {
    if (group.isAction) {
      handleJoinGroup();
      return;
    }
    if (selectedGroupId === group.id) {
      setSelectedGroupId(null);
      toast(`Cleared filter: showing all posts.`);
    } else {
      setSelectedGroupId(group.id);
      setActiveTab('Groups');
      toast.success(`Filtering posts for: ${group.name} Hub`);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) {
      toast.error('Post content cannot be empty!');
      return;
    }
    
    setSubmitting(true);
    try {
      const uId = currentUser?.id || currentUser?.uid;
      if (!uId) {
        toast.error('You must be logged in to post.');
        setSubmitting(false);
        return;
      }

      let targetUserId = currentUser.id;
      if (!targetUserId || targetUserId.length !== 36) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('id')
          .eq('uid', uId)
          .maybeSingle();
        if (userProfile) {
          targetUserId = userProfile.id;
        }
      }

      if (!targetUserId) {
        toast.error('User profile not resolved in database. Please complete your profile.');
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert([{
          user_id: targetUserId,
          content: newPostContent,
          image_url: newPostImage || null,
          likes_count: 0
        }])
        .select(`
          *,
          users (
            full_name,
            photo_url
          )
        `)
        .single();

      if (error) throw error;

      toast.success('Post published successfully! 🚀');
      
      const newFormattedPost = {
        ...data,
        user_name: data.users?.full_name || currentUser.displayName || 'Passwala Resident',
        user_photo: data.users?.photo_url || currentUser.photoURL
      };

      setPosts(prev => [newFormattedPost, ...prev]);
      setNewPostContent('');
      setNewPostImage('');
      setShowImageInput(false);
    } catch (err) {
      console.error('Create post error:', err);
      toast.error('Failed to publish post: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikePost = async (postId, currentLikes) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ likes_count: (currentLikes || 0) + 1 })
        .eq('id', postId);

      if (error) throw error;
      
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p));
      toast.success('Post Liked! ❤️');
    } catch (err) {
      console.error('Like post error:', err);
      toast.error('Failed to like post.');
    }
  };

  const filteredPosts = posts.filter(post => {
    const contentLower = (post.content || '').toLowerCase();
    
    if (selectedGroupId) {
      const selectedGroup = groups.find(g => g.id === selectedGroupId);
      if (!selectedGroup) return true;
      const gName = selectedGroup.name.toLowerCase();
      
      if (gName === 'greenwood') {
        return contentLower.includes('greenwood') || contentLower.includes('society') || contentLower.includes('lawn') || contentLower.includes('garden') || contentLower.includes('meeting') || contentLower.includes('hub');
      } else if (gName === 'local safety') {
        return contentLower.includes('safety') || contentLower.includes('safe') || contentLower.includes('guard') || contentLower.includes('alert') || contentLower.includes('locked') || contentLower.includes('theft') || contentLower.includes('lost');
      } else if (gName === 'pet lovers') {
        return contentLower.includes('pet') || contentLower.includes('dog') || contentLower.includes('cat') || contentLower.includes('puppy') || contentLower.includes('kitten') || contentLower.includes('vet');
      } else if (gName === 'market') {
        return contentLower.includes('sale') || contentLower.includes('price') || contentLower.includes('₹') || contentLower.includes('rs') || contentLower.includes('sell') || contentLower.includes('buy') || contentLower.includes('available');
      } else {
        return contentLower.includes(gName) || gName.includes(contentLower);
      }
    }

    if (activeTab === 'Feed') return true;
    if (activeTab === 'Groups') return true;
    if (activeTab === 'Safety') {
      return contentLower.includes('safety') || contentLower.includes('safe') || contentLower.includes('guard') || contentLower.includes('alert') || contentLower.includes('locked') || contentLower.includes('theft') || contentLower.includes('lost') || contentLower.includes('danger') || contentLower.includes('caution');
    }
    if (activeTab === 'For Sale') {
      return contentLower.includes('sale') || contentLower.includes('price') || contentLower.includes('₹') || contentLower.includes('rs') || contentLower.includes('sell') || contentLower.includes('buy') || contentLower.includes('available');
    }
    return true;
  });

  return (
    <div className="community-page">
      <header className="community-header minimal">

        {/* Groups Horizontal Scroll */}
        <div className="groups-container" style={{ position: 'relative' }}>
          {groups.map((group) => (
            <div 
              key={group.id} 
              className={`group-item ${selectedGroupId === group.id ? 'active-group-filter' : ''}`}
              style={{ opacity: selectedGroupId && selectedGroupId !== group.id ? 0.5 : 1 }} 
              onClick={() => handleSelectGroup(group)}
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`group-circle ${group.isAction ? 'action-group' : ''}`}
                style={!group.isAction ? { border: selectedGroupId === group.id ? `3px solid var(--primary)` : `2.5px solid ${group.color}`, color: group.color } : {}}
              >
                {group.isAction ? group.icon : group.initial}
              </motion.div>
              <span>{group.isAction ? t('join') : group.name === 'Local Safety' ? t('safety') : group.name === 'Market' ? t('for_sale') : group.name}</span>
            </div>
          ))}
        </div>

        {/* Section Tabs */}
        <div className="community-tabs">
          {tabs.map((tab) => (
            <button 
              key={tab.key} 
              className={`comm-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedGroupId(null); // Clear group filter when changing main tab
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="community-feed">
        {loading ? (
          <div className="discovery-loading">
            <div className="spinner"></div>
            <p>{t('gathering_updates')}</p>
          </div>
        ) : (
          <>
            {/* Create Post Input */}
            <form onSubmit={handleCreatePost} className="create-post-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="user-avatar-small">{currentUser?.displayName?.substring(0, 1).toUpperCase() || 'U'}</div>
                <div className="input-wrapper-comm" style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    placeholder={t('whats_on_mind')} 
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    style={{ width: '85%' }}
                  />
                  <div className="input-actions-comm">
                     <Camera size={18} style={{ cursor: 'pointer' }} onClick={() => setShowImageInput(!showImageInput)} />
                     <LinkIcon size={18} style={{ cursor: 'pointer' }} onClick={() => setShowImageInput(!showImageInput)} />
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="comm-tab-btn active" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                  {submitting ? '...' : t('post')}
                </button>
              </div>
              
              {showImageInput && (
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.25rem 1rem' }}>
                  <input 
                    type="text" 
                    placeholder={t('paste_image_url')} 
                    value={newPostImage}
                    onChange={(e) => setNewPostImage(e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              )}
            </form>

            {/* Posts List */}
            <div className="posts-list">
              {filteredPosts.length === 0 && <p className="empty-state">{t('no_updates_yet')}</p>}
              {filteredPosts.map((post, i) => (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="post-card"
                >
                  <div className="post-header">
                     <div className="post-user-info">
                        <div className="post-avatar-initials" style={{ overflow: 'hidden' }}>
                           {post.user_photo ? <img src={post.user_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (post.user_name?.substring(0, 1).toUpperCase() || 'P')}
                        </div>
                        <div className="name-time">
                           <div className="name-badge-row">
                              <h3>{post.user_name}</h3>
                              <div className="neighbor-verified-tag">{t('verified')}</div>
                           </div>
                           <p>Satellite, Ahmedabad • <span>{new Date(post.created_at).toLocaleDateString()}</span></p>
                        </div>
                     </div>
                     <button className="post-more-btn" onClick={() => toast('Post options available soon.')}><MoreHorizontal size={18} /></button>
                  </div>
                  
                  <div className="post-body">
                     <p>{post.content}</p>
                     {(post.image_url || post.image) && (
                       <div className="post-image-wrapper">
                          <img src={post.image_url || post.image} alt="Post content" />
                       </div>
                     )}
                  </div>

                  <div className="post-actions-bar">
                     <div className="left-actions">
                        <button className="post-action-item" onClick={() => handleLikePost(post.id, post.likes_count)}><Heart size={18} /> {post.likes_count || 0}</button>
                        <button className="post-action-item" onClick={() => toast('Opening comments...')}><MessageSquare size={18} /> 0</button>
                        <button className="post-action-item second-btn" onClick={() => toast.success('You seconded this recommendation! ⭐')}>
                           <Sparkles size={16} color="var(--primary)" /> <span>{t('second_btn')}</span>
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

