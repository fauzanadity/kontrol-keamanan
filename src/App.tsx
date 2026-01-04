import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, LogOut, MessageSquare, Edit2, MapPin, User,
  Calendar, Home, History, UserPlus, ShieldPlus, Upload,
  FileSpreadsheet, Printer, Trash2, Eye, EyeOff, Key, Lock, CheckCircle, KeyRound
} from 'lucide-react';
import { supabase } from './supabaseClient'; 

// -------------------- Types --------------------
interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  time: string;
  position: string;
  photo: string;
  description: string;
  location: { lat: number; lng: number };
  comments: Comment[];
  editHistory: EditHistory[];
}
interface Comment {
  id: string;
  adminId: string;
  adminName: string;
  text: string;
  timestamp: string;
}
interface EditHistory {
  id: string;
  editorId: string;
  editorName: string;
  action: string;
  timestamp: string;
}
interface UserT {
  nip: string;
  name: string;
  password: string;
  role: 'member' | 'admin';
}

// -------------------- Helpers --------------------

const generatePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 6; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  return password;
};

// -------------------- Database Helper (SUPABASE VERSION) --------------------
const DatabaseHelper = {
  getUsers: async (): Promise<UserT[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error("Error User:", error);
    return (data as UserT[]) || [];
  },

  addUser: async (user: UserT) => {
    const { error } = await supabase.from('users').insert([user]);
    if (error) throw new Error(error.message);
  },

  deleteUser: async (nip: string) => {
    const { error } = await supabase.from('users').delete().eq('nip', nip);
    if (error) throw new Error(error.message);
  },

  // Update Password
  updateUserPassword: async (nip: string, newPass: string) => {
    const { error } = await supabase
      .from('users')
      .update({ password: newPass })
      .eq('nip', nip);
    if (error) throw new Error(error.message);
  },

  getAttendances: async (): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error Absen:", error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      userName: item.user_name,
      date: item.date,
      time: item.time,
      position: item.position,
      photo: item.photo_url || item.photo, 
      description: item.description,
      location: { lat: item.location_lat, lng: item.location_lng },
      comments: item.comments || [],
      editHistory: [] 
    }));
  },

  addAttendance: async (record: AttendanceRecord) => {
    const { error } = await supabase.from('attendances').insert([{
      user_id: record.userId,
      user_name: record.userName,
      date: record.date,
      time: record.time,
      position: record.position,
      photo: record.photo,
      description: record.description,
      location_lat: record.location.lat,
      location_lng: record.location.lng,
      comments: record.comments
    }]);
    if (error) throw new Error(error.message);
  },

  addComment: async (recordId: string, comments: Comment[]) => {
    const { error } = await supabase
      .from('attendances')
      .update({ comments: comments })
      .eq('id', recordId);
    if (error) throw new Error(error.message);
  },

  getDailyToken: async (): Promise<string> => {
    const today = new Date().toLocaleDateString('id-ID');
    const { data } = await supabase
      .from('daily_token')
      .select('code')
      .eq('date', today)
      .single();

    if (data) {
      return data.code;
    } else {
      const newCode = Math.floor(1000 + Math.random() * 9000).toString();
      await supabase.from('daily_token').insert([{ date: today, code: newCode }]);
      return newCode;
    }
  }
};

// -------------------- Main App Component --------------------
const AttendanceSystem: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'landing' | 'member' | 'admin'>('landing');
  const [currentUser, setCurrentUser] = useState<UserT | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<UserT[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersData = await DatabaseHelper.getUsers();
      const absenData = await DatabaseHelper.getAttendances();
      setUsers(usersData);
      setAttendances(absenData);
    } catch (e) {
      console.error(e);
      alert('Gagal mengambil data dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token_ok');
    setCurrentUser(null);
    setCurrentPage('landing');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {loading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
           <div className="bg-white p-4 rounded-xl flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="font-semibold">Menghubungkan ke Server...</span>
           </div>
        </div>
      )}

      {currentPage === 'landing' && <LandingPage onSelectRole={(role) => setCurrentPage(role)} />}

      {currentPage === 'member' && !currentUser && (
        <LoginPage 
           role="member" 
           users={users} 
           onLogin={(user) => setCurrentUser(user)} 
           onBack={() => setCurrentPage('landing')} 
        />
      )}

      {currentPage === 'member' && currentUser && (
        <MemberDashboard
          user={currentUser}
          attendances={attendances}
          onLogout={handleLogout}
          onRefresh={fetchData}
          onUpdateCurrentUser={(updatedUser) => setCurrentUser(updatedUser)}
        />
      )}

      {currentPage === 'admin' && !currentUser && (
        <LoginPage 
           role="admin" 
           users={users} 
           onLogin={(user) => setCurrentUser(user)} 
           onBack={() => setCurrentPage('landing')} 
        />
      )}

      {currentPage === 'admin' && currentUser && (
        <AdminDashboard
          user={currentUser}
          attendances={attendances}
          users={users}
          onLogout={handleLogout}
          onRefresh={fetchData}
          // FITUR BARU: Pass fungsi update user ke admin dashboard juga
          onUpdateCurrentUser={(updatedUser) => setCurrentUser(updatedUser)}
        />
      )}
    </div>
  );
};

// -------------------- Sub-Components --------------------

const LandingPage: React.FC<{ onSelectRole: (role: 'member' | 'admin') => void }> = ({ onSelectRole }) => {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-blue-600 to-indigo-800">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Kontrol Pengamanan</h1>
          <p className="text-gray-500">Silakan pilih akses masuk Anda</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <button onClick={() => onSelectRole('member')} className="group p-6 border-2 border-gray-100 hover:border-blue-500 rounded-2xl hover:bg-blue-50 transition-all text-left">
             <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors"><User className="w-6 h-6 text-blue-600 group-hover:text-white" /></div>
             <h3 className="text-xl font-bold text-gray-800">Anggota</h3>
             <p className="text-sm text-gray-500 mt-1">Absen harian & cek riwayat</p>
          </button>
          <button onClick={() => onSelectRole('admin')} className="group p-6 border-2 border-gray-100 hover:border-gray-800 rounded-2xl hover:bg-gray-50 transition-all text-left">
             <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-800 transition-colors"><ShieldPlus className="w-6 h-6 text-gray-600 group-hover:text-white" /></div>
             <h3 className="text-xl font-bold text-gray-800">Admin</h3>
             <p className="text-sm text-gray-500 mt-1">Manajemen user & laporan</p>
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginPage: React.FC<{ role: 'member' | 'admin'; users: UserT[]; onLogin: (user: UserT) => void; onBack: () => void; }> = ({ role, users, onLogin, onBack }) => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find((u) => u.nip === nip && u.password === password && u.role === role);
    if (user) {
      if (role === 'member') sessionStorage.removeItem('token_ok');
      onLogin(user);
    } else {
      setError('NIP atau Password salah (atau data belum termuat).');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md animate-fade-in">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 flex items-center mb-6"><Home className="w-4 h-4 mr-1"/> Kembali</button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Login {role === 'admin' ? 'Admin' : 'Anggota'}</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIP / Username</label>
            <input type="text" value={nip} onChange={e=>setNip(e.target.value)} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan NIP" />
          </div>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan Password" />
            <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPass ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold">Masuk</button>
        </form>
      </div>
    </div>
  );
};

const MemberDashboard: React.FC<{
  user: UserT;
  attendances: AttendanceRecord[];
  onLogout: () => void;
  onRefresh: () => void;
  onUpdateCurrentUser: (user: UserT) => void;
}> = ({ user, attendances, onLogout, onRefresh, onUpdateCurrentUser }) => {
  const [view, setView] = useState<'menu' | 'input_token' | 'attend' | 'history' | 'change_password'>('menu');

  const handleTokenSuccess = () => {
    sessionStorage.setItem('token_ok', '1');
    setView('attend');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden sm:rounded-xl sm:my-8 sm:min-h-[80vh]">
      <div className="bg-blue-600 p-6 text-white flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div><h2 className="text-xl font-bold">Halo, {user.name}</h2><p className="text-blue-100 text-sm">NIP: {user.nip}</p></div>
            <button onClick={onLogout} className="bg-white/20 p-2 rounded-lg hover:bg-white/30"><LogOut size={20}/></button>
        </div>
        <button 
            onClick={() => setView('change_password')} 
            className="flex items-center gap-2 text-xs bg-blue-700/50 hover:bg-blue-700 px-3 py-2 rounded-lg w-fit transition-colors"
        >
            <KeyRound size={14} /> Ganti Password
        </button>
      </div>

      <div className="p-6">
        {view === 'menu' && (
          <div className="grid grid-cols-1 gap-4 animate-fade-in">
            <button onClick={() => setView('input_token')} className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-center gap-4 hover:bg-blue-100 transition-colors">
              <div className="bg-blue-600 p-3 rounded-full text-white"><Key size={24}/></div>
              <div className="text-left"><h3 className="font-bold text-gray-800 text-lg">Absen Masuk</h3><p className="text-gray-500 text-sm">Masukkan Token Harian</p></div>
            </button>
            <button onClick={() => setView('history')} className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex items-center gap-4 hover:bg-gray-100 transition-colors">
              <div className="bg-gray-800 p-3 rounded-full text-white"><History size={24}/></div>
              <div className="text-left"><h3 className="font-bold text-gray-800 text-lg">Riwayat</h3><p className="text-gray-500 text-sm">Lihat catatan kehadiran</p></div>
            </button>
          </div>
        )}

        {view === 'input_token' && <TokenEntryPage onBack={() => setView('menu')} onSuccess={handleTokenSuccess} />}
        
        {view === 'attend' && (
          <AttendanceForm 
            user={user} 
            onBack={() => setView('menu')} 
            onSuccess={() => {
              onRefresh();
              sessionStorage.removeItem('token_ok');
              setView('menu');
            }} 
          />
        )}

        {view === 'history' && <AttendanceHistory userId={user.nip} attendances={attendances} onBack={() => setView('menu')} />}

        {view === 'change_password' && (
            <ChangePasswordPage 
                user={user} 
                onBack={() => setView('menu')} 
                onSuccess={(newPass) => {
                    onUpdateCurrentUser({ ...user, password: newPass });
                    onRefresh();
                    setView('menu');
                }} 
            />
        )}
      </div>
    </div>
  );
};

// -------------------- Change Password Page (Generic for Member & Admin) --------------------
const ChangePasswordPage: React.FC<{ 
    user: UserT; 
    onBack: () => void; 
    onSuccess: (newPass: string) => void; 
}> = ({ user, onBack, onSuccess }) => {
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    
    // State untuk toggle mata masing-masing input
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!oldPass || !newPass || !confirmPass) {
            return setError('Semua field harus diisi.');
        }
        if (oldPass !== user.password) {
            return setError('Password lama salah.');
        }
        if (newPass !== confirmPass) {
            return setError('Konfirmasi password baru tidak cocok.');
        }
        if (newPass.length < 4) {
            return setError('Password minimal 4 karakter.');
        }

        setLoading(true);
        try {
            await DatabaseHelper.updateUserPassword(user.nip, newPass);
            alert('Password berhasil diubah!');
            onSuccess(newPass);
        } catch (err: any) {
            setError('Gagal mengubah password: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <button onClick={onBack} className="flex items-center text-gray-600 mb-6 font-semibold"><Home size={18} className="mr-2"/> Kembali</button>
            
            <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Ganti Password</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input Password Lama */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
                    <div className="relative">
                        <input 
                            type={showOld ? 'text' : 'password'} 
                            value={oldPass} 
                            onChange={e=>setOldPass(e.target.value)} 
                            className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none pr-12" 
                        />
                        <button type="button" onClick={()=>setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showOld ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                    </div>
                </div>

                {/* Input Password Baru */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                    <div className="relative">
                        <input 
                            type={showNew ? 'text' : 'password'} 
                            value={newPass} 
                            onChange={e=>setNewPass(e.target.value)} 
                            className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none pr-12" 
                        />
                        <button type="button" onClick={()=>setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showNew ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                    </div>
                </div>

                {/* Input Konfirmasi Password */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                    <div className="relative">
                        <input 
                            type={showConfirm ? 'text' : 'password'} 
                            value={confirmPass} 
                            onChange={e=>setConfirmPass(e.target.value)} 
                            className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none pr-12" 
                        />
                        <button type="button" onClick={()=>setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showConfirm ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                    </div>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400">
                    {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
            </form>
        </div>
    );
};

const TokenEntryPage: React.FC<{ onBack: () => void; onSuccess: () => void; }> = ({ onBack, onSuccess }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const validToken = await DatabaseHelper.getDailyToken();
      if (input === validToken) {
         onSuccess();
      } else {
         setError('Token salah! Minta token hari ini ke Admin.');
         setInput('');
      }
    } catch (err) {
      setError('Gagal validasi token. Cek koneksi internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="flex items-center text-gray-600 mb-6 font-semibold"><Home size={18} className="mr-2"/> Kembali</button>
      <div className="text-center mb-8">
         <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={40} className="text-blue-600"/></div>
         <h2 className="text-2xl font-bold text-gray-800">Verifikasi Token</h2>
         <p className="text-gray-500 mt-2">Masukkan 4 digit angka token hari ini.</p>
      </div>

      <form onSubmit={handleSubmit}>
         <input 
            type="number" value={input}
            onChange={(e) => { if(e.target.value.length <= 4) setInput(e.target.value); setError(''); }}
            className="w-full text-center text-4xl tracking-[1rem] font-bold p-4 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none mb-6"
            placeholder="0000" autoFocus
         />
         {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-center mb-4 font-medium animate-pulse">{error}</div>}
         <button type="submit" disabled={input.length !== 4 || loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 transition-all shadow-lg">
            {loading ? 'Memeriksa...' : 'Validasi Token'}
         </button>
      </form>
    </div>
  );
};

const AttendanceForm: React.FC<{ user: UserT; onBack: () => void; onSuccess: () => void }> = ({ user, onBack, onSuccess }) => {
  const [position, setPosition] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState('');
  const [showCam, setShowCam] = useState(false);
  const [loading, setLoading] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if(sessionStorage.getItem('token_ok') !== '1') { onBack(); }
  }, []);

  const startCam = async () => {
    setShowCam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setTimeout(() => { if (vidRef.current) vidRef.current.srcObject = stream; }, 100);
    } catch { alert('Gagal akses kamera'); setShowCam(false); }
  };

  const takePic = () => {
    if(!vidRef.current) return;
    const cvs = document.createElement('canvas');
    cvs.width = vidRef.current.videoWidth;
    cvs.height = vidRef.current.videoHeight;
    const ctx = cvs.getContext('2d');
    
    if(ctx) {
        ctx.drawImage(vidRef.current, 0, 0);
        // KOMPRESI 50%
        setPhoto(cvs.toDataURL('image/jpeg', 0.5)); 
    }

    const stream = vidRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t=>t.stop());
    setShowCam(false);
  };

  const submit = async () => {
    if(!position || !desc || !photo) return alert('Mohon lengkapi data!');
    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await DatabaseHelper.addAttendance({
            id: '',
            userId: user.nip,
            userName: user.name,
            date: new Date().toLocaleDateString('id-ID'),
            time: new Date().toLocaleTimeString('id-ID'),
            position, photo, description: desc,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            comments: [], editHistory: []
          });
          alert('Absensi Berhasil Terkirim!');
          onSuccess();
        } catch (e) {
          alert('Gagal mengirim absensi. Cek koneksi.');
        } finally {
          setLoading(false);
        }
      }, 
      () => {
          alert('Gagal mendapatkan lokasi GPS.');
          setLoading(false);
      }
    );
  };

  return (
    <div className="animate-fade-in">
       <button onClick={onBack} className="text-gray-500 mb-4 flex items-center hover:text-red-600"><LogOut size={16} className="mr-2 rotate-180"/> Batal Absen</button>
       <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Form Kehadiran</h3>
       <div className="space-y-4">
          <div><label className="text-xs font-bold text-gray-500 uppercase">Waktu</label><input value={new Date().toLocaleString('id-ID')} disabled className="w-full p-3 bg-gray-100 rounded-xl border border-gray-200 text-gray-600 font-mono text-sm" /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Jabatan</label><input value={position} onChange={e=>setPosition(e.target.value)} placeholder="Contoh: Staff IT" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Keterangan</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Kegiatan hari ini..." className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" rows={3}/></div>
          
          <div className="border-2 border-dashed border-gray-300 p-2 rounded-xl text-center min-h-[250px] flex flex-col justify-center items-center bg-gray-50 relative overflow-hidden">
             {!photo && !showCam && (
                 <button onClick={startCam} className="text-blue-600 flex flex-col items-center hover:scale-105 transition-transform">
                     <div className="bg-blue-100 p-4 rounded-full mb-2"><Camera size={32}/></div><span className="font-bold">Buka Kamera Selfie</span>
                 </button>
             )}
             {showCam && (
               <div className="absolute inset-0 bg-black flex flex-col">
                 <video ref={vidRef} autoPlay playsInline className="w-full h-full object-cover"/>
                 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button onClick={takePic} className="bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg">Jepret</button>
                    <button onClick={()=>{setShowCam(false); if(vidRef.current) (vidRef.current.srcObject as MediaStream)?.getTracks().forEach(t=>t.stop());}} className="bg-red-600 text-white px-6 py-2 rounded-full font-bold shadow-lg">Batal</button>
                 </div>
               </div>
             )}
             {photo && (
               <div className="relative w-full h-full">
                 <img src={photo} className="w-full h-full object-contain rounded-lg"/>
                 <button onClick={()=>setPhoto('')} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors"><Trash2 size={18}/></button>
               </div>
             )}
          </div>
          
          <button onClick={submit} disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 shadow-lg transition-all transform active:scale-95 disabled:bg-gray-400">
             {loading ? 'Mengirim Data...' : 'Kirim Absen'}
          </button>
       </div>
    </div>
  );
};

const AttendanceHistory: React.FC<{ userId: string; attendances: AttendanceRecord[]; onBack: () => void }> = ({ userId, attendances, onBack }) => {
  const myData = attendances.filter(a => a.userId === userId);
  
  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="mb-4 text-gray-500 flex items-center hover:text-blue-600 font-medium"><Home size={16} className="mr-2"/> Kembali</button>
      <h3 className="font-bold text-xl mb-6 text-gray-800">Riwayat Saya</h3>
      <div className="space-y-4">
        {myData.length === 0 && <p className="text-center text-gray-400 py-10">Belum ada riwayat.</p>}
        {myData.map(d => (
          <div key={d.id} className="border border-gray-100 p-4 rounded-2xl shadow-sm bg-white flex flex-col gap-3 animate-fade-in">
             <div className="flex gap-4">
                 <img src={d.photo} className="w-16 h-16 object-cover rounded-xl bg-gray-200 border border-gray-100"/>
                 <div className="flex-1">
                   <div className="flex justify-between items-start">
                      <div><p className="font-bold text-gray-800">{d.date}</p><p className="text-xs text-blue-600 font-bold">{d.time}</p></div>
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase flex items-center"><CheckCircle size={10} className="mr-1"/> Hadir</span>
                   </div>
                   <p className="text-sm text-gray-600 mt-1">{d.position}</p>
                   <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">"{d.description}"</p>
                 </div>
             </div>
             {d.comments.length > 0 && (
                 <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 mt-2">
                    <p className="text-xs font-bold text-yellow-700 mb-2 flex items-center"><MessageSquare size={12} className="mr-1"/> Pesan dari Admin:</p>
                    <div className="space-y-2">
                        {d.comments.map(c => (
                            <div key={c.id} className="bg-white/50 p-2 rounded text-xs text-gray-700"><span className="font-bold text-gray-900">{c.adminName}</span>: {c.text}</div>
                        ))}
                    </div>
                 </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{
  user: UserT;
  attendances: AttendanceRecord[];
  users: UserT[];
  onLogout: () => void;
  onRefresh: () => void;
  onUpdateCurrentUser: (user: UserT) => void;
}> = ({ user, attendances, users, onLogout, onRefresh, onUpdateCurrentUser }) => {
  const [view, setView] = useState<'dashboard' | 'change_password'>('dashboard');
  const [tab, setTab] = useState<'daily' | 'users'>('daily');
  const [dailyToken, setDailyToken] = useState('...');

  useEffect(() => {
    DatabaseHelper.getDailyToken().then(setDailyToken);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex justify-between items-center">
           <div className="flex items-center gap-4">
             <div><h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1><p className="text-gray-500 text-sm">Welcome, {user.name}</p></div>
             {/* Tombol Ganti Password Admin */}
             {view === 'dashboard' && (
               <button 
                  onClick={() => setView('change_password')} 
                  className="hidden md:flex items-center gap-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors border border-gray-200"
               >
                  <KeyRound size={14} /> Ganti Password
               </button>
             )}
           </div>
           
           <div className="flex gap-2">
              <button onClick={onRefresh} className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-semibold border border-blue-200">Refresh</button>
              <button onClick={onLogout} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Logout</button>
           </div>
        </div>

        {/* View Ganti Password */}
        {view === 'change_password' && (
           <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-lg mt-10">
              <ChangePasswordPage 
                  user={user} 
                  onBack={() => setView('dashboard')} 
                  onSuccess={(newPass) => {
                      onUpdateCurrentUser({ ...user, password: newPass });
                      onRefresh();
                      setView('dashboard');
                  }} 
              />
           </div>
        )}

        {/* View Dashboard Utama */}
        {view === 'dashboard' && (
          <div className="animate-fade-in">
             <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 mb-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg">
                <div>
                   <h2 className="text-xl font-bold opacity-90 flex items-center gap-2"><Key className="w-5 h-5"/> Token Absensi Hari Ini</h2>
                   <p className="text-blue-100 text-sm mt-1">Berikan kode ini kepada anggota untuk absensi.</p>
                   {/* Mobile Change Pass Button */}
                   <button onClick={() => setView('change_password')} className="md:hidden mt-4 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded flex items-center gap-1"><KeyRound size={12}/> Ganti Password Admin</button>
                </div>
                <div className="mt-4 md:mt-0 bg-white/20 backdrop-blur-md px-8 py-4 rounded-xl border border-white/30">
                   <span className="text-5xl font-mono font-bold tracking-[0.5rem]">{dailyToken}</span>
                </div>
             </div>

             <div className="flex gap-2 mb-6">
               <button onClick={() => setTab('daily')} className={`px-6 py-2 rounded-lg font-bold transition-all ${tab === 'daily' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>Laporan Harian</button>
               <button onClick={() => setTab('users')} className={`px-6 py-2 rounded-lg font-bold transition-all ${tab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>Manajemen User</button>
             </div>

             {tab === 'daily' ? (
               <DailyReportView attendances={attendances} onRefresh={onRefresh} adminUser={user} />
             ) : (
               <UserManagementView users={users} onRefresh={onRefresh} />
             )}
          </div>
        )}
      </div>
    </div>
  );
};

const DailyReportView: React.FC<{
  attendances: AttendanceRecord[];
  onRefresh: () => void;
  adminUser: UserT;
}> = ({ attendances, onRefresh, adminUser }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  
  const uniqueDates = Array.from(new Set(attendances.map(a => a.date)));

  const handleAudit = async (recordId: string, text: string) => {
    const record = attendances.find(a => a.id === recordId);
    if (!record) return;
    
    const newComment: Comment = {
       id: Date.now().toString(),
       adminId: adminUser.nip,
       adminName: adminUser.name,
       text: text,
       timestamp: new Date().toLocaleString()
    };
    
    const updatedComments = [...record.comments, newComment];

    try {
      await DatabaseHelper.addComment(recordId, updatedComments);
      alert('Komentar terkirim.');
      onRefresh();
      setSelectedRecord(null);
    } catch (e) {
      alert('Gagal mengirim komentar.');
    }
  };

  const handleDownloadCSV = (date: string, data: AttendanceRecord[]) => {
     const headers = ['NIP,Nama,Tanggal,Jam,Jabatan,Keterangan,Lokasi'];
     const rows = data.map(d => `${d.userId},"${d.userName}",${d.date},${d.time},"${d.position}","${d.description}","${d.location.lat}, ${d.location.lng}"`);
     const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `Absensi_${date.replace(/\//g, '-')}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  if (selectedRecord) {
     return (
       <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
          <button onClick={()=>setSelectedRecord(null)} className="mb-4 text-gray-500 hover:text-blue-600 font-bold flex items-center"><Home size={16} className="mr-2"/> Kembali ke Daftar</button>
          
          <div className="flex flex-col md:flex-row gap-8">
             <div className="md:w-1/3">
                <img src={selectedRecord.photo} alt="Bukti" className="w-full rounded-xl shadow-md mb-4"/>
                <div className="bg-gray-50 p-4 rounded-xl border"><h3 className="font-bold text-gray-800">Lokasi GPS</h3><p className="text-sm font-mono text-gray-600 mb-2">{selectedRecord.location.lat}, {selectedRecord.location.lng}</p><a href={`https://www.google.com/maps?q=${selectedRecord.location.lat},${selectedRecord.location.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline flex items-center"><MapPin size={12} className="mr-1"/> Buka di Maps</a></div>
             </div>
             
             <div className="md:w-2/3 space-y-6">
                <div><h2 className="text-3xl font-bold text-gray-800">{selectedRecord.userName}</h2><p className="text-gray-500 text-lg">{selectedRecord.userId} • {selectedRecord.position}</p></div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-blue-50 p-3 rounded-lg"><p className="text-xs text-blue-600 font-bold uppercase">Tanggal</p><p className="font-semibold">{selectedRecord.date}</p></div>
                   <div className="bg-blue-50 p-3 rounded-lg"><p className="text-xs text-blue-600 font-bold uppercase">Jam Masuk</p><p className="font-semibold">{selectedRecord.time}</p></div>
                </div>

                <div><h4 className="font-bold text-gray-700 mb-2">Keterangan Kegiatan</h4><p className="bg-gray-50 p-4 rounded-xl border text-gray-700">{selectedRecord.description}</p></div>

                <div className="border-t pt-6">
                   <h4 className="font-bold text-gray-800 mb-4 flex items-center"><ShieldPlus className="mr-2"/> Audit Log & Komentar</h4>
                   <div className="mb-4 space-y-3 max-h-48 overflow-y-auto">
                      {selectedRecord.comments.length === 0 && <p className="text-gray-400 text-sm italic">Belum ada komentar.</p>}
                      {selectedRecord.comments.map(c => (
                         <div key={c.id} className="bg-yellow-50 p-3 rounded-lg border border-yellow-100"><div className="flex justify-between items-start"><p className="font-bold text-xs text-yellow-800">{c.adminName} (Admin)</p><p className="text-xs text-gray-400">{c.timestamp}</p></div><p className="text-sm text-gray-800 mt-1">{c.text}</p></div>
                      ))}
                   </div>
                   <div className="flex gap-2">
                      <input id="commentInput" type="text" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Tulis komentar audit..." />
                      <button onClick={() => { const input = document.getElementById('commentInput') as HTMLInputElement; if(input.value) { handleAudit(selectedRecord.id, input.value); input.value = ''; }}} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900">Kirim</button>
                   </div>
                </div>
             </div>
          </div>
       </div>
     );
  }

  if (selectedDate) {
     const dayRecords = attendances.filter(a => a.date === selectedDate);
     return (
       <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
             <div><button onClick={()=>setSelectedDate(null)} className="text-gray-500 hover:text-blue-600 font-bold text-sm mb-1 flex items-center"><Home size={14} className="mr-1"/> Kembali</button><h2 className="text-2xl font-bold text-gray-800">Laporan Tanggal: {selectedDate}</h2><p className="text-gray-500 text-sm">{dayRecords.length} Anggota Hadir</p></div>
             <div className="flex gap-2">
                <button onClick={() => handleDownloadCSV(selectedDate, dayRecords)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"><FileSpreadsheet size={16}/> Excel/CSV</button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-semibold"><Printer size={16}/> Print / PDF</button>
             </div>
          </div>
          <div className="space-y-0 divider-y divide-gray-100 border-t border-gray-100">
             {dayRecords.length === 0 ? <p className="text-center py-10 text-gray-400">Tidak ada data.</p> : dayRecords.map(record => (
                <div key={record.id} className="group flex items-center gap-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors px-2">
                   <img src={record.photo} alt={record.userName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                   <div className="flex-1"><div className="flex items-center gap-2"><h4 className="font-bold text-gray-900">{record.userName}</h4><span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{record.userId}</span></div><p className="text-sm text-gray-500">{record.time} • {record.position}</p><p className="text-sm text-gray-600 mt-1 line-clamp-1 italic">"{record.description}"</p></div>
                   <div className="flex flex-col items-end gap-1"><button onClick={() => setSelectedRecord(record)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Audit / Detail"><Edit2 size={18}/></button>{record.comments.length > 0 && (<span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded border border-yellow-200">{record.comments.length} notes</span>)}</div>
                </div>
             ))}
          </div>
          <style>{`@media print { body * { visibility: hidden; } .animate-fade-in, .animate-fade-in * { visibility: visible; } .animate-fade-in { position: absolute; left: 0; top: 0; width: 100%; } button { display: none !important; } }`}</style>
       </div>
     );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
       {uniqueDates.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-xl shadow-sm"><Calendar size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-500">Belum ada data absensi masuk.</p></div>
       ) : uniqueDates.map(date => {
         const count = attendances.filter(a => a.date === date).length;
         return (
           <button key={date} onClick={() => setSelectedDate(date)} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md border border-transparent hover:border-blue-500 transition-all text-left group">
              <div className="flex justify-between items-start mb-4"><div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-600 transition-colors"><Calendar className="w-6 h-6 text-blue-600 group-hover:text-white"/></div><span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">{count} Orang</span></div>
              <h3 className="text-xl font-bold text-gray-800">{date}</h3><p className="text-sm text-gray-500 mt-1">Klik untuk detail</p>
           </button>
         );
       })}
    </div>
  );
};

const UserManagementView: React.FC<{
  users: UserT[];
  onRefresh: () => void;
}> = ({ users, onRefresh }) => {
  const [addMode, setAddMode] = useState(false);
  const [newUser, setNewUser] = useState({ nip: '', name: '', role: 'member' });
  const [genPass, setGenPass] = useState('');
  
  const handleAdd = async () => {
    if(!newUser.nip || !newUser.name) return alert('Isi NIP dan Nama!');
    try {
        const password = generatePassword();
        await DatabaseHelper.addUser({ 
            nip: newUser.nip, name: newUser.name, 
            role: newUser.role as 'member'|'admin', 
            password: password 
        });
        alert('User berhasil ditambah!');
        setGenPass(password); // Tampilkan password ke admin
        setAddMode(false);
        onRefresh();
    } catch (e) { alert('Gagal tambah user (mungkin NIP duplikat).'); }
  };

  const handleDelete = async (nip: string) => {
     if(window.confirm('Hapus user ini?')) {
        try {
            await DatabaseHelper.deleteUser(nip);
            onRefresh();
        } catch(e) { alert('Gagal hapus user.'); }
     }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        const text = evt.target?.result as string;
        const lines = text.split('\n');
        let count = 0;
        for(let i=1; i<lines.length; i++) {
            const row = lines[i].split(',');
            if(row.length >= 2) {
                try {
                    await DatabaseHelper.addUser({ 
                        nip: row[0].trim(), name: row[1].trim(), 
                        role: (row[2]?.trim().toLowerCase() === 'admin') ? 'admin' : 'member', 
                        password: generatePassword() 
                    });
                    count++;
                } catch {}
            }
        }
        alert(`Berhasil import ${count} user.`);
        onRefresh();
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-800">Daftar Pengguna</h2>
          <div className="flex gap-2">
             <button onClick={()=>setAddMode(!addMode)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><UserPlus size={16}/> Tambah Manual</button>
             <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer"><Upload size={16}/> Import CSV<input type="file" accept=".csv" className="hidden" onChange={handleImport} /></label>
          </div>
       </div>

       {genPass && (
          <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl mb-6 flex justify-between items-center">
             <div><p className="font-bold">User Berhasil Ditambahkan!</p><p className="text-sm">Password Generated: <span className="font-mono text-lg font-bold bg-white px-2 rounded">{genPass}</span></p></div>
             <button onClick={()=>setGenPass('')} className="text-green-600 hover:text-green-800 font-bold">X</button>
          </div>
       )}

       {addMode && (
          <div className="bg-gray-50 p-4 rounded-xl border mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fade-in">
             <div><label className="text-xs font-bold text-gray-500">NIP</label><input value={newUser.nip} onChange={e=>setNewUser({...newUser, nip: e.target.value})} className="w-full border p-2 rounded" placeholder="Contoh: 2024005"/></div>
             <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500">Nama Lengkap</label><input value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} className="w-full border p-2 rounded" placeholder="Contoh: Budi Santoso"/></div>
             <div><label className="text-xs font-bold text-gray-500">Role</label><select value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value as any})} className="w-full border p-2 rounded bg-white"><option value="member">Member</option><option value="admin">Admin</option></select></div>
             <button onClick={handleAdd} className="bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 md:col-span-4">Simpan User</button>
          </div>
       )}

       <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead><tr className="bg-gray-100 text-gray-600 text-sm"><th className="p-3 rounded-tl-lg">NIP</th><th className="p-3">Nama</th><th className="p-3">Role</th><th className="p-3">Password</th><th className="p-3 rounded-tr-lg text-right">Aksi</th></tr></thead>
             <tbody>
                {users.map(u => (
                   <tr key={u.nip} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{u.nip}</td><td className="p-3 font-bold text-gray-700">{u.name}</td>
                      <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${u.role==='admin'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                      <td className="p-3 font-mono text-sm text-gray-500">{u.password}</td>
                      <td className="p-3 text-right"><button onClick={()=>handleDelete(u.nip)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button></td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default AttendanceSystem;