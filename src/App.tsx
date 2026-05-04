/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Activity, Shield, Info, BarChart3, 
  LayoutDashboard, Video, FolderArchive, 
  Settings, LogOut, Download
} from "lucide-react";
import VideoProcessor from "./components/VideoProcessor";
import ReportTable from "./components/ReportTable";
import { DetectedPlate } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [plates, setPlates] = useState<DetectedPlate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load plates from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cctv_plates_today");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const today = new Date().setHours(0, 0, 0, 0);
        const todayPlates = parsed.filter((p: DetectedPlate) => p.timestamp >= today);
        setPlates(todayPlates);
      } catch (e) {
        console.error("Failed to load saved plates", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cctv_plates_today", JSON.stringify(plates));
  }, [plates]);

  const handlePlateDetected = (newPlate: DetectedPlate) => {
    const isDuplicate = plates.some(
      (p) => p.plate === newPlate.plate && newPlate.timestamp - p.timestamp < 30000
    );

    if (!isDuplicate) {
      setPlates((prev) => [newPlate, ...prev]);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">VisionGuard AI</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded-lg text-sm font-medium">
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-lg text-sm transition-colors">
            <Video size={18} />
            Live Monitor
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-lg text-sm transition-colors">
            <FolderArchive size={18} />
            Archived Footage
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-lg text-sm transition-colors">
            <BarChart3 size={18} />
            LPR Reports
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 rounded-lg text-sm transition-colors">
            <Settings size={18} />
            System Settings
          </a>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              AU
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Admin User</p>
              <p className="text-slate-500">Operational</p>
            </div>
            <button className="ml-auto text-slate-500 hover:text-white transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-800">LPR Analytics Dashboard</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Gateway Terminal • Cam-04</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block bg-slate-100 px-3 py-1.5 rounded text-sm text-slate-600 font-medium border border-slate-200">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
              <Download size={16} />
              Export Report
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Vehicles</p>
              <p className="text-2xl font-black text-slate-800">{plates.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Successful Reads</p>
              <p className="text-2xl font-black text-emerald-600">
                {plates.filter(p => p.confidence > 0.6).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Flagged List</p>
              <p className="text-2xl font-black text-rose-600">0</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Accuracy Rate</p>
              <p className="text-2xl font-black text-blue-600">
                {plates.length > 0 
                  ? (plates.reduce((acc, curr) => acc + curr.confidence, 0) / plates.length * 100).toFixed(1) 
                  : '0.0'}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Left Column: Video */}
            <div className="xl:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" />
                  Live Recognition Feed
                </h2>
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-tighter">
                  <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  {isProcessing ? 'System Active' : 'Standby Mode'}
                </div>
              </div>
              <VideoProcessor 
                onPlateDetected={handlePlateDetected} 
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </div>
            
            {/* Right Column: Latest Detection */}
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col">
                <h2 className="text-sm font-bold border-b border-slate-100 pb-3 mb-4 text-slate-800">Latest Detection Event</h2>
                
                {plates.length > 0 ? (
                  <div className="space-y-6 flex-1">
                    <div className="h-32 bg-slate-900 rounded-lg flex items-center justify-center border-2 border-slate-800 overflow-hidden relative group">
                      <img 
                        src={plates[0].thumbnail} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                        alt="Plate view" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white/90 text-slate-950 px-4 py-2 rounded font-mono text-2xl font-bold tracking-tighter shadow-xl border border-white">
                          {plates[0].plate}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs py-2 border-b border-slate-50 items-center">
                        <span className="text-slate-400 font-medium uppercase tracking-wider">Detection Confidence</span>
                        <span className="text-emerald-600 font-black text-sm">{(plates[0].confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-xs py-2 border-b border-slate-50 items-center">
                        <span className="text-slate-400 font-medium uppercase tracking-wider">Timestamp</span>
                        <span className="font-bold text-slate-700">{new Date(plates[0].timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between text-xs py-2 border-b border-slate-50 items-center">
                        <span className="text-slate-400 font-medium uppercase tracking-wider">Event Direction</span>
                        <span className="font-bold text-slate-700 uppercase">Inbound / North</span>
                      </div>
                    </div>
                    
                    <div className="mt-auto bg-blue-50 border border-blue-100 p-3 rounded text-[11px] text-blue-700 font-medium leading-relaxed italic">
                      "Hệ thống tự động ghi lại biển số từ video CCTV. Các biển số được lưu trữ tạm thời trong phiên làm việc."
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-50 grayscale">
                    <Info size={40} className="text-slate-300" />
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">No events detected yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="space-y-4 pb-8">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-500" />
              Comprehensive Daily Log
            </h2>
            <ReportTable plates={plates} />
          </div>
        </div>
      </main>

      {/* Animations for new detections */}
      <AnimatePresence>
        {isProcessing && plates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 pointer-events-none"
          >
            <div className="bg-blue-600 text-white px-4 py-2 rounded shadow-lg flex items-center gap-3 border border-blue-400/30">
               <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
               <span className="text-xs uppercase font-bold tracking-widest text-white underline underline-offset-4">New Plate Detected: {plates[0].plate}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global CSS Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
        :root {
          --font-sans: 'Plus Jakarta Sans', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }
        body {
          font-family: var(--font-sans);
          letter-spacing: -0.015em;
        }
      `}} />
    </div>
  );
}

