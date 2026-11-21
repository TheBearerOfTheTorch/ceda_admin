import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { getDatabase, ref as rtdbRef, remove } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const isFirebaseConfigured = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);

const app = isFirebaseConfigured
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null;

// Secondary Firebase App instance so Admins can create user accounts & send
// Firebase email verification without signing out their own active session.
const secondaryApp = isFirebaseConfigured
  ? (getApps().find((a) => a.name === 'ceda-admin-creator') ||
      initializeApp(firebaseConfig, 'ceda-admin-creator'))
  : null;

export const auth = app ? getAuth(app) : null;
const secondaryAuth = secondaryApp ? getAuth(secondaryApp) : null;
export const googleAuthProvider = new GoogleAuthProvider();
export const githubAuthProvider = new GithubAuthProvider();
export const firestore = app
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || 'ceda')
  : null;
export const realtimeDb = app
  ? getDatabase(
      app,
      (firebaseConfig as any).databaseURL ||
        'https://ceda-admin-da72a-default-rtdb.asia-southeast1.firebasedatabase.app/'
    )
  : null;
export const storage = app
  ? getStorage(
      app,
      firebaseConfig.storageBucket
        ? `gs://${firebaseConfig.storageBucket}`
        : 'gs://ceda-admin-da72a.firebasestorage.app'
    )
  : null;

// ============================================================================
// 1. Firebase Authentication Helpers (Login, Registration, Reset, MFA, Social)
// ============================================================================

export const loginWithEmail = async (email: string, password: string) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const registerWithEmail = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string
) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const displayName = `${firstName} ${lastName}`.trim();
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  try {
    await sendEmailVerification(credential.user);
  } catch (err) {
    console.warn('Email verification dispatch notice:', err);
  }
  return credential.user;
};

export const resetUserPassword = async (email: string) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  await sendPasswordResetEmail(auth, email);
};

export const createFirebaseAccountForInvitedUser = async (params: {
  email: string;
  password: string;
  displayName: string;
  continueUrl?: string;
}): Promise<{
  firebaseUid: string | null;
  verificationEmailSent: boolean;
  alreadyExists?: boolean;
  error?: string;
}> => {
  if (!secondaryAuth) {
    return {
      firebaseUid: null,
      verificationEmailSent: false,
      error: 'Firebase Auth is not configured',
    };
  }
  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      params.email.trim().toLowerCase(),
      params.password
    );
    if (params.displayName) {
      await updateProfile(cred.user, { displayName: params.displayName }).catch(() => {});
    }

    let verificationEmailSent = false;
    try {
      await sendEmailVerification(cred.user, {
        url: params.continueUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
        handleCodeInApp: false,
      });
      verificationEmailSent = true;
    } catch (verifyErr) {
      console.warn('Firebase verification email notice:', verifyErr);
    }

    const uid = cred.user.uid;
    await signOut(secondaryAuth).catch(() => {});
    return {
      firebaseUid: uid,
      verificationEmailSent,
    };
  } catch (err: any) {
    await signOut(secondaryAuth).catch(() => {});
    if (err?.code === 'auth/email-already-in-use') {
      return {
        firebaseUid: null,
        verificationEmailSent: false,
        alreadyExists: true,
        error: 'User already has a Firebase Authentication account.',
      };
    }
    return {
      firebaseUid: null,
      verificationEmailSent: false,
      error: err?.message || 'Failed to create Firebase account',
    };
  }
};

export const getEnrolledMfaFactors = (user: FirebaseUser | null) => {
  if (!user) return [];
  try {
    return multiFactor(user).enrolledFactors;
  } catch {
    return [];
  }
};

export const startTotpMfaEnrollment = async (user: FirebaseUser): Promise<TotpSecret> => {
  const session = await multiFactor(user).getSession();
  return TotpMultiFactorGenerator.generateSecret(session);
};

export const finalizeTotpMfaEnrollment = async (
  user: FirebaseUser,
  totpSecret: TotpSecret,
  verificationCode: string,
  displayName = 'CEDA Authenticator App'
) => {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, verificationCode);
  await multiFactor(user).enroll(assertion, displayName);
};

// ============================================================================
// 2. Firestore Types & Real-Time Helpers
// ============================================================================

export type NotificationActionType =
  | 'new_idea_submitted'
  | 'idea_assigned'
  | 'evaluation_completed'
  | 'adjudication_decision_issued'
  | 'pilot_approved'
  | 'card_moved'
  | 'idea_viewed'
  | 'tab_accessed'
  | 'screening_updated'
  | string;

export interface ActivityFeedItem {
  id?: string;
  innovationId: number | string;
  action: NotificationActionType;
  user: string;
  role?: string;
  ideaTitle?: string;
  tabName?: string;
  timestamp: any;
}

export interface RealtimeNotificationItem {
  id?: string;
  innovationId: number | string;
  type:
    | 'New idea submitted'
    | 'Idea assigned'
    | 'Evaluation completed'
    | 'Adjudication decision issued'
    | 'Pilot approved'
    | 'Idea viewed'
    | 'Tab accessed'
    | 'Screening update'
    | 'Clarification message'
    | 'Workspace invite'
    | 'Citizen enquiry';
  message: string;
  user: string;
  targetRole?: string;
  targetEmail?: string;
  workspaceId?: string;
  workspaceName?: string;
  read?: boolean;
  ideaTitle?: string;
  viewerName?: string;
  viewerRole?: string;
  tabName?: string;
  submitterId?: string | number;
  submitterName?: string;
  timestamp: any;
}

export interface IdeaAuditFeedItem {
  id?: string;
  ideaKey: string;
  ideaId: string;
  code?: string;
  ideaTitle: string;
  action: string;
  author: string;
  authorRole: string;
  tabName?: string;
  eventType: 'view' | 'tab_access' | 'screening' | 'assignment' | 'stage_transition' | 'evaluation';
  notes?: string;
  submitterName?: string;
  timestamp: string;
  createdAtMs: number;
}

export interface UserPresenceItem {
  userId: string | number;
  userName: string;
  role: string;
  email?: string;
  status: 'online' | 'reviewing' | 'editing' | 'offline';
  isFocused?: boolean;
  lastSeenMs?: number;
  lastSeen: any;
}

const formatTimestamp = (ts: any): string => {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
  return new Date().toISOString();
};

// 2A. Live Activity Feed
export const publishActivity = async (item: Omit<ActivityFeedItem, 'timestamp'>) => {
  if (!firestore) return;
  try {
    await addDoc(collection(firestore, 'activity_feed'), {
      innovationId: item.innovationId,
      action: item.action,
      user: item.user,
      role: item.role || 'Official',
      ...(item.ideaTitle ? { ideaTitle: item.ideaTitle } : {}),
      ...(item.tabName ? { tabName: item.tabName } : {}),
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore activity publish fallback:', err);
  }
};

export const subscribeToActivityFeed = (callback: (items: ActivityFeedItem[]) => void) => {
  if (!firestore) return () => {};
  try {
    const q = query(collection(firestore, 'activity_feed'), orderBy('timestamp', 'desc'), limit(30));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: ActivityFeedItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            innovationId: data.innovationId,
            action: data.action,
            user: data.user,
            role: data.role,
            ideaTitle: data.ideaTitle,
            tabName: data.tabName,
            timestamp: formatTimestamp(data.timestamp),
          });
        });
        callback(items);
      },
      (err) => {
        console.warn('Firestore activity feed subscription notice:', err);
      }
    );
  } catch (err) {
    console.warn('Firestore activity feed setup notice:', err);
    return () => {};
  }
};

// 2B. Real-Time Notifications
const NOTIFICATIONS_BROADCAST_CHANNEL = 'ceda_realtime_notifications_v1';

export const publishNotification = async (
  item: Omit<RealtimeNotificationItem, 'timestamp' | 'id'>
) => {
  const nowIso = new Date().toISOString();
  const localId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const broadcastPayload: RealtimeNotificationItem = {
    ...(stripUndefinedDeep(item) as any),
    id: localId,
    read: false,
    timestamp: nowIso,
  };

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(NOTIFICATIONS_BROADCAST_CHANNEL);
      bc.postMessage(broadcastPayload);
      bc.close();
    }
  } catch {
    // ignore BroadcastChannel failures
  }

  if (!firestore) return;
  try {
    await addDoc(collection(firestore, 'notifications'), {
      ...stripUndefinedDeep(item),
      localEventId: localId,
      read: false,
      timestamp: nowIso,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore notification publish fallback:', err);
  }
};

export const subscribeToNotifications = (
  callback: (items: RealtimeNotificationItem[]) => void
) => {
  let firestoreItems: RealtimeNotificationItem[] = [];
  const broadcastItems: RealtimeNotificationItem[] = [];

  const emitMerged = () => {
    const seen = new Set<string>();
    const merged: RealtimeNotificationItem[] = [];
    for (const item of [...broadcastItems, ...firestoreItems]) {
      const dedupeKey =
        (item as any).localEventId ||
        `${item.type}|${item.innovationId}|${item.ideaTitle || ''}|${item.message}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      merged.push(item);
    }
    merged.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    callback(merged.slice(0, 40));
  };

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(NOTIFICATIONS_BROADCAST_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev?.data && ev.data.message) {
          broadcastItems.unshift(ev.data as RealtimeNotificationItem);
          if (broadcastItems.length > 25) broadcastItems.length = 25;
          emitMerged();
        }
      };
    }
  } catch {
    bc = null;
  }

  let unsubFirestore = () => {};
  if (firestore) {
    try {
      const q = query(collection(firestore, 'notifications'), orderBy('timestamp', 'desc'), limit(30));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const items: RealtimeNotificationItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              ...(data.localEventId ? { localEventId: data.localEventId } : {}),
              innovationId: data.innovationId,
              type: data.type,
              message: data.message,
              user: data.user,
              targetRole: data.targetRole,
              read: Boolean(data.read),
              ideaTitle: data.ideaTitle,
              viewerName: data.viewerName,
              viewerRole: data.viewerRole,
              tabName: data.tabName,
              submitterId: data.submitterId,
              submitterName: data.submitterName,
              timestamp: formatTimestamp(data.timestamp),
            } as RealtimeNotificationItem);
          });
          firestoreItems = items;
          emitMerged();
        },
        (err) => {
          console.warn('Firestore notifications subscription notice:', err);
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubFirestore();
    try {
      bc?.close();
    } catch {
      // ignore
    }
  };
};

// 2B-2. Real-Time Idea Audit & Access Logs (Admin + Submitter Live View)
export const publishIdeaAuditEvent = async (
  item: Omit<IdeaAuditFeedItem, 'id'>
) => {
  if (!firestore) return;
  try {
    await addDoc(collection(firestore, 'idea_audit_logs'), {
      ...item,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore idea audit publish fallback:', err);
  }
};

export const subscribeToIdeaAuditEvents = (
  callback: (items: IdeaAuditFeedItem[]) => void
) => {
  if (!firestore) return () => {};
  try {
    const q = query(
      collection(firestore, 'idea_audit_logs'),
      orderBy('createdAtMs', 'desc'),
      limit(100)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const items: IdeaAuditFeedItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            ideaKey: String(data.ideaKey || ''),
            ideaId: String(data.ideaId || ''),
            code: data.code,
            ideaTitle: String(data.ideaTitle || ''),
            action: String(data.action || ''),
            author: String(data.author || 'System'),
            authorRole: String(data.authorRole || 'Official'),
            tabName: data.tabName,
            eventType: data.eventType || 'view',
            notes: data.notes,
            submitterName: data.submitterName,
            timestamp: formatTimestamp(data.timestamp),
            createdAtMs: Number(data.createdAtMs || 0),
          });
        });
        callback(items);
      },
      (err) => {
        console.warn('Firestore idea audit subscription notice:', err);
      }
    );
  } catch (err) {
    return () => {};
  }
};

// 2C. Automatic Focus-Based User Presence (Online when Workspace Focused, Offline when Unfocused/Away)
const PRESENCE_BROADCAST_CHANNEL = 'ceda_user_presence_v1';
const PRESENCE_STALE_MS = 90_000;

export const updateUserPresence = async (
  userId: string | number,
  userName: string,
  role: string,
  status: 'online' | 'reviewing' | 'editing' | 'offline',
  meta?: { email?: string; isFocused?: boolean }
) => {
  const nowMs = Date.now();
  const isFocused = meta?.isFocused ?? status !== 'offline';
  const effectiveStatus = isFocused ? (status === 'offline' ? 'online' : status) : 'offline';
  const payload = stripUndefinedDeep({
    userId: Number(userId) || String(userId),
    userName: userName.trim(),
    role,
    email: meta?.email ? meta.email.trim().toLowerCase() : undefined,
    status: effectiveStatus,
    isFocused,
    lastSeenMs: nowMs,
    lastSeen: new Date(nowMs).toISOString(),
  });

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(PRESENCE_BROADCAST_CHANNEL);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // ignore BroadcastChannel failures
  }

  if (!firestore) return;
  try {
    const docKey = (meta?.email ? meta.email.trim().toLowerCase() : String(userId)).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const userDocRef = doc(firestore, 'user_presence', docKey);
    await setDoc(
      userDocRef,
      {
        ...payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Presence update fallback:', err);
  }
};

export const subscribeToPresence = (callback: (users: UserPresenceItem[]) => void) => {
  let firestoreUsers: UserPresenceItem[] = [];
  const broadcastMap = new Map<string, UserPresenceItem>();

  const normalizePresenceEntry = (raw: any): UserPresenceItem => {
    const nowMs = Date.now();
    const lastSeenMs =
      typeof raw.lastSeenMs === 'number'
        ? raw.lastSeenMs
        : raw.lastSeen
          ? Date.parse(formatTimestamp(raw.lastSeen)) || 0
          : 0;
    const isStale = lastSeenMs > 0 && nowMs - lastSeenMs > PRESENCE_STALE_MS;
    const rawStatus = raw.status || 'online';
    const isOffline = raw.isFocused === false || rawStatus === 'offline' || isStale;
    return {
      userId: raw.userId,
      userName: String(raw.userName || `User #${raw.userId}`).trim(),
      role: raw.role || 'Evaluator',
      email: raw.email ? String(raw.email).trim().toLowerCase() : undefined,
      isFocused: !isOffline,
      lastSeenMs,
      status: isOffline ? 'offline' : rawStatus,
      lastSeen: formatTimestamp(raw.lastSeen),
    };
  };

  const emitMerged = () => {
    const dedupe = new Map<string, UserPresenceItem>();
    const all = [...firestoreUsers, ...Array.from(broadcastMap.values())];
    for (const entry of all) {
      const normalized = normalizePresenceEntry(entry);
      const dedupeKey =
        normalized.email ||
        `${normalized.userName.toLowerCase()}__${String(normalized.role).toLowerCase()}`;
      const existing = dedupe.get(dedupeKey);
      if (!existing || (normalized.lastSeenMs || 0) >= (existing.lastSeenMs || 0)) {
        dedupe.set(dedupeKey, normalized);
      }
    }
    const sorted = Array.from(dedupe.values()).sort((a, b) => {
      if (a.status !== 'offline' && b.status === 'offline') return -1;
      if (a.status === 'offline' && b.status !== 'offline') return 1;
      return (b.lastSeenMs || 0) - (a.lastSeenMs || 0);
    });
    callback(sorted);
  };

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(PRESENCE_BROADCAST_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev?.data && ev.data.userName) {
          const item = normalizePresenceEntry(ev.data);
          const key = item.email || `${item.userName.toLowerCase()}__${String(item.role).toLowerCase()}`;
          broadcastMap.set(key, item);
          emitMerged();
        }
      };
    }
  } catch {
    bc = null;
  }

  let unsubFirestore = () => {};
  if (firestore) {
    try {
      const q = collection(firestore, 'user_presence');
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          const users: UserPresenceItem[] = [];
          snapshot.forEach((docSnap) => {
            users.push(normalizePresenceEntry(docSnap.data()));
          });
          firestoreUsers = users;
          emitMerged();
        },
        (err) => {
          console.warn('Presence subscription notice:', err);
        }
      );
    } catch {
      // ignore
    }
  }

  // Periodically re-evaluate staleness so closed/unfocused sessions flip offline automatically
  const staleCheckInterval = window.setInterval(emitMerged, 15000);

  return () => {
    unsubFirestore();
    window.clearInterval(staleCheckInterval);
    try {
      bc?.close();
    } catch {
      // ignore
    }
  };
};

// 2D. Live Canvas Card Move Sync (Evaluation → Adjudication etc.)
export const broadcastCardMove = async (
  innovationId: number | string,
  fromStage: string,
  toStage: string,
  user: string
) => {
  if (!firestore) return;
  try {
    await addDoc(collection(firestore, 'canvas_moves'), {
      innovationId,
      fromStage,
      toStage,
      user,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Canvas move broadcast fallback:', err);
  }
};

export const subscribeToCardMoves = (
  callback: (move: {
    innovationId: number | string;
    fromStage: string;
    toStage: string;
    user: string;
    timestamp?: string;
  }) => void
) => {
  if (!firestore) return () => {};
  try {
    const q = query(collection(firestore, 'canvas_moves'), orderBy('timestamp', 'desc'), limit(1));
    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            callback(change.doc.data() as any);
          }
        });
      },
      (err) => {
        console.warn('Card moves subscription notice:', err);
      }
    );
  } catch (err) {
    return () => {};
  }
};

// 3. Firebase Storage Document Upload Helper
export const uploadInnovationDocument = async (
  innovationId: number | string,
  file: File,
  uploadedByUserId?: number
): Promise<{ filename: string; fileUrl: string }> => {
  if (!storage) {
    throw new Error('Firebase Storage is not configured');
  }
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fileRef = storageRef(storage, `innovations/${innovationId}/documents/${safeName}`);
  await uploadBytes(fileRef, file);
  const fileUrl = await getDownloadURL(fileRef);

  if (!isNaN(Number(innovationId))) {
    try {
      await fetch(`/api/innovations/${innovationId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileUrl,
          uploadedBy: uploadedByUserId,
        }),
      });
    } catch (err) {
      console.warn('Document metadata PostgreSQL sync notice:', err);
    }
  }

  return { filename: file.name, fileUrl };
};

// ============================================================================
// 4. Collaborative Workspace Real-Time Sync (Firestore)
// ============================================================================

export const saveWorkspaceToFirestore = async (
  workspaceId: string,
  state: Record<string, any>,
  updatedByClientId: string
) => {
  if (!firestore || !workspaceId) return;
  try {
    const wsRef = doc(firestore, 'workspaces', workspaceId);
    await setDoc(
      wsRef,
      {
        workspaceId,
        stateJson: JSON.stringify(state),
        updatedByClientId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore workspace save fallback:', err);
  }
};

export const subscribeToWorkspaceFirestore = (
  workspaceId: string,
  localClientId: string,
  onRemoteState: (state: Record<string, any>) => void
) => {
  if (!firestore || !workspaceId) return () => {};
  try {
    const wsRef = doc(firestore, 'workspaces', workspaceId);
    return onSnapshot(
      wsRef,
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (data.updatedByClientId === localClientId) return;
        if (data.stateJson) {
          try {
            const parsed = JSON.parse(data.stateJson);
            onRemoteState(parsed);
          } catch {}
        }
      },
      (err) => {
        console.warn('Firestore workspace subscription notice:', err);
      }
    );
  } catch {
    return () => {};
  }
};

// ============================================================================
// 5. Real-Time Global Session Policy & Admin Alerts (Firestore)
// ============================================================================

export const broadcastGlobalLogout = async (triggeredBy: string) => {
  if (!firestore) return;
  try {
    const policyRef = doc(firestore, 'system_control', 'session_policy');
    await setDoc(
      policyRef,
      {
        loggedOutAt: Date.now(),
        triggeredBy,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore global logout broadcast notice:', err);
  }
};

export const subscribeToGlobalLogout = (
  onGlobalLogout: (loggedOutAt: number, triggeredBy: string) => void
) => {
  if (!firestore) return () => {};
  try {
    const policyRef = doc(firestore, 'system_control', 'session_policy');
    return onSnapshot(
      policyRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (typeof data.loggedOutAt === 'number') {
          onGlobalLogout(data.loggedOutAt, data.triggeredBy || 'Administrator');
        }
      },
      (err) => {
        console.warn('Firestore session policy subscription notice:', err);
      }
    );
  } catch {
    return () => {};
  }
};

export const publishAdminAlert = async (alert: {
  id: string;
  targetUserId: number;
  targetUserName: string;
  targetUserRole: string;
  type: string;
  title: string;
  message: string;
  relatedIdeaCode?: string;
}) => {
  if (!firestore) return;
  try {
    await addDoc(collection(firestore, 'admin_alerts'), {
      ...alert,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore admin alert publish notice:', err);
  }
};

export const subscribeToAdminAlerts = (
  onAlerts: (alerts: any[]) => void
) => {
  if (!firestore) return () => {};
  try {
    const q = query(
      collection(firestore, 'admin_alerts'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...(d.data() as any),
          firestoreId: d.id,
          timestamp: formatTimestamp(d.data().createdAt || d.data().timestamp),
        }));
        onAlerts(items);
      },
      (err) => {
        console.warn('Firestore admin alerts subscription notice:', err);
      }
    );
  } catch {
    return () => {};
  }
};

// ============================================================================
// 6. Firestore User Directory Sync (Admin-created & Self-registered users)
// ============================================================================

export const saveUserProfileToFirestore = async (user: {
  id?: number;
  firebaseUid?: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: string;
  department?: string;
  status?: string;
}) => {
  if (!firestore || !user.email) return;
  try {
    const docKey = (user.firebaseUid || user.email.trim().toLowerCase()).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const userRef = doc(firestore, 'users', docKey);
    await setDoc(
      userRef,
      {
        id: user.id ?? null,
        firebaseUid: user.firebaseUid || docKey,
        email: user.email.trim().toLowerCase(),
        firstName: user.firstName,
        lastName: user.lastName || '',
        role: user.role,
        department: user.department || 'General',
        status: user.status || 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore user profile sync notice:', err);
  }
};

export const deleteUserProfileFromFirestore = async (firebaseUid?: string, email?: string) => {
  if (!firestore) return;
  try {
    const keys = new Set<string>();
    if (firebaseUid) keys.add(firebaseUid.replace(/[^a-zA-Z0-9_.-]/g, '_'));
    if (email) {
      keys.add(email.trim().toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, '_'));
      keys.add(email.trim().toLowerCase());
    }
    for (const key of keys) {
      try {
        await deleteDoc(doc(firestore, 'users', key));
      } catch {}
      try {
        await deleteDoc(doc(firestore, 'user_presence', key));
      } catch {}
      if (realtimeDb) {
        try {
          await remove(rtdbRef(realtimeDb, `status/${key}`));
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Firestore user profile delete notice:', err);
  }
};

// ============================================================================
// 7. Real-Time Submissions, Clarification Chats & Evaluator Assignments
// ============================================================================

const SUBMISSIONS_BROADCAST_CHANNEL = 'ceda_realtime_submissions_v1';

const stripUndefinedDeep = (val: any): any => {
  if (val === undefined) return undefined;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map(stripUndefinedDeep).filter((v) => v !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      const sanitized = stripUndefinedDeep(v);
      if (sanitized !== undefined) {
        clean[k] = sanitized;
      }
    }
  }
  return clean;
};

export const publishNewSubmission = async (submission: any) => {
  const docKey = String(submission?.id || `sub_${Date.now()}`);
  const cleanPayload = stripUndefinedDeep({
    ...submission,
    id: docKey,
    submittedAt: new Date().toISOString(),
    createdAtMs: Date.now(),
  });

  // Instant same-origin cross-tab broadcast (works even before Firestore round-trip)
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(SUBMISSIONS_BROADCAST_CHANNEL);
      bc.postMessage(cleanPayload);
      bc.close();
    }
  } catch {
    // ignore BroadcastChannel failures
  }

  if (!firestore) return;
  try {
    await setDoc(doc(firestore, 'realtime_submissions', docKey), {
      ...cleanPayload,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore publish new submission notice:', err);
  }
};

export const clearRealtimeSubmissionsQueue = async () => {
  if (!firestore) return;
  try {
    const snap = await getDocs(collection(firestore, 'realtime_submissions'));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('Firestore clear realtime submissions notice:', err);
  }
};

export const subscribeToNewSubmissions = (callback: (idea: any) => void) => {
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(SUBMISSIONS_BROADCAST_CHANNEL);
      bc.onmessage = (ev) => {
        if (ev?.data && ev.data.title) {
          callback(ev.data);
        }
      };
    }
  } catch {
    bc = null;
  }

  let unsubFirestore = () => {};
  if (firestore) {
    try {
      const q = query(
        collection(firestore, 'realtime_submissions'),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const data = change.doc.data();
              callback({ ...data, id: data.id || change.doc.id });
            }
          });
        },
        (err) => {
          console.warn('Firestore new submissions listener notice:', err);
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubFirestore();
    try {
      bc?.close();
    } catch {
      // ignore
    }
  };
};

export interface ClarificationChatMessage {
  id?: string;
  innovationId: string | number;
  ideaTitle?: string;
  innovationNumber?: string;
  senderId: string | number;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp?: string;
  createdAtMs?: number;
  createdAt?: any;
  localMessageId?: string;
}

const CLARIFICATION_BROADCAST_CHANNEL = 'ceda_clarification_chat_v1';

export const getCanonicalClarificationKey = (
  innovationId: string | number | undefined,
  ideaTitle?: string
): string => {
  const cleanTitle = (ideaTitle || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (cleanTitle) return `title_${cleanTitle}`;
  return String(innovationId || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
};

const loadLocalChatHistory = (keys: string[]): ClarificationChatMessage[] => {
  if (typeof window === 'undefined') return [];
  const collected: ClarificationChatMessage[] = [];
  keys.forEach((k) => {
    try {
      const raw = localStorage.getItem(`ceda_chat_local_${k}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) collected.push(...parsed);
      }
    } catch {
      // ignore storage errors
    }
  });
  return collected;
};

const persistLocalChatMessage = (keys: string[], msg: ClarificationChatMessage) => {
  if (typeof window === 'undefined') return;
  keys.forEach((k) => {
    try {
      const storageKey = `ceda_chat_local_${k}`;
      const existingRaw = localStorage.getItem(storageKey);
      const existing: ClarificationChatMessage[] = existingRaw ? JSON.parse(existingRaw) : [];
      if (!existing.some((m) => m.localMessageId && m.localMessageId === msg.localMessageId)) {
        const next = [...existing, msg].slice(-100);
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
    } catch {
      // ignore storage quota errors
    }
  });
};

export const sendClarificationMessage = async (
  innovationId: string | number,
  msg: Omit<ClarificationChatMessage, 'innovationId'>
) => {
  const primaryKey = getCanonicalClarificationKey(innovationId, msg.ideaTitle);
  const channelKeys = Array.from(
    new Set(
      [
        primaryKey,
        String(innovationId || '').trim(),
        String(msg.innovationNumber || '').trim(),
      ].filter(Boolean)
    )
  );
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const localMessageId = `chat_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;

  const payload = stripUndefinedDeep({
    ...msg,
    innovationId: String(innovationId),
    timestamp: nowIso,
    createdAtMs: nowMs,
    localMessageId,
  }) as ClarificationChatMessage;

  persistLocalChatMessage([primaryKey], payload);

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CLARIFICATION_BROADCAST_CHANNEL);
      bc.postMessage({ channelKeys, message: payload });
      bc.close();
    }
  } catch {
    // ignore BroadcastChannel failures
  }

  if (!firestore || !primaryKey) return;
  try {
    const chatColl = collection(firestore, 'clarification_chats', primaryKey, 'messages');
    await addDoc(chatColl, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore clarification message send notice:', err);
  }
};

export const subscribeToClarificationChat = (
  innovationId: string | number,
  callback: (messages: ClarificationChatMessage[]) => void,
  options?: { ideaTitle?: string; extraKeys?: (string | number | undefined)[] }
) => {
  const primaryKey = getCanonicalClarificationKey(innovationId, options?.ideaTitle);
  const watchKeys = Array.from(
    new Set(
      [
        primaryKey,
        String(innovationId || '').trim(),
        ...(options?.extraKeys || []).map((k) => String(k || '').trim()),
      ].filter(Boolean)
    )
  );

  if (watchKeys.length === 0) return () => {};

  const messagesByKey: Record<string, ClarificationChatMessage[]> = {};
  const liveBroadcastMsgs: ClarificationChatMessage[] = loadLocalChatHistory(watchKeys);
  const watchKeySet = new Set(watchKeys.map((k) => k.toLowerCase()));
  const titleNorm = (options?.ideaTitle || '').trim().toLowerCase();

  const emitMerged = () => {
    const all = [
      ...liveBroadcastMsgs,
      ...Object.values(messagesByKey).flat(),
    ];
    const dedupMap = new Map<string, ClarificationChatMessage>();
    all.forEach((m) => {
      const tsMs =
        typeof m.createdAtMs === 'number'
          ? m.createdAtMs
          : m.timestamp
            ? Date.parse(m.timestamp) || 0
            : 0;
      const dedupeKey =
        m.localMessageId ||
        m.id ||
        `${m.senderName}|${m.senderRole}|${m.message}|${Math.floor(tsMs / 2000)}`;
      if (!dedupMap.has(dedupeKey)) {
        dedupMap.set(dedupeKey, m);
      }
    });

    const sorted = Array.from(dedupMap.values()).sort((a, b) => {
      const aMs =
        typeof a.createdAtMs === 'number'
          ? a.createdAtMs
          : a.createdAt?.toMillis?.() ?? (a.timestamp ? Date.parse(a.timestamp) || 0 : 0);
      const bMs =
        typeof b.createdAtMs === 'number'
          ? b.createdAtMs
          : b.createdAt?.toMillis?.() ?? (b.timestamp ? Date.parse(b.timestamp) || 0 : 0);
      return aMs - bMs;
    });
    callback(sorted);
  };

  if (liveBroadcastMsgs.length > 0) {
    emitMerged();
  }

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(CLARIFICATION_BROADCAST_CHANNEL);
      bc.onmessage = (ev) => {
        const incomingKeys: string[] = Array.isArray(ev?.data?.channelKeys)
          ? ev.data.channelKeys.map((k: string) => String(k).toLowerCase())
          : [];
        const msg = ev?.data?.message as ClarificationChatMessage | undefined;
        if (!msg) return;
        const msgTitleNorm = (msg.ideaTitle || '').trim().toLowerCase();
        const matchesKey = incomingKeys.some((k) => watchKeySet.has(k));
        const matchesTitle = titleNorm && msgTitleNorm && msgTitleNorm === titleNorm;
        if (matchesKey || matchesTitle) {
          liveBroadcastMsgs.push(msg);
          emitMerged();
        }
      };
    }
  } catch {
    bc = null;
  }

  const unsubs: (() => void)[] = [];
  if (firestore) {
    watchKeys.forEach((key) => {
      try {
        const chatColl = collection(firestore!, 'clarification_chats', key, 'messages');
        const q = query(chatColl, orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(
          q,
          (snapshot) => {
            messagesByKey[key] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }));
            emitMerged();
          },
          (err) => {
            console.warn('Firestore clarification chat subscription notice:', err);
          }
        );
        unsubs.push(unsub);
      } catch {
        // ignore invalid channel key
      }
    });
  }

  return () => {
    unsubs.forEach((u) => u());
    try {
      bc?.close();
    } catch {
      // ignore
    }
  };
};

export const saveIdeaAssignment = async (assignment: {
  innovationId: string;
  ideaTitle: string;
  evaluatorId: number | string;
  evaluatorEmail: string;
  evaluatorName: string;
  assignedAt: string;
  status: string;
  idea: any;
}) => {
  if (!firestore) return;
  try {
    const key = `${assignment.evaluatorId}_${assignment.innovationId}`;
    await setDoc(
      doc(firestore, 'assigned_ideas', key),
      {
        ...assignment,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore save idea assignment notice:', err);
  }
};

export const subscribeToAssignedIdeas = (
  evaluatorId: number | string,
  evaluatorEmailOrCallback: string | ((assignments: any[]) => void),
  optionalCallback?: (assignments: any[]) => void
) => {
  if (!firestore || !evaluatorId) return () => {};
  const evaluatorEmail = typeof evaluatorEmailOrCallback === 'string' ? evaluatorEmailOrCallback : undefined;
  const callback = typeof evaluatorEmailOrCallback === 'function' ? evaluatorEmailOrCallback : optionalCallback;
  if (!callback) return () => {};

  try {
    const qAll = collection(firestore, 'assigned_ideas');
    return onSnapshot(
      qAll,
      (snapshot) => {
        const idStr = String(evaluatorId);
        const emailLower = evaluatorEmail ? evaluatorEmail.trim().toLowerCase() : '';
        const list = snapshot.docs
          .map((d) => d.data())
          .filter((a: any) => {
            const matchesId = a.evaluatorId && String(a.evaluatorId) === idStr;
            const matchesEmail = emailLower && a.evaluatorEmail && a.evaluatorEmail.trim().toLowerCase() === emailLower;
            return matchesId || matchesEmail;
          });
        callback(list);
      },
      (err) => {
        console.warn('subscribeToAssignedIdeas snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('subscribeToAssignedIdeas error:', err);
    return () => {};
  }
};

export const deleteIdeaAssignment = async (
  evaluatorId: number | string,
  innovationId: string
) => {
  if (!firestore || !evaluatorId || !innovationId) return;
  try {
    const key = `${evaluatorId}_${innovationId}`;
    await deleteDoc(doc(firestore, 'assigned_ideas', key));
  } catch (err) {
    console.warn('deleteIdeaAssignment notice:', err);
  }
};

export const deleteIdeaAssignmentsByInnovationId = async (
  innovationId: string
) => {
  if (!firestore || !innovationId) return;
  try {
    const qAll = collection(firestore, 'assigned_ideas');
    const snap = await getDocs(qAll);
    const toDelete = snap.docs.filter((d) => d.data()?.innovationId === innovationId);
    await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('deleteIdeaAssignmentsByInnovationId notice:', err);
  }
};

export const subscribeToAllIdeaAssignments = (
  callback: (assignments: any[]) => void
) => {
  if (!firestore) return () => {};
  try {
    const qAll = collection(firestore, 'assigned_ideas');
    return onSnapshot(
      qAll,
      (snapshot) => {
        callback(snapshot.docs.map((d) => d.data()));
      },
      (err) => {
        console.warn('subscribeToAllIdeaAssignments notice:', err);
      }
    );
  } catch {
    return () => {};
  }
};

// ============================================================================
// 8. Real-Time Workspace Collaboration Invites & Live Canvas Name Tag Cursors
// ============================================================================

export interface WorkspaceInviteEvent {
  id?: string;
  workspaceId: string;
  workspaceName: string;
  invitedEmail: string;
  invitedByName: string;
  createdAtMs: number;
}

const WORKSPACE_INVITES_BC = 'ceda_workspace_invites_v1';

export const publishWorkspaceInviteEvent = async (
  invite: Omit<WorkspaceInviteEvent, 'id' | 'createdAtMs'>
) => {
  const payload: WorkspaceInviteEvent = {
    ...invite,
    invitedEmail: invite.invitedEmail.trim().toLowerCase(),
    createdAtMs: Date.now(),
    id: `wsinv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(WORKSPACE_INVITES_BC);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // ignore
  }

  if (!firestore) return;
  try {
    await addDoc(collection(firestore, 'workspace_invites'), {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Workspace invite broadcast notice:', err);
  }
};

export const subscribeToWorkspaceInvites = (
  userEmail: string,
  callback: (invite: WorkspaceInviteEvent) => void
) => {
  const emailLower = userEmail.trim().toLowerCase();
  if (!emailLower) return () => {};

  const seenIds = new Set<string>();
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(WORKSPACE_INVITES_BC);
      bc.onmessage = (ev) => {
        const inv = ev?.data as WorkspaceInviteEvent | undefined;
        if (!inv || inv.invitedEmail !== emailLower) return;
        if (inv.id && seenIds.has(inv.id)) return;
        if (inv.id) seenIds.add(inv.id);
        callback(inv);
      };
    }
  } catch {
    bc = null;
  }

  let unsubFirestore = () => {};
  let initialSnapshot = true;
  if (firestore) {
    try {
      const q = query(
        collection(firestore, 'workspace_invites'),
        orderBy('createdAtMs', 'desc'),
        limit(20)
      );
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const inv = { id: change.doc.id, ...(change.doc.data() as any) } as WorkspaceInviteEvent;
            if (inv.invitedEmail !== emailLower) return;
            const isRecent = Date.now() - Number(inv.createdAtMs || 0) < 30_000;
            if (initialSnapshot && !isRecent) {
              if (inv.id) seenIds.add(inv.id);
              return;
            }
            if (inv.id && seenIds.has(inv.id)) return;
            if (inv.id) seenIds.add(inv.id);
            callback(inv);
          });
          initialSnapshot = false;
        },
        (err) => {
          console.warn('Workspace invites subscription notice:', err);
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubFirestore();
    try {
      bc?.close();
    } catch {
      // ignore
    }
  };
};

export interface WorkspaceCursorItem {
  workspaceId: string;
  userId: string | number;
  userName: string;
  role: string;
  email?: string;
  canvasX: number;
  canvasY: number;
  color: string;
  isFocused: boolean;
  updatedAtMs: number;
}

const WORKSPACE_CURSORS_BC = 'ceda_workspace_cursors_v1';
const CURSOR_STALE_MS = 45_000;

export const publishWorkspaceCursor = async (cursor: Omit<WorkspaceCursorItem, 'updatedAtMs'>) => {
  if (!cursor.workspaceId || !cursor.userId) return;
  const payload: WorkspaceCursorItem = {
    ...cursor,
    email: cursor.email ? cursor.email.trim().toLowerCase() : undefined,
    updatedAtMs: Date.now(),
  };

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(WORKSPACE_CURSORS_BC);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // ignore
  }

  if (!firestore) return;
  try {
    const userKey = String(cursor.userId).replace(/[^a-zA-Z0-9_.-]/g, '_');
    await setDoc(
      doc(firestore, 'workspace_collaborators', cursor.workspaceId, 'cursors', userKey),
      {
        ...stripUndefinedDeep(payload),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // ignore transient write errors
  }
};

export const leaveWorkspaceCursor = async (workspaceId: string, userId: string | number) => {
  if (!workspaceId || !userId) return;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(WORKSPACE_CURSORS_BC);
      bc.postMessage({ workspaceId, userId, isFocused: false, updatedAtMs: Date.now() });
      bc.close();
    }
  } catch {
    // ignore
  }
  if (!firestore) return;
  try {
    const userKey = String(userId).replace(/[^a-zA-Z0-9_.-]/g, '_');
    await deleteDoc(doc(firestore, 'workspace_collaborators', workspaceId, 'cursors', userKey));
  } catch {
    // ignore
  }
};

export const subscribeToWorkspaceCursors = (
  workspaceId: string,
  callback: (cursors: WorkspaceCursorItem[]) => void
) => {
  if (!workspaceId) return () => {};
  const firestoreMap = new Map<string, WorkspaceCursorItem>();
  const broadcastMap = new Map<string, WorkspaceCursorItem>();

  const emitMerged = () => {
    const now = Date.now();
    const merged = new Map<string, WorkspaceCursorItem>();
    for (const c of [...firestoreMap.values(), ...broadcastMap.values()]) {
      if (!c || c.workspaceId !== workspaceId) continue;
      if (!c.isFocused) {
        merged.delete(String(c.userId));
        continue;
      }
      if (now - Number(c.updatedAtMs || 0) > CURSOR_STALE_MS) continue;
      const key = String(c.userId);
      const prev = merged.get(key);
      if (!prev || c.updatedAtMs >= prev.updatedAtMs) {
        merged.set(key, c);
      }
    }
    callback(Array.from(merged.values()));
  };

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(WORKSPACE_CURSORS_BC);
      bc.onmessage = (ev) => {
        const c = ev?.data as WorkspaceCursorItem | undefined;
        if (!c || c.workspaceId !== workspaceId || !c.userId) return;
        const key = String(c.userId);
        if (!c.isFocused) {
          broadcastMap.delete(key);
          firestoreMap.delete(key);
        } else {
          broadcastMap.set(key, c);
        }
        emitMerged();
      };
    }
  } catch {
    bc = null;
  }

  let unsubFirestore = () => {};
  if (firestore) {
    try {
      const coll = collection(firestore, 'workspace_collaborators', workspaceId, 'cursors');
      unsubFirestore = onSnapshot(
        coll,
        (snapshot) => {
          firestoreMap.clear();
          snapshot.forEach((d) => {
            const data = d.data() as WorkspaceCursorItem;
            if (data && data.userId) {
              firestoreMap.set(String(data.userId), data);
            }
          });
          emitMerged();
        },
        (err) => {
          console.warn('Workspace cursors subscription notice:', err);
        }
      );
    } catch {
      // ignore
    }
  }

  const pruneInterval = window.setInterval(emitMerged, 10000);

  return () => {
    unsubFirestore();
    window.clearInterval(pruneInterval);
    try {
      bc?.close();
    } catch {
      // ignore
    }
  };
};

// ============================================================================
// 9. Real-Time Citizen Enquiry Queue Sync (Submitter -> Admin Enquiry Queue & Agent Chat)
// ============================================================================

const CITIZEN_ENQUIRIES_BC = 'ceda_citizen_enquiries_v1';

export const publishCitizenEnquiry = async (enquiry: any) => {
  if (!enquiry || !enquiry.id) return;
  const cleanPayload = stripUndefinedDeep({
    ...enquiry,
    updatedAtMs: Date.now(),
  });

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CITIZEN_ENQUIRIES_BC);
      bc.postMessage(cleanPayload);
      bc.close();
    }
  } catch {
    // ignore BroadcastChannel failures
  }

  if (!firestore) return;
  try {
    const docId = String(enquiry.id).replace(/[^a-zA-Z0-9_.-]/g, '_');
    await setDoc(
      doc(firestore, 'citizen_enquiries', docId),
      {
        ...cleanPayload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore publishCitizenEnquiry notice:', err);
  }
};

export const subscribeToCitizenEnquiries = (callback: (items: any[]) => void) => {
  const firestoreMap = new Map<string, any>();
  const broadcastMap = new Map<string, any>();

  const emitMerged = () => {
    const merged = new Map<string, any>();
    for (const item of [...firestoreMap.values(), ...broadcastMap.values()]) {
      if (!item?.id) continue;
      const prev = merged.get(String(item.id));
      const itemUpdated = Number(item.updatedAtMs || item.rawTimestamp || 0);
      const prevUpdated = Number(prev?.updatedAtMs || prev?.rawTimestamp || 0);
      if (!prev || itemUpdated >= prevUpdated) {
        merged.set(String(item.id), item);
      }
    }
    const sorted = Array.from(merged.values()).sort(
      (a, b) => Number(a.rawTimestamp || 0) - Number(b.rawTimestamp || 0)
    );
    callback(sorted);
  };

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(CITIZEN_ENQUIRIES_BC);
      bc.onmessage = (ev) => {
        const data = ev?.data;
        if (data?.id) {
          broadcastMap.set(String(data.id), data);
          emitMerged();
        }
      };
    }
  } catch {
    bc = null;
  }

  let unsubFirestore = () => {};
  if (firestore) {
    try {
      const qAll = collection(firestore, 'citizen_enquiries');
      unsubFirestore = onSnapshot(
        qAll,
        (snapshot) => {
          firestoreMap.clear();
          snapshot.forEach((d) => {
            const data = d.data();
            if (data?.id) firestoreMap.set(String(data.id), data);
          });
          emitMerged();
        },
        (err) => {
          console.warn('Citizen enquiries subscription notice:', err);
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubFirestore();
    try {
      bc?.close();
    } catch {
      // ignore
    }
  };
};

// ============================================================================
// 10. Real-Time Adjudication Queue Sync (Promoted by Evaluators -> Adjudicators & Admin)
// ============================================================================

const ADJUDICATION_QUEUE_BC = 'ceda_adjudication_queue_v1';

export const publishAdjudicationQueueItem = async (item: any) => {
  if (!item || !item.id) return;
  const cleanPayload = stripUndefinedDeep({
    ...item,
    status: 'completed',
    stageId: 'approval_board',
    stage: 'adjudication',
    promotedToAdjudicationAtMs: Date.now(),
  });

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(ADJUDICATION_QUEUE_BC);
      bc.postMessage(cleanPayload);
      bc.close();
    }
  } catch {
    // ignore
  }

  if (!firestore) return;
  try {
    const docId = String(item.id).replace(/[^a-zA-Z0-9_.-]/g, '_');
    await setDoc(
      doc(firestore, 'adjudication_queue', docId),
      {
        ...cleanPayload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore publishAdjudicationQueueItem notice:', err);
  }
};

export const removeAdjudicationQueueItem = async (id: string) => {
  if (!id) return;
  const docId = String(id).replace(/[^a-zA-Z0-9_.-]/g, '_');

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(ADJUDICATION_QUEUE_BC);
      bc.postMessage({ id: String(id), __deleted: true });
      bc.close();
    }
  } catch {
    // ignore
  }

  if (!firestore) return;
  try {
    await deleteDoc(doc(firestore, 'adjudication_queue', docId));
  } catch (err) {
    console.warn('Firestore removeAdjudicationQueueItem notice:', err);
  }
};

export const subscribeToAdjudicationQueue = (callback: (items: any[]) => void) => {
  const firestoreMap = new Map<string, any>();
  const broadcastMap = new Map<string, any>();
  const deletedIds = new Set<string>();

  const emitMerged = () => {
    const merged = new Map<string, any>();
    for (const item of [...firestoreMap.values(), ...broadcastMap.values()]) {
      if (!item?.id || deletedIds.has(String(item.id))) continue;
      merged.set(String(item.id), item);
    }
    callback(Array.from(merged.values()));
  };

  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(ADJUDICATION_QUEUE_BC);
      bc.onmessage = (ev) => {
        const data = ev?.data;
        if (data?.id) {
          if (data.__deleted) {
            deletedIds.add(String(data.id));
            broadcastMap.delete(String(data.id));
            firestoreMap.delete(String(data.id));
          } else {
            deletedIds.delete(String(data.id));
            broadcastMap.set(String(data.id), data);
          }
          emitMerged();
        }
      };
    }
  } catch {
    bc = null;
  }

  let unsubFirestore = () => {};
  if (firestore) {
    try {
      const qAll = collection(firestore, 'adjudication_queue');
      unsubFirestore = onSnapshot(
        qAll,
        (snapshot) => {
          firestoreMap.clear();
          snapshot.forEach((d) => {
            const data = d.data();
            if (data?.id) {
              deletedIds.delete(String(data.id));
              firestoreMap.set(String(data.id), data);
            }
          });
          emitMerged();
        },
        (err) => {
          console.warn('Adjudication queue subscription notice:', err);
        }
      );
    } catch {
      // ignore
    }
  }

  return () => {
    unsubFirestore();
    try {
      bc?.close();
    } catch {
      // ignore
    }
  };
};
