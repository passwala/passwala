import { useState, useEffect } from 'react';
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
            if (parsed.role !== expectedRole && parsed.role !== 'ADMIN') {
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

  const [authLoading, setAuthLoading] = useState(() => {
    return !localStorage.getItem('passwala_user');
  });

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

  const handleLogout = async (skipToast = false) => {
    try {
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

      const notifStatus = localStorage.getItem('passwala_vendor_notifications');
      
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
      const notifStatus = localStorage.getItem('passwala_vendor_notifications');
      localStorage.clear();
      if (notifStatus) {
        localStorage.setItem('passwala_vendor_notifications', notifStatus);
      }
    }
  };

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

    const unsub = onAuthStateChanged(auth, async (u) => {
      const savedUser = localStorage.getItem('passwala_user');
      const manualUser = savedUser ? JSON.parse(savedUser) : null;
      const wasComplete = localStorage.getItem('passwala_profile_complete') === 'true';

      if (isSpecialMode) {
        const expectedRole = appMode === 'rider' ? 'RIDER' : appMode === 'vendor' ? 'VENDOR' : 'ADMIN';
        if (!manualUser || (manualUser.role !== expectedRole && manualUser.role !== 'ADMIN')) {
          setUser(null);
          setIsProfileComplete(false);
          setAuthLoading(false);
          return;
        } else {
          setUser(manualUser);
          setIsProfileComplete(wasComplete);
          setAuthLoading(false);
          return;
        }
      }

      if (!u) {
        if (manualUser) {
          const syncedManualUser = {
            ...manualUser,
            role: 'BUYER'
          };
          const userPhone = manualUser.phone || manualUser.phoneNumber;
          if (supabase && userPhone) {
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
                
                const { data: addr } = await supabase.from('addresses').select('*').eq('user_id', usr.id).maybeSingle();
                if (addr) {
                  const parsed = parseAddressLine(addr.address_line_1);
                  addr.house_no = parsed.house_no;
                  addr.floor = parsed.floor;
                  addr.society = parsed.society;
                  setUserAddress(addr);
                  localStorage.setItem('passwala_user_address', JSON.stringify(addr));
                  setIsProfileComplete(true);
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

      let finalUser = u;
      if (supabase) {
        try {
          const rawPhone = u.phoneNumber;                         // e.g. +919825551190
          const phoneNo = rawPhone?.replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, ''); // 10-digit clean
          
          let orFilter = [];
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
              role: 'BUYER'
            };

            const { data: addr } = await supabase.from('addresses').select('*').eq('user_id', usr.id).maybeSingle();
            if (addr) {
              setIsProfileComplete(true);
              const parsed = parseAddressLine(addr.address_line_1);
              addr.house_no = parsed.house_no;
              addr.floor = parsed.floor;
              addr.society = parsed.society;

              setUserAddress(addr);
              localStorage.setItem('passwala_user_address', JSON.stringify(addr));
              
              const displayLoc = addr.society || addr.city || localStorage.getItem('passwala_location') || 'India';
              localStorage.setItem('passwala_location', displayLoc);
            } else {
              const { data: addrLegacy } = await supabase.from('addresses').select('*').eq('user_id', u.uid).maybeSingle();
              setIsProfileComplete(!!addrLegacy || wasComplete);
              if (addrLegacy) {
                const parsed = parseAddressLine(addrLegacy.address_line_1);
                addrLegacy.house_no = parsed.house_no;
                addrLegacy.floor = parsed.floor;
                addrLegacy.society = parsed.society;

                setUserAddress(addrLegacy);
                localStorage.setItem('passwala_user_address', JSON.stringify(addrLegacy));
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
          }
        } catch (err) {
          console.error("Auto Sync Failed", err);
          setIsProfileComplete(wasComplete);
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
      }

      if (wasComplete) {
        setIsProfileComplete(true);
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

    return () => {
      unsub();
      clearTimeout(splashTimer);
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
