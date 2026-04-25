import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { UserProfile, Task, TaskStatus, OperationType, TaskPriority } from '../types';
import Navbar from './Navbar';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Navigation2, CheckCircle2, Clock, AlertTriangle, MapPin, Bell, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeViewProps {
  profile: UserProfile;
}

export default function EmployeeView({ profile }: EmployeeViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTracking, setIsTracking] = useState(() => {
    const saved = localStorage.getItem('isTracking');
    return saved === null ? true : saved === 'true';
  });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastLoggedLocation, setLastLoggedLocation] = useState<{lat: number, lng: number, time: number} | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    // Attempt to request Wake Lock
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn("Wake Lock failed:", err);
        }
      }
    };

    if (isTracking) {
      requestWakeLock();
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [isTracking]);

  useEffect(() => {
    localStorage.setItem('isTracking', isTracking.toString());
  }, [isTracking]);

  useEffect(() => {
    // Listen for my tasks
    const qTasks = query(
      collection(db, 'tasks'), 
      where('assignedTo', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    // Tracking Logic
    let watchId: number;
    if (isTracking && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const userDocRef = doc(db, 'users', profile.uid);
          const now = Date.now();
          const locationData = {
            lat: latitude,
            lng: longitude,
            timestamp: new Date().toISOString(),
          };

          try {
            setSyncStatus('syncing');
            // Update user's current location (real-time for admin)
            await updateDoc(userDocRef, {
              currentLocation: locationData,
              isOnline: true,
              lastSeen: new Date().toISOString()
            });

            // Log to history ONLY IF:
            // 1. First time
            // 2. Moved significant distance (approx 10m)
            // 3. 5 minutes passed
            let shouldLog = false;
            if (!lastLoggedLocation) {
              shouldLog = true;
            } else {
              const timeDiff = now - lastLoggedLocation.time;
              const distDiff = Math.sqrt(
                Math.pow(latitude - lastLoggedLocation.lat, 2) + 
                Math.pow(longitude - lastLoggedLocation.lng, 2)
              );
              
              // Approx 0.0001 degrees is ~11 meters
              if (distDiff > 0.0001 || timeDiff > 5 * 60 * 1000) {
                shouldLog = true;
              }
            }

            if (shouldLog) {
              await addDoc(collection(db, 'locations'), {
                userId: profile.uid,
                ...locationData,
                timestamp: locationData.timestamp
              });
              setLastLoggedLocation({ lat: latitude, lng: longitude, time: now });
            }
            setLocationError(null);
            setSyncStatus('idle');
          } catch (error) {
            console.error("Location update failed", error);
            setSyncStatus('error');
          }
        },
        (error) => {
          setLocationError(error.message);
          // Don't auto-stop on minor errors
          if (error.code === 1) setIsTracking(false); 
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      unsubTasks();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [profile.uid, isTracking, lastLoggedLocation]);

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <Navbar profile={profile} />

      <main className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full">
        {/* Status Header */}
        <section className="mb-6 lg:mb-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl lg:rounded-[32px] p-4 lg:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 lg:gap-5 w-full sm:w-auto">
              <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 shrink-0 ${isTracking ? 'bg-blue-600 shadow-blue-100' : 'bg-slate-200 shadow-slate-100'}`}>
                <Navigation2 className={`text-white w-6 h-6 lg:w-7 lg:h-7 ${isTracking && syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base lg:text-lg font-black text-slate-900 leading-tight tracking-tight">
                  {isTracking ? 'Đang trực tuyến' : 'Đã dừng trực'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isTracking ? (syncStatus === 'syncing' ? 'bg-blue-500 animate-ping' : 'bg-green-500') : 'bg-slate-300'
                  }`} />
                  <p className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none truncate">
                    {isTracking 
                      ? (syncStatus === 'syncing' ? 'Đang cập nhật...' : `Lần cuối: ${lastLoggedLocation ? format(lastLoggedLocation.time, 'HH:mm:ss') : 'Vừa xong'}`) 
                      : 'Hệ thống ngoại tuyến'}
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsTracking(!isTracking)}
              className={`w-full sm:w-auto h-11 lg:h-12 px-6 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-black uppercase tracking-widest transition-all ${isTracking ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
            >
              {isTracking ? 'Nghỉ ngơi' : 'Bắt đầu trực'}
            </button>
          </motion.div>

          {locationError && (
            <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-100">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Lỗi định vị: {locationError}. Để hệ thống hoạt động, vui lòng bật GPS trong cài đặt trình duyệt.
            </div>
          )}
        </section>

        {/* Tasks Section */}
        <section className="space-y-6 lg:space-y-10">
          <div>
            <div className="flex items-center justify-between mb-4 lg:mb-6 px-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 lg:w-10 lg:h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <ClipboardList className="text-blue-600 w-5 h-5" />
                </div>
                <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Công việc</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-blue-600" />
                <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Realtime</span>
              </div>
            </div>

            <div className="space-y-4 lg:space-y-5">
              {pendingTasks.length === 0 ? (
                <div className="bg-white rounded-2xl lg:rounded-[32px] p-10 lg:p-16 text-center border-2 border-dashed border-slate-200 shadow-sm">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckSquare className="w-8 h-8 lg:w-10 lg:h-10 text-slate-200" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-black text-slate-800 tracking-tight">Hoàn tất!</h3>
                  <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2 text-sm">Bạn đã xong hết việc hôm nay.</p>
                </div>
              ) : (
                pendingTasks.map(task => (
                  <EmployeeTaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdateStatus={updateTaskStatus} 
                  />
                ))
              )}
            </div>
          </div>

          {completedTasks.length > 0 && (
            <div className="pt-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Lịch sử hoàn thành
              </h3>
              <div className="space-y-4 opacity-50 hover:opacity-100 transition-opacity duration-500">
                {completedTasks.map(task => (
                  <EmployeeTaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdateStatus={updateTaskStatus} 
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Floating Reminder Info if any urgent task */}
      <AnimatePresence>
        {pendingTasks.some(t => t.priority === TaskPriority.HIGH) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white p-5 rounded-[24px] shadow-2xl shadow-slate-900/40 flex items-center gap-4 border border-slate-800"
          >
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-0.5">Khẩn cấp</p>
              <p className="text-sm font-bold">Cần xử lý việc ưu tiên cao!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmployeeTaskCard({ task, onUpdateStatus }: { task: Task, onUpdateStatus: (id: string, s: TaskStatus) => void | Promise<void> }) {
  const isExpired = new Date(task.deadline) < new Date() && task.status !== TaskStatus.COMPLETED;
  
  return (
    <motion.div 
      layout
      className="bg-white rounded-2xl lg:rounded-[32px] p-5 lg:p-8 border border-slate-100 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:shadow-slate-200/50 transition-all relative overflow-hidden group"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
               <div className={`px-2.5 py-1 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                task.priority === TaskPriority.HIGH ? 'bg-red-50 text-red-600 border border-red-100' : 
                task.priority === TaskPriority.MEDIUM ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-600 border border-green-100'
              }`}>
                <div className={`w-1.2 h-1.2 lg:w-1.5 lg:h-1.5 rounded-full ${task.priority === TaskPriority.HIGH ? 'bg-red-500' : task.priority === TaskPriority.MEDIUM ? 'bg-orange-500' : 'bg-green-500'}`} />
                {task.priority}
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-widest ${
                task.status === TaskStatus.PENDING ? 'bg-slate-50 text-slate-500 border border-slate-100' : 
                task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                {task.status}
              </div>
            </div>
            <h4 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors uppercase">{task.title}</h4>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-50 pt-3 sm:pt-0">
            <div className={`flex flex-col items-center sm:items-end ${isExpired ? 'text-red-600' : 'text-slate-400'}`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${isExpired ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Deadline</span>
              </div>
              <span className="text-sm font-black tracking-tight">{format(new Date(task.deadline), 'dd/MM HH:mm')}</span>
            </div>
            {isExpired && (
              <div className="flex items-center gap-1.5 bg-red-100 text-red-600 px-2 py-0.5 rounded-md mt-1">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">Trễ hạn</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-sm font-medium text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100/50">
          {task.description}
        </div>

        <div className="flex items-center gap-3 pt-2">
          {task.status === TaskStatus.PENDING && (
            <button 
              onClick={() => onUpdateStatus(task.id, TaskStatus.IN_PROGRESS)}
              className="flex-1 h-12 lg:h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl lg:rounded-[20px] font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group/btn"
            >
              Bắt đầu ngay
              <Navigation2 className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          {task.status === TaskStatus.IN_PROGRESS && (
            <button 
              onClick={() => onUpdateStatus(task.id, TaskStatus.COMPLETED)}
              className="flex-1 h-12 lg:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl lg:rounded-[20px] font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5" />
              Hoàn thành
            </button>
          )}
          {task.status === TaskStatus.COMPLETED && (
            <div className="flex-1 h-12 lg:h-14 bg-slate-100 text-slate-400 rounded-xl lg:rounded-[20px] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
               Xong kết quả
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
