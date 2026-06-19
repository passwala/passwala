import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Code, Database, Send, X, Layers, ShieldAlert, Cpu } from 'lucide-react';

export default function DeveloperModal({ isOpen, onClose, user }) {
  const [activeTab, setActiveTab] = useState('api'); // 'api' | 'db' | 'mocks'
  const [method, setMethod] = useState('POST');
  const [apiUrl, setApiUrl] = useState('/api/events/book');
  const [requestBody, setRequestBody] = useState(JSON.stringify({
    userId: user?.id || '',
    eventId: '',
    tierId: '',
    ticketCount: 1
  }, null, 2));
  
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  // DB Inspector States
  const [selectedTable, setSelectedTable] = useState('events');
  const [dbData, setDbData] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);

  // Mocks States
  const [mockLog, setMockLog] = useState([]);

  const fetchTableData = useCallback(async () => {
    setDbLoading(true);
    try {
      const { data, error } = await supabase.from(selectedTable).select('*').limit(15);
      if (error) throw error;
      setDbData(data || []);
    } catch (err) {
      setDbData([{ error: err.message }]);
    } finally {
      setDbLoading(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    if (isOpen && activeTab === 'db') {
      fetchTableData();
    }
  }, [isOpen, activeTab, fetchTableData]);

  const handleSendRequest = async () => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      let parsedBody = null;
      if (method !== 'GET') {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (e) {
          throw new Error('Invalid JSON request body');
        }
      }

      const baseUrl = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const fullUrl = apiUrl.startsWith('http') ? apiUrl : `${baseUrl}${apiUrl}`;

      const res = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: parsedBody ? JSON.stringify(parsedBody) : undefined,
      });

      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setApiResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data,
      });
    } catch (err) {
      setApiResponse({ error: err.message });
    } finally {
      setApiLoading(false);
    }
  };

  const runMockBooking = async () => {
    setMockLog(prev => [...prev, '⏳ Starting mock booking flow...']);
    try {
      // 1. Get first upcoming event with ticket tiers
      const { data: events, error: eErr } = await supabase
        .from('events')
        .select('*, event_ticket_tiers(*)')
        .eq('status', 'UPCOMING')
        .limit(1);

      if (eErr || !events || events.length === 0) {
        throw new Error('No upcoming events with ticket tiers found in database.');
      }

      const targetEvent = events[0];
      const targetTier = targetEvent.event_ticket_tiers?.[0];

      if (!targetTier) {
        throw new Error(`Event "${targetEvent.title}" has no ticket tiers.`);
      }

      setMockLog(prev => [
        ...prev,
        `Found event: "${targetEvent.title}"`,
        `Found tier: "${targetTier.tier_name}" (Price: ₹${targetTier.price}, Available: ${targetTier.available_seats})`
      ]);

      // 2. Send booking request
      const baseUrl = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${baseUrl}/api/events/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          eventId: targetEvent.id,
          tierId: targetTier.id,
          ticketCount: 1
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to book');

      setMockLog(prev => [
        ...prev,
        `🎉 Success! Booking created.`,
        `Booking ID: ${result.booking.id}`,
        `Invoice: ${result.booking.invoice_number}`,
        `QR Code Hash: ${result.booking.qr_code_hash}`
      ]);
    } catch (err) {
      setMockLog(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a',
        border: '1.5px solid rgba(255, 118, 34, 0.25)',
        borderRadius: '24px',
        maxWidth: '780px',
        width: '100%',
        height: '80vh',
        boxShadow: '0 24px 70px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={24} style={{ color: '#ff7622' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Developer Console</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>Mode: Localhost Sandbox</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#1e293b',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}><X size={18} /></button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          background: '#0b0f19',
          borderBottom: '1px solid #1e293b'
        }}>
          <button
            onClick={() => setActiveTab('api')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'api' ? '#ff7622' : 'transparent',
              color: activeTab === 'api' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Send size={15} /> Send Requests
          </button>
          <button
            onClick={() => setActiveTab('db')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'db' ? '#ff7622' : 'transparent',
              color: activeTab === 'db' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Database size={15} /> Database Inspector
          </button>
          <button
            onClick={() => setActiveTab('mocks')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'mocks' ? '#ff7622' : 'transparent',
              color: activeTab === 'mocks' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Layers size={15} /> Quick Simulations
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          
          {/* TAB 1: API SENDER */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  style={{
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  placeholder="/api/events/book"
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSendRequest}
                  disabled={apiLoading}
                  style={{
                    background: '#ff7622',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 24px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {apiLoading ? 'Sending...' : 'Send'} <Send size={14} />
                </button>
              </div>

              {method !== 'GET' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>Request JSON Body</label>
                  <textarea
                    value={requestBody}
                    onChange={e => setRequestBody(e.target.value)}
                    style={{
                      height: '120px',
                      background: '#090d16',
                      color: '#34d399',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '12px',
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>
              )}

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '200px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>Response Payload</label>
                <div style={{
                  flex: 1,
                  background: '#090d16',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  padding: '14px',
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  color: '#38bdf8'
                }}>
                  {apiResponse ? (
                    <pre style={{ margin: 0 }}>{JSON.stringify(apiResponse, null, 2)}</pre>
                  ) : (
                    <span style={{ color: '#64748b' }}>No request sent yet. Click 'Send' to dispatch.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATABASE INSPECTOR */}
          {activeTab === 'db' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>Select Table:</label>
                  <select
                    value={selectedTable}
                    onChange={e => setSelectedTable(e.target.value)}
                    style={{
                      background: '#1e293b',
                      color: '#fff',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="events">events</option>
                    <option value="event_ticket_tiers">event_ticket_tiers</option>
                    <option value="event_bookings">event_bookings</option>
                    <option value="users">users</option>
                    <option value="vendors">vendors</option>
                  </select>
                </div>
                <button
                  onClick={fetchTableData}
                  disabled={dbLoading}
                  style={{
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {dbLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div style={{
                flex: 1,
                background: '#090d16',
                borderRadius: '12px',
                border: '1px solid #334155',
                padding: '14px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#fbbf24',
                minHeight: '300px'
              }}>
                {dbLoading ? (
                  <span style={{ color: '#64748b' }}>Loading table records...</span>
                ) : (
                  <pre style={{ margin: 0 }}>{JSON.stringify(dbData, null, 2)}</pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: QUICK SIMULATIONS / MOCKS */}
          {activeTab === 'mocks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#1e1b4b', padding: '16px', borderRadius: '16px', border: '1px solid #312e81' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800 }}>Simulate Event Booking</h4>
                <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  Auto-dispatches a POST request to book a seat for the first upcoming event in the database for the active user session.
                </p>
                <button
                  onClick={runMockBooking}
                  style={{
                    background: '#ff7622',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Run Mock Booking Flow
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>Simulation Logs</label>
                <div style={{
                  height: '180px',
                  background: '#090d16',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  padding: '14px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  color: '#34d399',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {mockLog.length === 0 ? (
                    <span style={{ color: '#64748b' }}>No logs yet. Trigger a simulation to see logs.</span>
                  ) : (
                    mockLog.map((log, idx) => <span key={idx}>{log}</span>)
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
