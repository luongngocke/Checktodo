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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App: initializing auth listener...");
    let unsubscribeProfile: (() => void) | null = null;

    const handleProfile = async (authUser: User) => {
      try {
        setError(null);
        console.log("App: fetching profile for", authUser.uid);
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.log("App: profile not found, creating default...");
          // Designated admin check
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
          console.log("App: profile created successfully");
          setProfile(newProfile);
        } else {
          console.log("App: profile found");
          setProfile(userDoc.data() as UserProfile);
        }

        // Setup real-time updates
        if (unsubscribeProfile) unsubscribeProfile();
        unsubscribeProfile = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          }
        }, (err) => {
          console.error("Profile sync error:", err);
          setError("Lỗi đồng bộ hồ sơ: " + err.message);
        });
      } catch (err: any) {
        console.error("Profile handling error:", err);
        setError("Lỗi tải hồ sơ: " + (err.message || String(err)));
      } finally {
        setLoading(false);
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
      }
    }, (err) => {
      console.error("Auth listener error:", err);
      setError("Lỗi xác thực: " + err.message);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Đang tải hệ thống...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Đã xảy ra lỗi</h2>
        <p className="text-slate-500 text-center max-w-xs mb-8">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
        >
          Thử lại
        </button>
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
