import { useState, useEffect } from 'react';
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
  const [isTracking, setIsTracking] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

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
          const locationData = {
            lat: latitude,
            lng: longitude,
            timestamp: new Date().toISOString(),
          };

          try {
            // Update user's current location
            await updateDoc(userDocRef, {
              currentLocation: locationData,
              isOnline: true,
              lastSeen: new Date().toISOString()
            });

            // Log to location history
            await addDoc(collection(db, 'locations'), {
              userId: profile.uid,
              ...locationData,
              // Note: We use the manual timestamp to match security rules exactly
              timestamp: locationData.timestamp
            });
            setLocationError(null);
          } catch (error) {
            console.error("Location update failed", error);
          }
        },
        (error) => {
          setLocationError(error.message);
          setIsTracking(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => {
      unsubTasks();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [profile.uid, isTracking]);

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

      <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full">
        {/* Status Header */}
        <section className="mb-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${isTracking ? 'bg-blue-600 shadow-blue-100' : 'bg-slate-200 shadow-slate-100'}`}>
                <Navigation2 className={`text-white w-7 h-7 ${isTracking ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight tracking-tight">
                  {isTracking ? 'Đang trực tuyến' : 'Đã dừng trực'}
                </h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {isTracking ? 'Hệ thống đang ghi nhận vị trí' : 'Vui lòng bắt đầu để nhận việc'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setIsTracking(!isTracking)}
              className={`h-12 px-6 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${isTracking ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}
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
        <section className="space-y-10">
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <ClipboardList className="text-blue-600 w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Công việc của bạn</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian thực</span>
              </div>
            </div>

            <div className="space-y-5">
              {pendingTasks.length === 0 ? (
                <div className="bg-white rounded-[32px] p-16 text-center border-2 border-dashed border-slate-200 shadow-sm">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckSquare className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Hoàn tất mục tiêu!</h3>
                  <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">Bạn đã hoàn thành tất cả công việc được giao hôm nay.</p>
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
              <p className="text-sm font-bold">Bạn có việc ưu tiên cao cần xử lý!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmployeeTaskCard({ task, onUpdateStatus }: { task: Task, onUpdateStatus: (id: string, s: TaskStatus) => void | Promise<void>, key?: any }) {
  const isExpired = new Date(task.deadline) < new Date() && task.status !== TaskStatus.COMPLETED;
  
  return (
    <motion.div 
      layout
      className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/60 transition-all relative overflow-hidden group"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-4">
             <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
              task.priority === TaskPriority.HIGH ? 'bg-red-50 text-red-600 border border-red-100' : 
              task.priority === TaskPriority.MEDIUM ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-600 border border-green-100'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${task.priority === TaskPriority.HIGH ? 'bg-red-500' : task.priority === TaskPriority.MEDIUM ? 'bg-orange-500' : 'bg-green-500'}`} />
              {task.priority} Priority
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              task.status === TaskStatus.PENDING ? 'bg-slate-50 text-slate-500 border border-slate-100' : 
              task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              {task.status}
            </div>
          </div>
          <h4 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors uppercase decoration-blue-500/30 decoration-2 underline-offset-4">{task.title}</h4>
          <p className="text-sm font-medium text-slate-500 mt-3 leading-relaxed max-w-xl">{task.description}</p>
        </div>

        <div className="shrink-0">
          <div className={`w-28 h-28 rounded-3xl border-2 flex flex-col items-center justify-center transition-colors ${isExpired ? 'border-red-100 bg-red-50/50 text-red-600' : 'border-slate-50 text-slate-400 bg-slate-50 group-hover:bg-white group-hover:border-slate-100'}`}>
            <Clock className={`w-6 h-6 mb-2 ${isExpired ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest mb-0.5 opacity-60">Deadline</span>
            <span className="text-sm font-black tracking-tight">{format(new Date(task.deadline), 'dd/MM HH:mm')}</span>
          </div>
          {isExpired && (
            <div className="flex items-center justify-end gap-1.5 mt-2">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Overdue</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-50">
        {task.status === TaskStatus.PENDING && (
          <button 
            onClick={() => onUpdateStatus(task.id, TaskStatus.IN_PROGRESS)}
            className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group/btn"
          >
            Bắt đầu công việc
            <Navigation2 className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
        {task.status === TaskStatus.IN_PROGRESS && (
          <button 
            onClick={() => onUpdateStatus(task.id, TaskStatus.COMPLETED)}
            className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            Xác nhận hoàn tất
          </button>
        )}
        {task.status === TaskStatus.COMPLETED && (
          <div className="flex-1 h-14 bg-slate-50 text-slate-400 rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Đã lưu kết quả
          </div>
        )}
      </div>
    </motion.div>
  );
}
