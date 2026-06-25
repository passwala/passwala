/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Home, Briefcase, Building2, MapPin, Plus, Trash2,
  CheckCircle, Navigation, ShieldCheck, Edit2, X, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabase';
import { toast } from 'react-hot-toast';
import { auth } from '../../firebase';
import { useSecureLocation } from '../../hooks/useSecureLocation';
import './AddressManager.css';

const ADDRESS_LABELS = [
  { key: 'Home',   icon: <Home size={18} />,     color: '#ff7622' },
  { key: 'Office', icon: <Briefcase size={18} />, color: '#6366f1' },
  { key: 'PG',     icon: <Building2 size={18} />, color: '#10b981' },
  { key: 'Other',  icon: <MapPin size={18} />,    color: '#f59e0b' },
];

const getLabelStyle = (label) => {
  const found = ADDRESS_LABELS.find(l => l.key === label);
  return found ? found : ADDRESS_LABELS[3];
};

const emptyForm = {
  label: 'Home',
  houseName: '',
  houseNo: '',
  floor: '',
  society: '',
  landmark: '',
  city: 'Ahmedabad',
  pincode: '380015',
  lat: null,
  lng: null,
};

const AddressManager = ({ user }) => {
  const [addresses, setAddresses]     = useState([]);
  const [activeAreas, setActiveAreas] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState(null);   // UUID if editing, null if new
  const [formData, setFormData]       = useState(emptyForm);
  const [dbUserId, setDbUserId]       = useState(null);
  const [geoLoading, setGeoLoading]   = useState(false);
  const [deletingId, setDeletingId]   = useState(null);   // UUID of address being deleted
  const [confirmDelete, setConfirmDelete] = useState(null); // UUID awaiting confirmation

  const { lat, lng, rawAddressObj, error: geoError, startTracking, stopTracking } =
    useSecureLocation();

  /* ── Geo fill ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (lat && lng && rawAddressObj) {
      const addr = rawAddressObj;
      const detectedSociety = (addr.road || addr.residential || addr.suburb || addr.neighbourhood || '').toLowerCase();
      const matchedArea = activeAreas.find(a =>
        detectedSociety.includes(a.toLowerCase()) || a.toLowerCase().includes(detectedSociety)
      );
      setFormData(prev => ({
        ...prev,
        lat, lng,
        city:     addr.city || addr.town || addr.village || addr.state_district || prev.city,
        pincode:  addr.postcode || prev.pincode,
        landmark: addr.suburb || addr.neighbourhood || addr.amenity || prev.landmark,
        society:  matchedArea || prev.society,
      }));
      toast.success('Location captured! 📍', { id: 'geo' });
      stopTracking();
      setGeoLoading(false);
    }
  }, [lat, lng, rawAddressObj, stopTracking, activeAreas]);

  useEffect(() => {
    if (geoError) {
      toast.error(geoError, { id: 'geo' });
      stopTracking();
      setGeoLoading(false);
    }
  }, [geoError, stopTracking]);

  useEffect(() => () => stopTracking(), [stopTracking]);

  /* ── Fetch areas ──────────────────────────────────────────────── */
  useEffect(() => {
    const fetchAreas = async () => {
      const { data } = await supabase.from('service_areas').select('area_name').eq('is_active', true);
      if (data) setActiveAreas(data.map(a => a.area_name));
    };
    fetchAreas();
  }, []);

  /* ── Resolve DB user ID ───────────────────────────────────────── */
  const resolveDbUserId = useCallback(async () => {
    if (dbUserId) return dbUserId;

    const uid  = user?.uid  || user?.id;
    const email = user?.email;
    const phone = (user?.phoneNumber || user?.phone || '').replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');

    if (!uid && !email && !phone) return null;

    let filters = [];
    if (uid)   filters.push(`uid.eq.${uid}`);
    if (email) filters.push(`email.eq.${email}`);
    if (phone) filters.push(`phone.eq.${phone}`);

    const { data } = await supabase.from('users').select('id').or(filters.join(',')).maybeSingle();
    if (data?.id) { setDbUserId(data.id); return data.id; }
    return null;
  }, [dbUserId, user]);

  /* ── Load addresses ───────────────────────────────────────────── */
  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const uid = await resolveDbUserId();
      if (!uid) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', uid)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) setAddresses(data);
    } catch (err) {
      console.warn('loadAddresses error:', err);
    } finally {
      setLoading(false);
    }
  }, [resolveDbUserId]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  /* ── Set as default ───────────────────────────────────────────── */
  const setDefault = async (id) => {
    const uid = await resolveDbUserId();
    if (!uid) return;

    // clear all defaults for this user first
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', uid);
    // set the chosen address as default
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    if (!error) {
      toast.success('Default address updated!');
      // update localStorage so Navbar shows correct address
      const addr = addresses.find(a => a.id === id);
      if (addr) {
        localStorage.setItem('passwala_user_address', JSON.stringify(addr));
        const displayLoc = addr.society || addr.city || 'Ahmedabad';
        localStorage.setItem('passwala_location', displayLoc);
      }
      await loadAddresses();
    }
  };

  /* ── Delete address ───────────────────────────────────────────── */
  const deleteAddress = async (id) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) {
        console.error('Delete error:', error);
        toast.error('Could not delete address: ' + error.message);
        return;
      }
      toast.success('Address removed');
      try {
        const saved = localStorage.getItem('passwala_user_address');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.id === id) localStorage.removeItem('passwala_user_address');
        }
      } catch (_) {
        // Ignore JSON parsing or localStorage errors
      }
      await loadAddresses();
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  /* ── Open form (new or edit) ──────────────────────────────────── */
  const openForm = (addr = null) => {
    if (addr) {
      // Parse address_line_1 back into fields
      const raw   = addr.address_line_1 || '';
      const parts = raw.split(', ').map(p => p.trim());
      let hName = '', hNo = '', fl = '', soc = '';

      if (parts.length >= 4) {
        [hName, hNo, fl, soc] = parts;
        fl = fl.replace(/^Floor\s*/i, '');
      } else if (parts.length === 3) {
        if (parts[1].startsWith('Floor ')) { [hNo, fl, soc] = parts; fl = fl.replace('Floor ', ''); }
        else                               { [hName, hNo, soc] = parts; }
      } else if (parts.length === 2) {
        [hNo, soc] = parts;
      }

      setFormData({
        label:     addr.name || 'Home',
        houseName: hName,
        houseNo:   hNo,
        floor:     fl,
        society:   addr.society || soc,
        landmark:  addr.address_line_2 || '',
        city:      addr.city || 'Ahmedabad',
        pincode:   addr.pincode || '',
        lat:       addr.lat || null,
        lng:       addr.lng || null,
      });
      setEditId(addr.id);
    } else {
      setFormData(emptyForm);
      setEditId(null);
    }
    setShowForm(true);
  };

  /* ── Save (insert or update) ──────────────────────────────────── */
  const saveAddress = async () => {
    if (!formData.houseNo) { toast.error('House / Flat No is required'); return; }
    if (!formData.society) { toast.error('Please select your neighborhood'); return; }

    setSaving(true);
    try {
      const uid = await resolveDbUserId();
      if (!uid) throw new Error('Could not identify your account. Please try logging in again.');

      const addrLine1 = [
        formData.houseName && formData.houseName,
        formData.houseNo,
        formData.floor && `Floor ${formData.floor}`,
        formData.society,
      ].filter(Boolean).join(', ');

      // Full payload (requires both 'name' and 'society' columns)
      const fullPayload = {
        user_id:        uid,
        name:           formData.label,
        address_line_1: addrLine1,
        address_line_2: formData.landmark,
        society:        formData.society,
        city:           formData.city,
        pincode:        formData.pincode,
        lat:            formData.lat,
        lng:            formData.lng,
        is_default:     addresses.length === 0,
      };

      const tryUpsert = async (payload) => {
        if (editId) {
          return supabase.from('addresses').update(payload).eq('id', editId);
        } else {
          return supabase.from('addresses').insert([payload]);
        }
      };

      // Try full payload first
      let { error } = await tryUpsert(fullPayload);

      // Fallback 1: 'name' column missing → retry without it
      if (error && error.message && error.message.includes("'name'")) {
        console.warn("'name' column missing — run add_address_name_column.sql migration.");
        const { name: _n, ...noName } = fullPayload;
        ({ error } = await tryUpsert(noName));
      }

      // Fallback 2: 'society' column missing → retry without both name & society
      if (error && error.message && error.message.includes("'society'")) {
        console.warn("'society' column missing — run add_address_name_column.sql migration.");
        const { name: _n, society: _s, ...minPayload } = fullPayload;
        ({ error } = await tryUpsert(minPayload));
      }

      if (error) throw error;

      toast.success(editId ? 'Address updated! ✨' : 'Address saved! ✨');

      // Sync localStorage with the active default address
      if (fullPayload.is_default || addresses.find(a => a.id === editId && a.is_default)) {
        localStorage.setItem('passwala_user_address', JSON.stringify(fullPayload));
        localStorage.setItem('passwala_profile_complete', 'true');
        const displayLoc = formData.society || formData.city || 'Ahmedabad';
        localStorage.setItem('passwala_location', displayLoc);
      }

      setShowForm(false);
      await loadAddresses();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const detectLocation = () => {
    setGeoLoading(true);
    toast.loading('Detecting location...', { id: 'geo' });
    startTracking();
  };

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="addr-manager-page">
      <div className="addr-manager-header">
        <h2>My Addresses</h2>
        <p>Manage your saved delivery locations</p>
      </div>

      {loading ? (
        <div className="addr-loading">
          <div className="addr-spinner" />
          <span>Loading addresses…</span>
        </div>
      ) : (
        <div className="addr-list">
          <AnimatePresence>
            {addresses.map((addr) => {
              const ls = getLabelStyle(addr.name);
              return (
                <motion.div
                  key={addr.id}
                  className={`addr-card ${addr.is_default ? 'is-default' : ''}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <div className="addr-card-top">
                    <div className="addr-label-badge" style={{ background: `${ls.color}18`, color: ls.color }}>
                      {ls.icon}
                      <span>{addr.name || 'Address'}</span>
                    </div>
                    {addr.is_default && (
                      <div className="addr-default-pill">
                        <Star size={11} fill="currentColor" /> Default
                      </div>
                    )}
                  </div>

                  <div className="addr-card-body">
                    <MapPin size={14} className="addr-pin-icon" />
                    <p>
                      {addr.address_line_1}
                      {addr.address_line_2 && `, ${addr.address_line_2}`}
                      {addr.city && `, ${addr.city}`}
                      {addr.pincode && ` - ${addr.pincode}`}
                    </p>
                  </div>

                  <div className="addr-card-actions">
                    {!addr.is_default && (
                      <button className="addr-action-btn set-default" onClick={() => setDefault(addr.id)}>
                        <CheckCircle size={14} /> Set Default
                      </button>
                    )}
                    <button className="addr-action-btn edit" onClick={() => openForm(addr)}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="addr-action-btn delete" onClick={() => setConfirmDelete(addr.id)} disabled={deletingId === addr.id}>
                      {deletingId === addr.id ? <div className="btn-spinner-xs" /> : <Trash2 size={14} />} Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {addresses.length === 0 && !showForm && (
            <div className="addr-empty">
              <MapPin size={40} className="addr-empty-icon" />
              <h3>No Saved Addresses</h3>
              <p>Add your home, office, or PG address to make checkout faster.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Add Address Button ─────────────────────────────────── */}
      {!showForm && (
        <motion.button
          className="addr-add-btn"
          onClick={() => openForm()}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={18} />
          Add New Address
        </motion.button>
      )}

      {/* ── Address Form ──────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="addr-form-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="addr-form-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="addr-form-header">
                <h3>{editId ? 'Edit Address' : 'Add New Address'}</h3>
                <button className="addr-form-close" onClick={() => setShowForm(false)}>
                  <X size={20} />
                </button>
              </div>

              {/* Label Picker */}
              <div className="addr-label-picker">
                {ADDRESS_LABELS.map(l => (
                  <button
                    key={l.key}
                    className={`addr-label-option ${formData.label === l.key ? 'active' : ''}`}
                    style={formData.label === l.key ? { borderColor: l.color, background: `${l.color}15`, color: l.color } : {}}
                    onClick={() => setFormData(prev => ({ ...prev, label: l.key }))}
                    type="button"
                  >
                    {l.icon} {l.key}
                  </button>
                ))}
              </div>

              {/* Detect Location */}
              <button
                className={`addr-detect-btn ${formData.lat ? 'success' : ''} ${geoLoading ? 'loading' : ''}`}
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <div className="btn-spinner-sm" />
                ) : formData.lat ? (
                  <ShieldCheck size={15} />
                ) : (
                  <Navigation size={15} style={{ transform: 'rotate(45deg)' }} />
                )}
                {geoLoading ? 'Detecting…' : formData.lat ? 'Location Captured ✓' : 'Detect My Location'}
              </button>

              {/* Fields */}
              <div className="addr-field-grid">
                <input
                  className="addr-field"
                  placeholder="House / Bungalow Name (optional)"
                  value={formData.houseName}
                  onChange={e => setFormData(p => ({ ...p, houseName: e.target.value }))}
                />
                <div className="addr-field-row">
                  <input
                    className="addr-field"
                    placeholder="House / Flat No *"
                    value={formData.houseNo}
                    onChange={e => setFormData(p => ({ ...p, houseNo: e.target.value }))}
                  />
                  <input
                    className="addr-field"
                    placeholder="Floor"
                    value={formData.floor}
                    onChange={e => setFormData(p => ({ ...p, floor: e.target.value }))}
                  />
                </div>

                <select
                  className="addr-field addr-select"
                  value={formData.society}
                  onChange={e => setFormData(p => ({ ...p, society: e.target.value }))}
                >
                  <option value="">-- Select Neighbourhood *</option>
                  {activeAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                  {!activeAreas.includes('Satellite')    && <option value="Satellite">Satellite</option>}
                  {!activeAreas.includes('Paldi')        && <option value="Paldi">Paldi</option>}
                  {!activeAreas.includes('Bopal')        && <option value="Bopal">Bopal</option>}
                  {!activeAreas.includes('Sindhu Bhavan') && <option value="Sindhu Bhavan">Sindhu Bhavan</option>}
                </select>

                <input
                  className="addr-field"
                  placeholder="Landmark (optional)"
                  value={formData.landmark}
                  onChange={e => setFormData(p => ({ ...p, landmark: e.target.value }))}
                />

                <div className="addr-field-row">
                  <input
                    className="addr-field"
                    placeholder="City"
                    value={formData.city}
                    onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                  />
                  <input
                    className="addr-field"
                    placeholder="Pincode"
                    value={formData.pincode}
                    onChange={e => setFormData(p => ({ ...p, pincode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="addr-form-actions">
                <button className="addr-cancel-btn" onClick={() => setShowForm(false)} type="button">
                  Cancel
                </button>
                <button
                  className="addr-save-btn"
                  onClick={saveAddress}
                  disabled={saving}
                  type="button"
                >
                  {saving ? <div className="btn-spinner-sm" /> : null}
                  {saving ? 'Saving…' : editId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Custom Delete Confirmation Modal ───────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="addr-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              className="addr-confirm-modal"
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="addr-confirm-icon">
                <Trash2 size={28} />
              </div>
              <h3 className="addr-confirm-title">Delete Address?</h3>
              <p className="addr-confirm-msg">This address will be permanently removed. This action cannot be undone.</p>
              <div className="addr-confirm-actions">
                <button className="addr-confirm-cancel" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </button>
                <button
                  className="addr-confirm-delete"
                  onClick={() => deleteAddress(confirmDelete)}
                  disabled={!!deletingId}
                >
                  {deletingId ? <div className="btn-spinner-xs btn-spinner-white" /> : <Trash2 size={14} />}
                  {deletingId ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddressManager;
