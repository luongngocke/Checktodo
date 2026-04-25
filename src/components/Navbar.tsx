import { LogOut, User, ShieldCheck } from 'lucide-react';
import { logout } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface NavbarProps {
  profile: UserProfile;
}

export default function Navbar({ profile }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-10 h-16 sm:h-20 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
        <div className="w-9 h-9 sm:w-12 sm:h-12 bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 shrink-0">
          <ShieldCheck className="text-blue-500 w-5 h-5 sm:w-7 sm:h-7" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight truncate">TrackMaster</h2>
          <p className="text-[8px] sm:text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none mt-1 truncate">
            {profile.role === UserRole.ADMIN ? 'Admin Control' : 'Staff Portal'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-black text-slate-900">{profile.displayName}</span>
          <span className="text-[10px] text-slate-400 font-bold tracking-wide">{profile.email}</span>
        </div>
        
        <div className="relative group shrink-0">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-white shadow-lg shadow-slate-100 object-cover" />
          ) : (
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 border-white shadow-lg shadow-slate-100">
              <User className="text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          )}
        </div>

        <div className="w-px h-6 sm:h-8 bg-slate-200 mx-1 hidden xs:block" />

        <button 
          onClick={() => logout()}
          className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all group shadow-sm active:scale-95 shrink-0"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 sm:group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </nav>
  );
}
