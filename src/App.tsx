import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile, UserRole } from './types';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import EmployeeView from './components/EmployeeView';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("App: initializing auth listener...");
    let unsubscribeProfile: (() => void) | null = null;
    let isInitialAuth = true;

    // Safety timeout: if auth hasn't responded in 10 seconds, force stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("App: Auth initialization timed out after 10s");
        setLoading(false);
      }
    }, 10000);

    const handleProfile = async (authUser: User) => {
      try {
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.log("App: creating new user profile...");
          const isAdmin = authUser.email === 'facecuongle@gmail.com';
          const newProfile: UserProfile = {
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || 'Anonymous',
            role: isAdmin ? UserRole.ADMIN : UserRole.EMPLOYEE,
            photoURL: authUser.photoURL || undefined,
            isOnline: true,
            lastSeen: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(userDoc.data() as UserProfile);
        }

        if (unsubscribeProfile) unsubscribeProfile();
        unsubscribeProfile = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          }
        }, (err) => console.error("Profile sync error:", err));
      } catch (error) {
        console.error("Profile handling error:", error);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      console.log("App: auth state changed:", authUser ? authUser.email : "none");
      setUser(authUser);
      
      if (authUser) {
        handleProfile(authUser);
      } else {
        setProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setLoading(false);
        clearTimeout(timeout);
      }
      isInitialAuth = false;
    }, (error) => {
      console.error("Auth listener error:", error);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {profile.role === UserRole.ADMIN ? (
        <AdminDashboard profile={profile} />
      ) : (
        <EmployeeView profile={profile} />
      )}
    </div>
  );
}
