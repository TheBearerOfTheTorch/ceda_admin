import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleAuthProvider,
  updateUserPresence,
  loginWithEmail as fbLoginWithEmail,
  registerWithEmail as fbRegisterWithEmail,
  resetUserPassword as fbResetPassword,
  broadcastGlobalLogout,
  subscribeToGlobalLogout,
  saveUserProfileToFirestore,
} from '../lib/firebase.ts';
import {
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

export type UserRole = 'Evaluator' | 'Adjudicator' | 'Administrator' | 'Submitter' | 'Agent';

export interface AppUser {
  id: number;
  firebaseUid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  department: string;
  sessionVersion?: number;
}

const AUTH_SESSION_STORAGE_KEY = 'ceda_auth_session_v1';
const AUTH_LOGIN_AT_KEY = 'ceda_auth_login_at_v1';

interface AuthContextType {
  currentUser: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  presenceStatus: 'online' | 'reviewing' | 'editing' | 'offline';
  setPresenceStatus: (status: 'online' | 'reviewing' | 'editing' | 'offline') => Promise<void>;
  switchRolePersona: (role: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    department: string
  ) => Promise<void>;
  acceptInvitation: (token: string, password: string) => Promise<{ workspaceId?: string | null }>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllUsers: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Pre-seeded authentic Botswana personas for testing all roles
const PERSONAS: Record<UserRole, Omit<AppUser, 'id'>> = {
  Administrator: {
    firebaseUid: 'admin-uid-001',
    firstName: 'Kabo',
    lastName: 'Sechele',
    email: 'admin@ceda.co.bw',
    role: 'Administrator',
    department: 'Executive Platform Operations',
  },
  Evaluator: {
    firebaseUid: 'evaluator-uid-001',
    firstName: 'Dr. Monametsi',
    lastName: 'Tau',
    email: 'evaluator@ceda.co.bw',
    role: 'Evaluator',
    department: 'Technical & Commercial Due Diligence',
  },
  Adjudicator: {
    firebaseUid: 'adjudicator-uid-001',
    firstName: 'Hon. Kenalemang',
    lastName: 'Sechele',
    email: 'adjudicator@ceda.co.bw',
    role: 'Adjudicator',
    department: 'National Innovation Board',
  },
  Submitter: {
    firebaseUid: 'submitter-uid-001',
    firstName: 'Lesego',
    lastName: 'Modise',
    email: 'submitter@ceda.co.bw',
    role: 'Submitter',
    department: 'Kalahari SunPower Enterprises',
  },
  Agent: {
    firebaseUid: 'agent-uid-001',
    firstName: 'Thabo',
    lastName: 'Kgosidintsi',
    email: 'agent.thabo@ceda.co.bw',
    role: 'Agent',
    department: 'Citizen Enquiries & Support Desk',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [presenceStatus, setPresenceStatusState] = useState<
    'online' | 'reviewing' | 'editing' | 'offline'
  >('online');

  // Sync user with PostgreSQL backend (stores Firebase UID in PostgreSQL users table)
  const syncUserWithBackend = async (data: {
    firebaseUid: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    department?: string;
  }): Promise<AppUser> => {
    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to sync user');
      const syncedUser = await res.json();
      saveUserProfileToFirestore(syncedUser).catch(() => {});
      return syncedUser;
    } catch (err) {
      console.warn('Backend sync fallback to local persona:', err);
      return {
        id: 1,
        ...data,
        role: data.role || 'Administrator',
        department: data.department || 'General',
      };
    }
  };

  const refreshUser = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const users = await res.json();
        const found = users.find((u: AppUser) => u.firebaseUid === currentUser.firebaseUid);
        if (found) setCurrentUser(found);
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  const setPresenceStatus = async (status: 'online' | 'reviewing' | 'editing' | 'offline') => {
    setPresenceStatusState(status);
    if (currentUser) {
      await updateUserPresence(
        currentUser.id,
        `${currentUser.firstName} ${currentUser.lastName}`,
        currentUser.role,
        status,
        { email: currentUser.email, isFocused: status !== 'offline' }
      );
    }
  };

  // Automatic Focus-Based Online/Offline Presence Tracker:
  // Focused & visible in workspace => online; switched away / blurred / closed => offline.
  useEffect(() => {
    if (!currentUser) return;

    const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();

    const syncFocusPresence = (focusedOverride?: boolean) => {
      const isVisible =
        typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
      const isFocused =
        focusedOverride !== undefined
          ? focusedOverride
          : isVisible && (typeof document !== 'undefined' ? document.hasFocus() : true);
      const nextStatus: 'online' | 'offline' = isFocused ? 'online' : 'offline';
      setPresenceStatusState(nextStatus);
      updateUserPresence(currentUser.id, fullName, currentUser.role, nextStatus, {
        email: currentUser.email,
        isFocused,
      }).catch(() => {});
    };

    const handleFocus = () => syncFocusPresence(true);
    const handleBlur = () => syncFocusPresence(false);
    const handleVisibilityChange = () => {
      syncFocusPresence(document.visibilityState === 'visible' && document.hasFocus());
    };
    const handlePageHide = () => syncFocusPresence(false);

    syncFocusPresence();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pageshow', handleFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat keeps active focused users fresh while away/closed tabs flip offline cleanly
    const heartbeat = window.setInterval(() => {
      const stillFocused =
        document.visibilityState === 'visible' && document.hasFocus();
      syncFocusPresence(stillFocused);
    }, 20000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pageshow', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(heartbeat);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role, currentUser?.firstName, currentUser?.lastName]);

  const persistUserSession = (user: AppUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(user));
      if (!localStorage.getItem(AUTH_LOGIN_AT_KEY)) {
        localStorage.setItem(AUTH_LOGIN_AT_KEY, String(Date.now()));
      }
    } else {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      localStorage.removeItem(AUTH_LOGIN_AT_KEY);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AppUser;
          // Validate sessionVersion against backend (supports global "Logout Everybody")
          const checkRes = await fetch(
            `/api/auth/session-check?userId=${parsed.id}&sessionVersion=${parsed.sessionVersion || 1}`
          ).catch(() => null);
          if (checkRes && checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.valid === false) {
              persistUserSession(null);
              setLoading(false);
              return;
            }
          }
          setCurrentUser(parsed);
          updateUserPresence(
            parsed.id,
            `${parsed.firstName} ${parsed.lastName}`,
            parsed.role,
            'online'
          );
        }
      } catch (err) {
        console.error('Session restore error:', err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth
      ? onAuthStateChanged(auth, async (fbUser) => {
          setFirebaseUser(fbUser);
          if (fbUser && !fbUser.isAnonymous && localStorage.getItem(AUTH_SESSION_STORAGE_KEY)) {
            const displayNameParts = (fbUser.displayName || 'User').split(' ');
            const synced = await syncUserWithBackend({
              firebaseUid: fbUser.uid,
              email: fbUser.email || 'user@ceda.co.bw',
              firstName: displayNameParts[0] || 'User',
              lastName: displayNameParts.slice(1).join(' ') || '',
            });
            persistUserSession(synced);
            updateUserPresence(
              synced.id,
              `${synced.firstName} ${synced.lastName}`,
              synced.role,
              'online'
            );
          } else if (!fbUser && auth) {
            signInAnonymously(auth).catch(() => {});
          }
        })
      : () => {};

    const unsubGlobalLogout = subscribeToGlobalLogout(async (loggedOutAt) => {
      const loginAt = Number(localStorage.getItem(AUTH_LOGIN_AT_KEY) || 0);
      if (loginAt && loggedOutAt > loginAt && localStorage.getItem(AUTH_SESSION_STORAGE_KEY)) {
        if (auth) {
          await fbSignOut(auth).catch(() => {});
        }
        persistUserSession(null);
      }
    });

    restoreSession();
    return () => {
      unsubscribe();
      unsubGlobalLogout();
    };
  }, []);

  const switchRolePersona = async (role: UserRole) => {
    setLoading(true);
    try {
      const persona = PERSONAS[role];
      const synced = await syncUserWithBackend(persona);
      persistUserSession(synced);
      setPresenceStatusState('online');
      updateUserPresence(
        synced.id,
        `${synced.firstName} ${synced.lastName}`,
        synced.role,
        'online'
      );
    } catch (err) {
      console.error('Error switching persona:', err);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase Auth is not configured in firebase-applet-config.json');
    }
    const result = await signInWithPopup(auth, googleAuthProvider);
    const fbUser = result.user;
    const displayNameParts = (fbUser.displayName || 'User').split(' ');
    const synced = await syncUserWithBackend({
      firebaseUid: fbUser.uid,
      email: fbUser.email || 'user@ceda.co.bw',
      firstName: displayNameParts[0] || 'User',
      lastName: displayNameParts.slice(1).join(' ') || '',
    });
    persistUserSession(synced);
    updateUserPresence(synced.id, `${synced.firstName} ${synced.lastName}`, synced.role, 'online');
  };

  const loginWithEmail = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    // 1. Primary: Firebase Email/Password Authentication
    try {
      const fbUser = await fbLoginWithEmail(normalizedEmail, password);
      const displayNameParts = (fbUser.displayName || normalizedEmail.split('@')[0] || 'User').split(' ');
      const synced = await syncUserWithBackend({
        firebaseUid: fbUser.uid,
        email: fbUser.email || normalizedEmail,
        firstName: displayNameParts[0] || 'User',
        lastName: displayNameParts.slice(1).join(' ') || '',
      });
      localStorage.setItem(AUTH_LOGIN_AT_KEY, String(Date.now()));
      persistUserSession(synced);
      updateUserPresence(synced.id, `${synced.firstName} ${synced.lastName}`, synced.role, 'online');
      return;
    } catch (fbErr: any) {
      // 2. Fallback for legacy PostgreSQL-only users (and migrate them into Firebase Auth)
      const backendRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (backendRes.ok) {
        const user = await backendRes.json();
        localStorage.setItem(AUTH_LOGIN_AT_KEY, String(Date.now()));
        persistUserSession(user);
        updateUserPresence(user.id, `${user.firstName} ${user.lastName}`, user.role, 'online');
        // Ensure Firebase Auth account exists for this user going forward
        if (auth) {
          fbRegisterWithEmail(normalizedEmail, password, user.firstName, user.lastName).catch(() => {});
        }
        return;
      }

      throw fbErr;
    }
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    department: string
  ) => {
    let firebaseUid = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      const fbUser = await fbRegisterWithEmail(email, password, firstName, lastName);
      firebaseUid = fbUser.uid;
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/email-already-in-use') {
        throw new Error('A user account with this email already exists in Firebase Authentication.');
      }
      // Allow continuing with PostgreSQL verification if Firebase Email/Password provider is restricted
    }

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName, role, department, firebaseUid }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'A user account with this email already exists');
    }

    const data = await res.json();
    if (data.user) {
      saveUserProfileToFirestore(data.user).catch(() => {});
      persistUserSession(data.user);
      updateUserPresence(data.user.id, `${data.user.firstName} ${data.user.lastName}`, data.user.role, 'online');
      return;
    }

    const synced = await syncUserWithBackend({
      firebaseUid,
      email,
      firstName,
      lastName,
      role,
      department,
    });
    persistUserSession(synced);
    updateUserPresence(synced.id, `${synced.firstName} ${synced.lastName}`, synced.role, 'online');
  };

  const acceptInvitation = async (token: string, password: string) => {
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to accept invitation');
    }
    const data = await res.json();
    if (data.user) {
      persistUserSession(data.user);
      updateUserPresence(data.user.id, `${data.user.firstName} ${data.user.lastName}`, data.user.role, 'online');
      // Try registering in Firebase Auth in background if needed
      if (auth) {
        fbRegisterWithEmail(data.user.email, password, data.user.firstName, data.user.lastName).catch(() => {});
      }
    }
    return { workspaceId: data.workspaceId || null };
  };

  const resetPassword = async (email: string) => {
    await fbResetPassword(email);
  };

  const logout = async () => {
    if (currentUser) {
      await updateUserPresence(
        currentUser.id,
        `${currentUser.firstName} ${currentUser.lastName}`,
        currentUser.role,
        'offline',
        { email: currentUser.email, isFocused: false }
      );
    }
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {}
    }
    persistUserSession(null);
  };

  const logoutAllUsers = async () => {
    const actor = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrator';
    await broadcastGlobalLogout(actor);
    try {
      await fetch('/api/auth/logout-all', { method: 'POST' });
    } catch {}
    await logout();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        presenceStatus,
        setPresenceStatus,
        switchRolePersona,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        acceptInvitation,
        resetPassword,
        logout,
        logoutAllUsers,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
