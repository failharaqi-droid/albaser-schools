import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  Lock, 
  Check, 
  X,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Bot,
  CreditCard,
  AlertCircle,
  DollarSign,
  TrendingDown,
  FileText,
  PieChart as PieChartIcon,
  UserCheck,
  Smartphone,
  Database,
  Key
} from 'lucide-react';
import { User, Tab } from '../types';
import { authService } from '../services/authService';

const ALL_TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'students', label: 'الطلاب', icon: Users },
  { id: 'attendance', label: 'الحضور والانصراف', icon: ShieldCheck },
  { id: 'whatsapp', label: 'بوت واتساب', icon: Bot },
  { id: 'payments', label: 'سجل المدفوعات', icon: CreditCard },
  { id: 'unpaid', label: 'المتأخرات والديون', icon: AlertCircle },
  { id: 'expenses', label: 'المصروفات العامة', icon: DollarSign },
  { id: 'investor', label: 'المسلم للمستثمر', icon: TrendingDown },
  { id: 'ledger', label: 'سجل الحسابات', icon: FileText },
  { id: 'reports', label: 'التقارير المالية', icon: PieChartIcon },
  { id: 'staff', label: 'إدارة الموظفين', icon: UserCheck },
  { id: 'idcards', label: 'هويات الطلاب', icon: Smartphone },
  { id: 'backup', label: 'النسخ والبيانات', icon: Database },
  { id: 'accounts', label: 'إدارة الحسابات', icon: Key },
];

export default function AccountManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAuthEnabled, setIsAuthEnabled] = useState(localStorage.getItem('isAuthEnabled') === 'true');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
    permissions: ['dashboard'] as Tab[],
    canModify: false
  });

  const toggleAuthMode = () => {
    const newValue = !isAuthEnabled;
    if (confirm(newValue 
      ? 'سوف يتم تفعيل نظام تسجيل الدخول. هل تريد المتابعة؟ (يرجى التأكد من وجود حساب مدير نظام لتجنب قفل الدخول)' 
      : 'سوف يتم إلغاء نظام الحماية والدخول المباشر كمدير نظام. هل أنت متأكد؟')) {
      setIsAuthEnabled(newValue);
      localStorage.setItem('isAuthEnabled', newValue.toString());
      window.location.reload();
    }
  };

  useEffect(() => {
    setUsers(authService.getAllUsers());
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      authService.register(
        formData.username, 
        formData.password, 
        formData.role, 
        formData.permissions, 
        formData.canModify
      );
      setUsers(authService.getAllUsers());
      setShowAddModal(false);
      setFormData({ username: '', password: '', role: 'staff', permissions: ['dashboard'], canModify: false });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    
    // Check if new username is already taken by another user
    const users = authService.getAllUsers();
    if (users.some(u => u.username === editingUser.username && u.id !== editingUser.id)) {
      alert('اسم المستخدم موجود مسبقاً لمستخدم آخر');
      return;
    }

    try {
      authService.updateUser(editingUser.id, {
        username: editingUser.username,
        password: editingUser.password,
        role: editingUser.role,
        permissions: editingUser.permissions,
        canModify: editingUser.canModify
      });

      // If current user updated their own account, reload to apply changes
      const currentUser = authService.getCurrentUser();
      if (currentUser?.id === editingUser.id) {
        alert('تم تحديث بيانات حسابك بنجاح. سيتم إعادة تحميل النظام لتطبيق التغييرات.');
        window.location.reload();
        return;
      }

      alert('تم تحديث بيانات المستخدم بنجاح');
      const updatedUsers = authService.getAllUsers();
      setUsers([...updatedUsers]);
      setEditingUser(null);
    } catch (error: any) {
      alert('خطأ في التحديث: ' + error.message);
    }
  };

  const handleDeleteUser = (id: string) => {
    const currentUser = authService.getCurrentUser();
    if (currentUser?.id === id) {
      alert('لا يمكنك حذف حسابك الحالي');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
      authService.deleteUser(id);
      setUsers(authService.getAllUsers());
    }
  };

  const togglePermission = (tabId: Tab, user: User | null = null) => {
    if (user) {
      const permissions = user.permissions || [];
      const newPerms = permissions.includes(tabId)
        ? permissions.filter(p => p !== tabId)
        : [...permissions, tabId];
      setEditingUser({ ...user, permissions: newPerms });
    } else {
      const permissions = formData.permissions || [];
      const newPerms = permissions.includes(tabId)
        ? permissions.filter(p => p !== tabId)
        : [...permissions, tabId];
      setFormData({ ...formData, permissions: newPerms });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">إدارة حسابات النظام</h2>
          <p className="text-slate-500 font-bold">تحكم في صلاحيات الوصول والعمليات لكل مستخدم</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="px-4 text-right">
            <p className="text-xs font-black text-slate-900 leading-none mb-1">وضع الحماية</p>
            <p className={`text-[10px] font-bold ${isAuthEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {isAuthEnabled ? 'نظام تسجيل الدخول مفعل' : 'وضع الضيف (دخول مباشر)'}
            </p>
          </div>
          <button
            onClick={toggleAuthMode}
            className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isAuthEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${isAuthEnabled ? 'right-7' : 'right-1'}`}></div>
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-[1.8rem] font-black flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <UserPlus className="w-5 h-5" />
          إضافة حساب جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-700 opacity-50"></div>
            
            <div className="flex items-start justify-between relative z-10 mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{u.username}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-1 ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role === 'admin' ? 'مدير نظام' : 'موظف'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingUser(u)}
                  className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <Shield className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${u.canModify ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    {u.canModify ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-black text-slate-700">صلاحية التعديل والحذف</span>
                </div>
                <span className={`text-[10px] font-black ${u.canModify ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {u.canModify ? 'مفعلة' : 'معطلة'}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">الأقسام المسموحة ({u.permissions?.length || 0})</p>
                <div className="flex flex-wrap gap-2">
                  {u.permissions?.map(p => (
                    <span key={p} className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                      {ALL_TABS.find(t => t.id === p)?.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 relative"
          >
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-8 left-8 p-2 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <Shield className="w-7 h-7 text-blue-600" />
              تعديل حساب: {editingUser.username}
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest px-2">اسم المستخدم</label>
                  <input
                    required
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-slate-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest px-2">كلمة المرور</label>
                  <input
                    required
                    type="password"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-slate-100 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setEditingUser({ ...editingUser, role: 'admin' })}
                  className={`p-6 rounded-[2rem] border-2 transition-all text-right ${editingUser.role === 'admin' ? 'border-red-600 bg-red-50' : 'border-slate-100'}`}
                >
                  <p className="text-xs font-black text-slate-400 mb-1">نوع الحساب</p>
                  <p className="text-xl font-black text-slate-900">مدير نظام</p>
                </button>
                <button
                  onClick={() => setEditingUser({ ...editingUser, role: 'staff' })}
                  className={`p-6 rounded-[2rem] border-2 transition-all text-right ${editingUser.role === 'staff' ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}
                >
                  <p className="text-xs font-black text-slate-400 mb-1">نوع الحساب</p>
                  <p className="text-xl font-black text-slate-900">موظف</p>
                </button>
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${editingUser.canModify ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">تفعيل التعديل والحذف</p>
                    <p className="text-xs font-bold text-slate-500">السماح للمستخدم بتغيير البيانات أو مسحها من النظام</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser({ ...editingUser, canModify: !editingUser.canModify })}
                  className={`w-16 h-8 rounded-full relative transition-all duration-300 ${editingUser.canModify ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${editingUser.canModify ? 'right-9' : 'right-1'}`}></div>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-black text-slate-700">الأقسام المسموحة في القائمة الرئيسية</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => togglePermission(tab.id, editingUser)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${editingUser.permissions?.includes(tab.id) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 grayscale hover:grayscale-0'}`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span className="text-xs font-black">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-slate-800 shadow-xl shadow-slate-200"
                >
                  حفظ الإعدادات
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[1.5rem] font-black text-lg hover:bg-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 relative my-8"
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-8 left-8 p-2 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <UserPlus className="w-7 h-7 text-blue-600" />
              إضافة مستخدم جديد للنظام
            </h3>

            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest px-2">اسم المستخدم</label>
                  <input
                    required
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-slate-100 font-bold"
                    placeholder="User_Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest px-2">كلمة المرور</label>
                  <input
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-slate-100 font-bold"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'admin' })}
                  className={`p-6 rounded-[2rem] border-2 transition-all text-right ${formData.role === 'admin' ? 'border-red-600 bg-red-50' : 'border-slate-100 bg-slate-50/50'}`}
                >
                  <p className="text-xs font-black text-slate-400 mb-1">نوع الحساب</p>
                  <p className="text-xl font-black text-slate-900">مدير نظام</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'staff' })}
                  className={`p-6 rounded-[2rem] border-2 transition-all text-right ${formData.role === 'staff' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50/50'}`}
                >
                  <p className="text-xs font-black text-slate-400 mb-1">نوع الحساب</p>
                  <p className="text-xl font-black text-slate-900">موظف</p>
                </button>
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.canModify ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">تفعيل التعديل والحذف</p>
                    <p className="text-xs font-bold text-slate-500">السماح للمستخدم بتغيير البيانات أو مسحها من النظام</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, canModify: !formData.canModify })}
                  className={`w-16 h-8 rounded-full relative transition-all duration-300 ${formData.canModify ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${formData.canModify ? 'right-9' : 'right-1'}`}></div>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-black text-slate-700 px-2">الأقسام المسموحة في القائمة الرئيسية</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_TABS.map(tab => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => togglePermission(tab.id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.permissions.includes(tab.id) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 grayscale hover:grayscale-0'}`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span className="text-xs font-black">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
                >
                  إنشاء الحساب الآن
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[1.5rem] font-black text-lg hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
