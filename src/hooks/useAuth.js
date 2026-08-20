import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { supabase } from '../supabase';
import { parseAddressLine } from '../utils/address';
import { toast } from 'react-hot-toast';
import { DEFAULT_LOCATION } from '../utils/constants';

export const useAuth = () => {
  const navigate = useNavigate();
  const appMode = import.meta.env.VITE_APP_MODE || import.meta.env.MODE || 'web';
  const isAdminMode = appMode === 'admin';
  const isSpecialMode = appMode === 'vendor' || appMode === 'rider' || appMode === 'admin';

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('passwala_user');
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (isSpecialMode) {
            const expectedRole = appMode === 'rider' ? 'RIDER' : appMode === 'vendor' ? 'VENDOR' : 'ADMIN';
            if (appMode === 'vendor') {
              if (!['VENDOR', 'EVENT_ORGANIZER', 'SERVICE_PROVIDER', 'ADMIN'].includes(parsed.role)) {
                return null;
              }
            } else if (parsed.role !== expectedRole && parsed.role !== 'ADMIN') {
              return null;
            }
          } else {
            parsed.role = 'BUYER';
          }
        }
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [authLoading, setAuthLoading] = useState(true);

  const [isProfileComplete, setIsProfileComplete] = useState(() => {
    return localStorage.getItem('passwala_profile_complete') === 'true';
  });

  const [userAddress, setUserAddress] = useState(() => {
    const saved = localStorage.getItem('passwala_user_address');
    return saved ? JSON.parse(saved) : null;
  });

  const [minSplashDone, setMinSplashDone] = useState(() => {
    return !!localStorage.getItem('passwala_user') || sessionStorage.getItem('v_initial_splash_done') === 'true';
  });

  const [isAdmin, setIsAdmin] = useState(() => {
    const hasAdminSession = sessionStorage.getItem('admin_session') === 'true';
    const hasAdminToken = sessionStorage.getItem('admin_token');
    if (!isAdminMode) return false;
    return !!(hasAdminSession && hasAdminToken);
  });

  // Admin Persistence effect
  useEffect(() => {
    sessionStorage.setItem('admin_session', isAdmin);
    if (isAdmin) {
      sessionStorage.setItem('admin_active', 'true');
    } else {
      sessionStorage.removeItem('admin_active');
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_code');
    }
  }, [isAdmin]);

  // User State Persistence Sync effect
  useEffect(() => {
    if (user) {
      localStorage.setItem('passwala_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('passwala_user');
    }
  }, [user]);

  const handleLogout = useCallback(async (skipToast = false) => {
    try {
      // Fix #4: Read notifStatus BEFORE clearing localStorage (was read after clear in catch)
      const notifStatus = localStorage.getItem('passwala_vendor_notifications');

      const userId = user?.id || user?.uid || user?.user_id;
      if (userId && (user?.role === 'RIDER' || appMode === 'rider')) {
        try {
          await supabase.from('riders').update({ is_active: false }).eq('user_id', userId);
          await supabase.from('city_vehicles').update({ is_active: false }).eq('driver_id', userId);
        } catch (dbErr) {
          console.warn('Failed to set rider/vehicle offline on logout:', dbErr);
        }
      }

      if (auth.currentUser) {
        await auth.signOut().catch(e => console.warn('Firebase Signout Skip:', e));
      }

      localStorage.clear();
      sessionStorage.clear();

      if (notifStatus) {
        localStorage.setItem('passwala_vendor_notifications', notifStatus);
      }

      setUser(null);
      setIsProfileComplete(false);
      setUserAddress(null);

      if (!skipToast) toast.success('Signed Out.');

      if (appMode === 'web') {
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // notifStatus already captured at the top of the try block
      localStorage.clear();
    }
  }, [user, navigate, appMode]);

  // Fix #15: Replace 8-second polling with Supabase Realtime for suspension check.
  // This eliminates N queries/second for N concurrent users and provides instant response.
  useEffect(() => {
    if (!user) return;

    const resolveUserId = () => {
      if (user.user_id) return `id.eq.${user.user_id}`;
      if (user.id && String(user.id).includes('-') && user.id.length === 36) return `id.eq.${user.id}`;
      return null;
    };
    const filterStr = resolveUserId();
    if (!filterStr) return;

    // Initial check on mount
    const checkSuspension = async () => {
      try {
        const cleanPhone = String(user.phone || user.phoneNumber || '').replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
        let orFilters = [];
        if (user.user_id) orFilters.push(`id.eq.${user.user_id}`);
        if (user.id && String(user.id).includes('-') && user.id.length === 36) orFilters.push(`id.eq.${user.id}`);
        if (user.uid) orFilters.push(`uid.eq.${user.uid}`);
        if (cleanPhone && /^\d{10}$/.test(cleanPhone)) orFilters.push(`phone.eq.${cleanPhone}`);
        if (orFilters.length === 0) return;

        const { data, error } = await supabase
          .from('users')
          .select('is_suspended')
          .or(orFilters.join(','))
          .maybeSingle();

        if (!error && data?.is_suspended) {
          toast.error('Your account is suspended. Please contact support.', { id: 'suspended-toast', duration: 10000 });
          handleLogout(true);
        }
      } catch (err) {
        console.warn('Suspension check failed:', err);
      }
    };
    checkSuspension();

    // Fix #15: Subscribe to realtime changes on this user's row for instant suspension
    const channel = supabase
      .channel(`user-suspension-${user.id || user.user_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: filterStr },
        (payload) => {
          if (payload.new?.is_suspended) {
            toast.error('Your account has been suspended. Please contact support.', { id: 'suspended-toast', duration: 10000 });
            handleLogout(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleLogout]);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('v_initial_splash_done');
    const isRedirect = localStorage.getItem('google_login_pending') === 'true';
    const hasUser = !!localStorage.getItem('passwala_user');
    
    const delay = (alreadyShown || isRedirect || hasUser) ? 0 : 800; 
    
    const splashTimer = setTimeout(() => {
      setMinSplashDone(true);
      sessionStorage.setItem('v_initial_splash_done', 'true');
    }, delay);

    const isSpecialMode = appMode === 'vendor' || appMode === 'rider' || appMode === 'admin';

    // Handle Supabase Auth (for Email and Google OAuth)
    // NOTE: After Google OAuth redirect, Supabase fires INITIAL_SESSION (not SIGNED_IN),
    // so we must handle both events.
    // Ensure authLoading is false if no session exists immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isLoginEvent = event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED';
      if (isLoginEvent && session?.user) {
        const u = session.user;

        let finalUser = {
          uid: u.id,
          email: u.email,
          displayName: u.user_metadata?.full_name || u.email?.split('@')[0],
          photoURL: u.user_metadata?.avatar_url,
          role: 'BUYER'
        };

        try {
          const { data: usr } = await supabase.from('users')
            .select('id, full_name, role, photo_url')
            .eq('id', u.id)
            .maybeSingle();

          if (usr) {
            finalUser.id = usr.id;
            finalUser.displayName = usr.full_name || finalUser.displayName;
            finalUser.photoURL = usr.photo_url || finalUser.photoURL;
            finalUser.role = usr.role || 'BUYER';
          }

          const { data: addr } = await supabase.from('addresses').select('*')
            .eq('user_id', u.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (addr && addr.address_line_1) {
            const parsed = parseAddressLine(addr.address_line_1);
            addr.house_no = parsed.house_no;
            addr.floor = parsed.floor;
            addr.society = addr.society || parsed.society;
            setUserAddress(addr);
            localStorage.setItem('passwala_user_address', JSON.stringify(addr));
            setIsProfileComplete(true);
            localStorage.setItem('passwala_profile_complete', 'true');
          }
        } catch (err) {
          console.warn("Supabase auth sync failed", err);
        }

        localStorage.setItem('passwala_user', JSON.stringify(finalUser));
        setUser(finalUser);
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session?.user)) {
        setUser(null);
        setIsProfileComplete(false);
        setAuthLoading(false);
      }
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      const savedUser = localStorage.getItem('passwala_user');
      const manualUser = savedUser ? JSON.parse(savedUser) : null;
      const wasComplete = localStorage.getItem('passwala_profile_complete') === 'true';

      if (isSpecialMode) {
        const expectedRole = appMode === 'rider' ? 'RIDER' : appMode === 'vendor' ? 'VENDOR' : 'ADMIN';
        if (appMode === 'vendor') {
          if (!manualUser || !['VENDOR', 'EVENT_ORGANIZER', 'SERVICE_PROVIDER', 'ADMIN'].includes(manualUser.role)) {
            setUser(null);
            setIsProfileComplete(false);
            setAuthLoading(false);
            return;
          }
        } else {
          if (!manualUser || (manualUser.role !== expectedRole && manualUser.role !== 'ADMIN')) {
            setUser(null);
            setIsProfileComplete(false);
            setAuthLoading(false);
            return;
          }
        }
        
        setUser(manualUser);
        setIsProfileComplete(wasComplete);
        setAuthLoading(false);
        return;
      }

      if (!u) {
        if (manualUser) {
          const syncedManualUser = {
            ...manualUser,
            role: 'BUYER'
          };
          const userPhone = manualUser.phone || manualUser.phoneNumber;
          // Fix #24: supabase is never null — removed dead null check
          if (userPhone) {
            try {
              const cleanPhone = String(userPhone).replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
              const { data: usr } = await supabase.from('users')
                .select('id, full_name, role, photo_url, phone')
                .eq('phone', cleanPhone)
                .maybeSingle();
              if (usr) {
                syncedManualUser.id = usr.id;
                syncedManualUser.displayName = usr.full_name || manualUser.displayName || syncedManualUser.displayName;
                syncedManualUser.photoURL = usr.photo_url || manualUser.photoURL || syncedManualUser.photoURL;
                syncedManualUser.role = usr.role || 'BUYER';
                
                // Fetch default address (ordered: default first, then most recent)
                const { data: addr } = await supabase.from('addresses').select('*')
                  .eq('user_id', usr.id)
                  .order('is_default', { ascending: false })
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (addr && addr.address_line_1 && addr.address_line_1.trim() !== '') {
                  const parsed = parseAddressLine(addr.address_line_1);
                  addr.house_no = parsed.house_no;
                  addr.floor = parsed.floor;
                  addr.society = addr.society || parsed.society;
                  setUserAddress(addr);
                  localStorage.setItem('passwala_user_address', JSON.stringify(addr));
                  const displayLoc = addr.society || addr.city || localStorage.getItem('passwala_location') || 'Ahmedabad';
                  localStorage.setItem('passwala_location', displayLoc);
                  setIsProfileComplete(true);
                  localStorage.setItem('passwala_profile_complete', 'true');
                }
              }
            } catch (err) {
              console.warn("Offline or sync failed for manualUser:", err);
            }
          }
          setUser(syncedManualUser);
          setIsProfileComplete(wasComplete);
        } else {
          setUser(null);
          setIsProfileComplete(false);
        }
        setAuthLoading(false);
        return;
      }

      // Fix #24: supabase is never null — removed dead null-check wrapper
      let finalUser = u;
      try {
        const rawPhone = u.phoneNumber;                         // e.g. +919825551190
        const phoneNo = rawPhone?.replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, ''); // 10-digit clean
        
        let orFilter = [];
        if (u.uid) orFilter.push(`uid.eq.${u.uid}`);
        if (u.email) orFilter.push(`email.eq.${u.email}`);
        if (phoneNo) orFilter.push(`phone.eq.${phoneNo}`);   // stored clean (new standard)
        if (rawPhone) orFilter.push(`phone.eq.${rawPhone}`); // stored with +91 (legacy)
        
        const { data: usr } = await supabase.from('users')
          .select('id, full_name, role, photo_url')
          .or(orFilter.join(','))
          .maybeSingle();

        if (usr) {
          finalUser = {
            ...u,
            id: usr.id,
            uid: u.uid,
            email: u.email,
            phoneNumber: u.phoneNumber,
            displayName: usr.full_name || u.displayName || manualUser?.displayName,
            photoURL: usr.photo_url || u.photoURL || manualUser?.photoURL,
            role: usr.role || 'BUYER'
          };

          // Always fetch the default (or most recent) address from DB on every login
          const { data: addr } = await supabase.from('addresses').select('*')
            .eq('user_id', usr.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (addr && addr.address_line_1 && addr.address_line_1.trim() !== '') {
            setIsProfileComplete(true);
            localStorage.setItem('passwala_profile_complete', 'true');
            const parsed = parseAddressLine(addr.address_line_1);
            addr.house_no = parsed.house_no;
            addr.floor = parsed.floor;
            addr.society = addr.society || parsed.society;

            setUserAddress(addr);
            localStorage.setItem('passwala_user_address', JSON.stringify(addr));
            
            const displayLoc = addr.society || addr.city || localStorage.getItem('passwala_location') || 'Ahmedabad';
            localStorage.setItem('passwala_location', displayLoc);
          } else {
            // Try legacy lookup by uid (in case user_id was stored as Firebase UID in older records)
            const { data: addrLegacy } = await supabase.from('addresses').select('*')
              .eq('user_id', u.uid)
              .order('is_default', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            const hasLegacy = addrLegacy && addrLegacy.address_line_1 && addrLegacy.address_line_1.trim() !== '';
            const isComplete = hasLegacy || wasComplete;
            setIsProfileComplete(isComplete);
            if (isComplete) {
              localStorage.setItem('passwala_profile_complete', 'true');
            }
            if (hasLegacy) {
              const parsed = parseAddressLine(addrLegacy.address_line_1);
              addrLegacy.house_no = parsed.house_no;
              addrLegacy.floor = parsed.floor;
              addrLegacy.society = addrLegacy.society || parsed.society;

              setUserAddress(addrLegacy);
              localStorage.setItem('passwala_user_address', JSON.stringify(addrLegacy));
              const displayLoc = addrLegacy.society || addrLegacy.city || 'Ahmedabad';
              localStorage.setItem('passwala_location', displayLoc);
            }
          }
        } else {
          finalUser = {
            ...u,
            uid: u.uid,
            email: u.email,
            phoneNumber: u.phoneNumber,
            displayName: u.displayName || manualUser?.displayName,
            photoURL: u.photoURL || manualUser?.photoURL,
            role: 'BUYER'
          };
          setIsProfileComplete(wasComplete);
          if (wasComplete) {
            localStorage.setItem('passwala_profile_complete', 'true');
          }
        }
      } catch (err) {
        console.error("Auto Sync Failed", err);
        setIsProfileComplete(wasComplete);
        if (wasComplete) {
          localStorage.setItem('passwala_profile_complete', 'true');
        }
      }

      if (wasComplete) {
        setIsProfileComplete(true);
        localStorage.setItem('passwala_profile_complete', 'true');
        const savedAddr = localStorage.getItem('passwala_user_address');
        if (savedAddr) {
          setUserAddress(JSON.parse(savedAddr));
        } else {
          const fallbackAddr = {
            address_line_1: DEFAULT_LOCATION,
            city: '',
            state: '',
            pincode: '',
            society: DEFAULT_LOCATION,
            house_no: '',
            floor: '',
            is_default: true
          };
          setUserAddress(fallbackAddr);
          localStorage.setItem('passwala_user_address', JSON.stringify(fallbackAddr));
        }
      }

      setUser(finalUser);
      setAuthLoading(false);
    });

    const authSafetyTimer = setTimeout(() => {
      setAuthLoading(false);
      setMinSplashDone(true);
    }, 2500);

    return () => {
      unsub();
      clearTimeout(splashTimer);
      clearTimeout(authSafetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    setUser,
    authLoading,
    isProfileComplete,
    setIsProfileComplete,
    userAddress,
    setUserAddress,
    minSplashDone,
    isAdmin,
    setIsAdmin,
    handleLogout
  };
};
