import React from 'react';
import { motion } from 'motion/react';
import { LogIn, MapPin, ClipboardList, Bell, ShieldCheck, Globe, Zap } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';

export default function Auth() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl shadow-slate-200 overflow-hidden relative z-10 border border-white"
      >
        <div className="p-12 text-center">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200"
          >
            <ShieldCheck className="text-blue-500 w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">SEO TrackMaster</h1>
          <p className="text-slate-500 text-lg font-medium max-w-sm mx-auto leading-relaxed">
            Hệ thống quản lý định vị và công việc chuyên sâu cho nhân viên thị trường
          </p>
        </div>

        <div className="px-12 pb-12 space-y-8">
          <div className="grid grid-cols-3 gap-6">
            <FeatureItem icon={<MapPin />} label="GPS Thực" color="text-emerald-600" />
            <FeatureItem icon={<Zap />} label="Nhắc nhở" color="text-amber-600" />
            <FeatureItem icon={<Globe />} label="Reporting" color="text-blue-600" />
          </div>

          <div className="pt-4">
            <button 
              onClick={() => loginWithGoogle()}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] flex items-center justify-center gap-4 font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200 group active:scale-95"
            >
              <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              Đăng nhập bằng Google
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-4">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              Secure Auth
            </span>
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              Real-time Sync
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureItem({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center ${color} shadow-sm border border-slate-100`}>
        {icon}
      </div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}
