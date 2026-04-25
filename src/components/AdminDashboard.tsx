import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, addDoc, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, logout } from '../lib/firebase';
import { UserProfile, UserRole, Task, TaskStatus, TaskPriority, LocationHistory, OperationType } from '../types';
import Navbar from './Navbar';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Map as MapIcon, Users, ClipboardList, Plus, Search, Calendar, Clock, Navigation, AlertCircle, LayoutDashboard, Bell, FileText, Settings, User as UserIcon, History as HistoryIcon, ChevronRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';

// Fix for Leaflet default icon issues in React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface AdminDashboardProps {
  profile: UserProfile;
}

export default function AdminDashboard({ profile }: AdminDashboardProps) {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'staff' | 'tasks' | 'history'>('map');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string>('');
  const [historyData, setHistoryData] = useState<LocationHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    // Listen for all employees
    const qStaff = query(collection(db, 'users'), where('role', '==', UserRole.EMPLOYEE));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    // Listen for tasks
    const qTasks = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    return () => {
      unsubStaff();
      unsubTasks();
    };
  }, []);

  const fetchHistory = async (userId: string) => {
    setIsLoadingHistory(true);
    setHistoryEmployeeId(userId);
    try {
      const q = query(
        collection(db, 'locations'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LocationHistory));
      setHistoryData(data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'locations');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTask = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      assignedTo: formData.get('assignedTo') as string,
      priority: formData.get('priority') as TaskPriority,
      status: TaskStatus.PENDING,
      deadline: formData.get('deadline') as string,
      createdAt: new Date().toISOString(),
      createdBy: profile.uid,
    };

    try {
      await addDoc(collection(db, 'tasks'), newTask);
      setIsTaskModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar - Design: Professional Polish */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-[10px] font-black">SEO</span>
            TrackMaster
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          <SidebarLink 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
          />
          <SidebarLink 
            active={activeTab === 'staff'} 
            onClick={() => setActiveTab('staff')} 
            icon={<Users className="w-5 h-5" />} 
            label="Nhân viên" 
          />
          <SidebarLink 
            active={activeTab === 'tasks'} 
            onClick={() => setActiveTab('tasks')} 
            icon={<ClipboardList className="w-5 h-5" />} 
            label="Công việc" 
          />
          <SidebarLink 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<HistoryIcon className="w-5 h-5" />} 
            label="Lịch sử đường đi" 
          />
          <SidebarLink 
            active={false} 
            onClick={() => {}} 
            icon={<Bell className="w-5 h-5" />} 
            label="Nhắc nhở" 
          />
          <SidebarLink 
            active={false} 
            onClick={() => {}} 
            icon={<FileText className="w-5 h-5" />} 
            label="Báo cáo" 
          />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-xl">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-slate-700" />
            ) : (
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{profile.displayName}</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Administrator</p>
            </div>
            <button 
              onClick={() => logout()}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0 z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {activeTab === 'map' && 'Thời gian thực (TP. HCM)'}
            {activeTab === 'staff' && 'Quản lý Đội ngũ'}
            {activeTab === 'tasks' && 'Tiến độ Công việc'}
            {activeTab === 'history' && 'Lịch sử di chuyển'}
          </h2>
          <div className="flex gap-3">
             {activeTab === 'tasks' && (
              <button 
                onClick={() => setIsTaskModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Giao việc mới
              </button>
             )}
             <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold border border-blue-100 hover:bg-blue-100 transition-colors">
               Gửi thông báo
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 bg-slate-50 overflow-hidden">
          {activeTab === 'map' && (
            <div className="h-full flex flex-col p-6 gap-6">
              {/* Top Stats */}
              <div className="grid grid-cols-3 gap-6 shrink-0">
                <StatCard label="Tổng nhân viên" value={employees.length} />
                <StatCard label="Đang hoạt động" value={employees.filter(e => e.isOnline).length} status="online" />
                <StatCard label="Ngoại tuyến" value={employees.filter(e => !e.isOnline).length} />
              </div>

              {/* Map Layout */}
              <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden min-h-0">
                <div className="col-span-12 lg:col-span-8 relative rounded-3xl border-4 border-white shadow-xl shadow-slate-200 overflow-hidden bg-slate-200">
                  <StaffMap employees={employees} />
                  
                  {/* Map HUD */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-slate-100 text-xs z-[1000]">
                    <p className="font-bold text-slate-900 mb-1">Khu vực: TP. Hồ Chí Minh</p>
                    <p className="text-slate-500 font-medium">Cập nhật: Mới nhất</p>
                  </div>
                </div>

                <div className="hidden lg:col-span-4 lg:flex flex-col gap-6 overflow-hidden">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-600" />
                        Nhắc nhở công việc
                      </h3>
                      <span className="text-[10px] bg-red-100 text-red-600 font-black px-2 py-1 rounded-lg">CẦN XỬ LÝ</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {tasks.filter(t => t.status !== TaskStatus.COMPLETED).slice(0, 5).map(task => (
                        <div key={task.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 hover:border-blue-200 transition-colors">
                          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${task.priority === TaskPriority.HIGH ? 'bg-red-500' : 'bg-blue-500'}`} />
                          <div>
                            <p className="text-xs font-bold text-slate-900 line-clamp-1">{task.title}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {employees.find(e => e.uid === task.assignedTo)?.displayName || 'Unknown'} 
                              • {format(new Date(task.deadline), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="p-8 overflow-y-auto">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nhân viên SEO</h1>
                  <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                    Tổng số: {employees.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {employees.map(emp => (
                    <StaffCard key={emp.uid} employee={emp} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="p-8 overflow-y-auto flex-1">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý công việc</h1>
                  <button 
                    onClick={() => setIsTaskModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-100"
                  >
                    <Plus className="w-5 h-5" />
                    Giao việc mới
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {tasks.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="text-slate-300 w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Chưa có công việc nào</h3>
                      <p className="text-slate-500 max-w-xs mx-auto mt-2">Bắt đầu giao việc cho nhân viên của bạn bằng nút phía trên.</p>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <TaskRow key={task.id} task={task} employees={employees} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="h-full flex overflow-hidden">
              {/* Employee Selection Sidebar */}
              <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Xem lịch sử</h3>
                  <p className="text-xs text-slate-500 font-medium">Chọn nhân viên để xem lại hành trình (100 điểm gần nhất)</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {employees.map(emp => (
                    <button
                      key={emp.uid}
                      onClick={() => fetchHistory(emp.uid)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                        historyEmployeeId === emp.uid 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'bg-white border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="relative">
                        {emp.photoURL ? (
                          <img src={emp.photoURL} alt={emp.displayName} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold">
                            {emp.displayName.charAt(0)}
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${emp.isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{emp.displayName}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">
                          {emp.isOnline ? 'Đang trực' : 'Offline'}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${historyEmployeeId === emp.uid ? 'text-blue-500' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* History Map Content */}
              <div className="flex-1 flex flex-col bg-slate-100 p-6 overflow-hidden">
                <div className="bg-white flex-1 rounded-[32px] border-4 border-white shadow-2xl relative overflow-hidden">
                  {historyEmployeeId ? (
                    isLoadingHistory ? (
                      <div className="absolute inset-0 z-[2000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                        <p className="text-sm font-bold text-slate-600">Đang tải dữ liệu đường đi...</p>
                      </div>
                    ) : historyData.length > 0 ? (
                      <HistoryMap historyData={historyData} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                          <Navigation className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Không có dữ liệu</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-2">Nhân viên này hiện chưa có lịch sử vị trí được ghi lại trong hệ thống.</p>
                      </div>
                    )
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
                        <HistoryIcon className="w-10 h-10 text-blue-200" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 underline decoration-blue-500 decoration-2 underline-offset-4">Bản đồ hành trình</h3>
                      <p className="text-slate-500 max-w-xs mx-auto mt-2">Vui lòng chọn một nhân viên từ danh sách bên trái để bắt đầu theo dõi lịch sử di chuyển.</p>
                    </div>
                  )}

                  {/* HUD Info for history */}
                  {historyData.length > 0 && !isLoadingHistory && (
                    <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-white p-4 max-w-xs">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                          <Navigation className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase">Hành trình</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {employees.find(e => e.uid === historyEmployeeId)?.displayName}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">Điểm đầu:</span>
                          <span className="text-slate-600">{format(new Date(historyData[0].timestamp), 'HH:mm dd/MM')}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">Điểm cuối:</span>
                          <span className="text-slate-600">{format(new Date(historyData[historyData.length - 1].timestamp), 'HH:mm dd/MM')}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">Số điểm:</span>
                          <span className="text-blue-600">{historyData.length} tọa độ</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Task Modal */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleCreateTask} className="p-8">
                <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Giao việc cho nhân viên</h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Tiêu đề</label>
                    <input name="title" required className="w-full h-12 bg-slate-50 border-0 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500" placeholder="VD: Kiểm tra backlink vệ tinh..." />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Giao cho</label>
                    <select name="assignedTo" required className="w-full h-12 bg-slate-50 border-0 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 capitalize">
                      <option value="">Chọn nhân viên</option>
                      {employees.map(emp => (
                        <option key={emp.uid} value={emp.uid}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Độ ưu tiên</label>
                      <select name="priority" required className="w-full h-12 bg-slate-50 border-0 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500">
                        <option value={TaskPriority.LOW}>Thấp</option>
                        <option value={TaskPriority.MEDIUM}>Trung bình</option>
                        <option value={TaskPriority.HIGH}>Cao</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Hạn chót</label>
                      <input name="deadline" type="datetime-local" required className="w-full h-12 bg-slate-50 border-0 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Mô tả công việc</label>
                    <textarea name="description" rows={3} className="w-full bg-slate-50 border-0 rounded-xl p-4 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Chi tiết yêu cầu..." />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all">Hủy</button>
                  <button type="submit" className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-100">Giao việc</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryMap({ historyData }: { historyData: LocationHistory[] }) {
  const positions = historyData.map(d => [d.lat, d.lng] as [number, number]);
  const startPoint = positions[0];
  const endPoint = positions[positions.length - 1];

  function FitBounds() {
    const map = useMap();
    useEffect(() => {
      if (positions.length > 0) {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [positions, map]);
    return null;
  }

  return (
    <MapContainer 
      center={endPoint} 
      zoom={15} 
      className="h-full w-full z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FitBounds />
      <Polyline 
        pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.6, dashArray: '10, 10' }} 
        positions={positions} 
      />
      
      {/* Start Point */}
      <Marker position={startPoint}>
        <Popup>
          <div className="p-1">
            <p className="font-bold text-blue-600">Điểm bắt đầu</p>
            <p className="text-xs">{format(new Date(historyData[0].timestamp), 'HH:mm:ss dd/MM')}</p>
          </div>
        </Popup>
      </Marker>

      {/* End Point */}
      <Marker position={endPoint}>
        <Popup>
          <div className="p-1">
            <p className="font-bold text-emerald-600">Vị trí cuối cùng</p>
            <p className="text-xs">{format(new Date(historyData[historyData.length - 1].timestamp), 'HH:mm:ss dd/MM')}</p>
          </div>
        </Popup>
      </Marker>

      {/* Intermediate points as small circles or markers if few enough */}
      {historyData.length < 50 && historyData.slice(1, -1).map((point, idx) => (
        <Marker 
          key={point.id} 
          position={[point.lat, point.lng]}
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #2563eb; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.2);"></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4]
          })}
        >
          <Popup>
            <p className="text-xs font-bold">{format(new Date(point.timestamp), 'HH:mm:ss dd/MM')}</p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function SidebarLink({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, status }: { label: string, value: number, status?: 'online' }) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {status === 'online' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function StaffMap({ employees }: { employees: UserProfile[] }) {
  const onlineEmployees = employees.filter(e => e.currentLocation);
  
  return (
    <MapContainer 
      center={[10.762622, 106.660172]} // Default center Ho Chi Minh City
      zoom={13} 
      className="h-full w-full z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {onlineEmployees.map(emp => (
        <Marker 
          key={emp.uid} 
          position={[emp.currentLocation!.lat, emp.currentLocation!.lng]}
        >
          <Popup>
            <div className="p-1">
              <p className="font-bold text-slate-900">{emp.displayName}</p>
              <p className="text-xs text-slate-500">
                {emp.isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 italic">
                Cập nhật lúc: {format(new Date(emp.currentLocation!.timestamp), 'HH:mm:ss dd/MM')}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function StaffCard({ employee }: { employee: UserProfile, key?: any }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden relative">
      <div className="flex items-start gap-4">
        <div className="relative">
          {employee.photoURL ? (
            <img src={employee.photoURL} alt={employee.displayName} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-50" />
          ) : (
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-xl font-bold">
              {employee.displayName.charAt(0)}
            </div>
          )}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${employee.isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-slate-900 truncate tracking-tight">{employee.displayName}</h3>
          <p className="text-sm text-slate-500 font-medium truncate mb-2">{employee.email}</p>
          
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${employee.isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {employee.isOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest">
        <span>Vị trí cuối</span>
        <span className="text-slate-600">
          {employee.currentLocation ? format(new Date(employee.currentLocation.timestamp), 'HH:mm dd/MM') : 'N/A'}
        </span>
      </div>
    </div>
  );
}

function TaskRow({ task, employees }: { task: Task, employees: UserProfile[], key?: any }) {
  const employee = employees.find(e => e.uid === task.assignedTo);
  const priorityColor = {
    [TaskPriority.LOW]: 'bg-green-100 text-green-700',
    [TaskPriority.MEDIUM]: 'bg-orange-100 text-orange-700',
    [TaskPriority.HIGH]: 'bg-red-100 text-red-700',
  };

  const statusColor = {
    [TaskStatus.PENDING]: 'bg-slate-100 text-slate-600',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
    [TaskStatus.COMPLETED]: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4 hover:border-slate-300 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${priorityColor[task.priority]}`}>
            {task.priority}
          </span>
          <h4 className="font-bold text-slate-900 truncate tracking-tight">{task.title}</h4>
        </div>
        <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
            {employee?.photoURL ? (
              <img src={employee.photoURL} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800 leading-none">{employee?.displayName || 'Unknown'}</p>
            <p className="text-[10px] text-slate-400 font-medium">Assigned to</p>
          </div>
        </div>

        <div className="flex flex-col items-end min-w-[100px]">
          <div className="flex items-center gap-1.5 text-slate-700 mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-bold">{format(new Date(task.deadline), 'dd/MM HH:mm')}</span>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusColor[task.status]}`}>
            {task.status}
          </span>
        </div>
      </div>
    </div>
  );
}
