'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Ticket, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://127.0.0.1:3004';

export function LoginModal() {
  const { isLoginOpen, closeLogin, setUser } = useAuthContext();
  const [tab, setTab] = useState<'phone' | 'email' | 'google'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mockOtp, setMockOtp] = useState('');

  useEffect(() => {
    if (!isLoginOpen) {
      setPhone(''); setEmail(''); setOtp('');
      setStep('input'); setError(''); setLoading(false); setMockOtp('');
    }
  }, [isLoginOpen]);

  // ── Phone: send OTP via backend (WhatsApp/SMS) ─────────────────────────────
  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) { setError('Please enter a valid 10-digit number'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send OTP');
      toast.success('OTP sent to your WhatsApp! 📲');
      if (data.otp) setMockOtp(data.otp); // dev mock
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Could not send OTP. Is the backend running?');
    } finally { setLoading(false); }
  };

  // ── Phone: verify OTP via backend ──────────────────────────────────────────
  const handlePhoneVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length < 4) { setError('Please enter the OTP'); return; }
    const clean = phone.replace(/\D/g, '');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, otp })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Incorrect OTP');

      // Build user profile from response
      const profile = {
        id: data.user?.id || null,
        uid: data.user?.uid || clean,
        phone: `+91${clean}`,
        phoneNumber: `+91${clean}`,
        name: data.user?.name || data.user?.display_name || `User ${clean.slice(-4)}`,
        displayName: data.user?.name || `User ${clean.slice(-4)}`,
        role: data.user?.role || 'BUYER',
        ...data.user,
      };
      setUser(profile);
      localStorage.setItem('passwala_user', JSON.stringify(profile));
      toast.success('Logged in successfully! 🎉');
      closeLogin();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  // ── Email: Supabase Magic Link OTP ────────────────────────────────────────
  const handleEmailSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleEmailVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length < 6) { setError('Please enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw error;
      const su = data.user!;
      const name = su.user_metadata?.full_name || su.email?.split('@')[0] || 'User';
      const profile = { uid: su.id, email: su.email, name, displayName: name, role: 'BUYER' };
      setUser(profile);
      localStorage.setItem('passwala_user', JSON.stringify(profile));
      toast.success('Logged in! 🎉');
      closeLogin();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  // ── Google: Supabase OAuth ─────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } }
      });
      if (error) throw error;
      // Browser redirects — loading stays true
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'phone', label: '📱 WhatsApp' },
    { id: 'email', label: '✉️ Email' },
    { id: 'google', label: '🔵 Google' },
  ];

  return (
    <Dialog open={isLoginOpen} onOpenChange={closeLogin}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 pt-8 pb-6 text-primary-foreground text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Ticket className="h-7 w-7" />
            <span className="text-2xl font-bold">Passwala</span>
          </div>
          <p className="text-primary-foreground/80 text-sm">Your city. Your events. Your ride.</p>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Tab Pills */}
          <div className="flex gap-2 bg-muted p-1 rounded-xl">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id as any); setStep('input'); setError(''); setOtp(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.id ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Phone Tab */}
          {tab === 'phone' && (
            <>
              {step === 'input' ? (
                <form onSubmit={handlePhoneSendOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">WhatsApp Number</label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 border rounded-xl bg-muted text-sm font-semibold shrink-0">+91</div>
                      <Input
                        type="tel"
                        placeholder="10-digit number"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="rounded-xl"
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11 font-bold" disabled={loading || phone.replace(/\D/g,'').length < 10}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP on WhatsApp'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handlePhoneVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Enter OTP sent to +91 {phone}</label>
                    {mockOtp && (
                      <div className="mb-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded-lg">
                        🛠️ Dev mock OTP: <strong>{mockOtp}</strong>
                      </div>
                    )}
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center tracking-widest text-xl rounded-xl h-14 font-bold"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => { setStep('input'); setOtp(''); }} disabled={loading}>
                      ← Back
                    </Button>
                    <Button type="submit" className="flex-1 rounded-xl font-bold" disabled={loading || otp.length < 4}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Login'}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Email Tab */}
          {tab === 'email' && (
            <>
              {step === 'input' ? (
                <form onSubmit={handleEmailSendOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="rounded-xl"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11 font-bold" disabled={loading || !email.includes('@')}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP to Email'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleEmailVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">OTP sent to {email}</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center tracking-widest text-xl rounded-xl h-14 font-bold"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => { setStep('input'); setOtp(''); }} disabled={loading}>
                      ← Back
                    </Button>
                    <Button type="submit" className="flex-1 rounded-xl font-bold" disabled={loading || otp.length < 6}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Login'}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Google Tab */}
          {tab === 'google' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Sign in with your Google account</p>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-semibold"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
