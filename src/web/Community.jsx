import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { MessageSquare, Heart, Bookmark, History } from 'lucide-react';
import { supabase } from '../supabase';
import './Community.css';

const Community = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
        if (error) {
           console.warn("Table not found, using fallback data.");
           setPosts([
             { id: 1, user_name: "Sarah J.", user_avatar: "SJ", location: "Block A", text: "Found great deals at the market today!", likes: 12, comments: 4, created_at: new Date().toISOString() },
             { id: 2, user_name: "Rahul M.", user_avatar: "RM", location: "Block C", text: "Anyone need a plumber? Found a good one.", likes: 8, comments: 2, created_at: new Date().toISOString() }
           ]);
           return;
        }
        setPosts(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const formatTime = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  const handleLike = async (postId, currentLikes) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, likes_count: (p.likes_count !== undefined ? p.likes_count : (p.likes || 0)) + 1 };
      }
      return p;
    }));

    toast.success('Recommendation liked!');

    if (typeof postId === 'string') {
      try {
        await supabase.from('posts').update({ likes_count: currentLikes + 1 }).eq('id', postId);
      } catch (err) {
        console.error("Error updating likes:", err);
      }
    }
  };

  return (
    <section className="community" id="community">
      <div className="container">
        <div className="section-header">
           <span className="badge-primary">Community Voice</span>
           <h3 className="section-title">Neighborhood <span className="highlight">Recommends</span></h3>
        </div>
        
        <div className="community-grid">
          {loading ? (
            <div className="admin-loading"><History className="animate-spin" /> Gathering neighborhood voices...</div>
          ) : posts.length === 0 ? (
            <p className="text-center w-full">No community recommendations yet.</p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="community-card glass card-hover flex-column">
                <div className="user-info">
                  <div className="user-avatar gradient-bg">{post.user_avatar || 'AN'}</div>
                  <div className="user-details">
                    <strong>{post.user_name || 'Anonymous Neighbor'}</strong>
                    <span>{post.location || 'Local Area'}</span>
                  </div>
                </div>
                <p className="recommendation-text">"{post.content || post.text}"</p>
                <div className="recommendation-footer">
                  <div className="actions">
                    <button onClick={() => handleLike(post.id, post.likes_count !== undefined ? post.likes_count : (post.likes || 0))}>
                      <Heart size={16} /> {post.likes_count !== undefined ? post.likes_count : (post.likes || 0)}
                    </button>
                    <button onClick={() => toast('Opening discussion...', { icon: '💬' })}>
                      <MessageSquare size={16} /> {post.comments || 0}
                    </button>
                  </div>
                  <span className="time">{formatTime(post.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Community;
