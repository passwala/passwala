import React from 'react';
import './Skeletons.css';

/**
 * Standard pulse skeleton base block
 */
export const SkeletonBlock = ({ width, height, borderRadius = '8px', className = '' }) => {
  return (
    <div
      className={`skeleton-block ${className}`}
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius
      }}
    />
  );
};

/**
 * Shop Card Skeletons Grid
 */
export const ShopSkeleton = ({ count = 3 }) => {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card shop-skeleton">
          <SkeletonBlock height="140px" borderRadius="16px 16px 0 0" />
          <div className="skeleton-card-body" style={{ padding: '16px' }}>
            <SkeletonBlock width="60%" height="22px" style={{ marginBottom: '12px' }} />
            <SkeletonBlock width="40%" height="16px" style={{ marginBottom: '8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <SkeletonBlock width="30%" height="16px" />
              <SkeletonBlock width="20%" height="16px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Order Card Skeletons List
 */
export const OrderSkeleton = ({ count = 3 }) => {
  return (
    <div className="skeleton-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card order-skeleton" style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <SkeletonBlock width="120px" height="18px" style={{ marginBottom: '6px' }} />
              <SkeletonBlock width="80px" height="12px" />
            </div>
            <SkeletonBlock width="80px" height="24px" borderRadius="12px" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #f1f5f9' }}>
            <SkeletonBlock width="100px" height="16px" />
            <SkeletonBlock width="60px" height="18px" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Event Card Skeletons List
 */
export const EventSkeleton = ({ count = 2 }) => {
  return (
    <div className="skeleton-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card event-skeleton" style={{ background: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          <SkeletonBlock height="100px" borderRadius="0" />
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <SkeletonBlock width="40%" height="14px" />
              <SkeletonBlock width="30%" height="14px" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <SkeletonBlock width="120px" height="18px" />
              <SkeletonBlock width="60px" height="20px" />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #f1f5f9' }}>
              <SkeletonBlock width="100px" height="36px" borderRadius="12px" />
              <SkeletonBlock width="80px" height="36px" borderRadius="12px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

