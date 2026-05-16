import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { toast } from './Toast';

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
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [confirmingAuthToggle, setConfirmingAuthToggle] = useState<boolean | null>(null);
  const [isAuthEnabled, setIsAuthEnabled] = useState(localStorage.getItem('isAuthEnabled') === 'true');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
    permissions: ['dashboard'] as Tab[],
    canModify: false
  });

  const toggleAuthMode = () => {
    setConfirmingAuthToggle(!isAuthEnabled);
  };
  
  const confirmToggleAuthMode = () => {
    if (confirmingAuthToggle === null) return;
    setIsAuthEnabled(confirmingAuthToggle);
    localStorage.setItem('isAuthEnabled', confirmingAuthToggle.toString());
    window.location.reload();
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
      toast.error(error.message);
    }
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    
    // Check if new username is already taken by another user
    const users = authService.getAllUsers();
    if (users.some(u => u.username === editingUser.username && u.id !== editingUser.id)) {
      toast.error('اسم المستخدم موجود مسبقاً لمستخدم آخر');
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
        toast.success('تم تحديث بيانات حسابك بنجاح. سيتم إعادة تحميل النظام لتطبيق التغييرات.');
        setTimeout(() => window.location.reload(), 2000);
        return;
      }

      toast.success('تم تحديث بيانات المستخدم بنجاح');
      const updatedUsers = authService.getAllUsers();
      setUsers([...updatedUsers]);
      setEditingUser(null);
    } catch (error: any) {
      toast.error('خطأ في التحديث: ' + error.message);
    }
  };

  const handleDeleteUser = (user: User) => {
    const currentUser = authService.getCurrentUser();
    if (currentUser?.id === user.id) {
      toast.warning('لا يمكنك حذف حسابك الحالي');
      return;
    }
    setDeletingUser(user);
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
    <div className="space-y-2 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 mb-2">إدارة حسابات النظام</h2>
          <p className="text-slate-500 font-bold">تحكم في صلاحيات الوصول والعمليات لكل مستخدم</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
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
          className="bg-slate-900 text-white px-8 py-2 rounded-xl font-black flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <UserPlus className="w-5 h-5" />
          إضافة حساب جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-10 h-10 bg-slate-50 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-700 opacity-50"></div>
            
            <div className="flex items-start justify-between relative z-10 mb-6">
              <div className="flex items-center gap-2">
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
                {u.username !== 'failh' && (
                  <>
                    <button
                      onClick={() => setEditingUser(u)}
                      className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Shield className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
                {u.username === 'failh' && (
                  <div className="p-2.5 text-emerald-500 bg-emerald-50 rounded-xl flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black">مدير ثابت</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 relative z-10">
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
          </div>
        ))}
      </div>

      {/* Edit User Modal */}
      
        {editingUser && (
          <div className="integrated-page z-[300] no-scrollbar">
            <div
              className="modal-content"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-5 theme-bg rounded-2xl text-white shadow-xl theme-shadow">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">تعديل صلاحيات المستخدم</h3>
                    <p className="text-sm font-bold text-indigo-600 mt-1">المستخدم الحالي: {editingUser.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingUser(null)} 
                    className="bg-slate-50 p-4 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-slate-600 hover:text-slate-900 active:scale-95 transition-all text-slate-400 hover:text-rose-600 border border-slate-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar">
                <div className="max-w-5xl mx-auto w-full /space-y-2">
                  <div className="bg-white p-4 lg:p-14 rounded-3xl border border-slate-100 shadow-xl space-y-2 text-right">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest px-6">اسم المستخدم للنظام</label>
                        <input
                          required
                          type="text"
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-10 py-6 outline-none focus:ring-2 focus:ring-slate-100 font-black text-lg shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest px-6">كلمة المرور الجديدة</label>
                        <input
                          required
                          type="password"
                          value={editingUser.password}
                          onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-10 py-6 outline-none focus:ring-2 focus:ring-slate-100 font-black text-lg shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <button
                        onClick={() => setEditingUser({ ...editingUser, role: 'admin' })}
                        className={`p-4 rounded-2xl border-4 transition-all text-right group ${editingUser.role === 'admin' ? 'border-rose-600 bg-rose-50/50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                      >
                        <ShieldCheck className={`w-6 h-6 mb-6 ${editingUser.role === 'admin' ? 'text-rose-600' : 'text-slate-300'}`} />
                        <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">نوع الحساب</p>
                        <p className="text-lg font-black text-slate-900 tracking-tight text-slate-900">مدير نظام برتبة Full Admin</p>
                      </button>
                      <button
                        onClick={() => setEditingUser({ ...editingUser, role: 'staff' })}
                        className={`p-4 rounded-2xl border-4 transition-all text-right group ${editingUser.role === 'staff' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                      >
                        <Users className={`w-6 h-6 mb-6 ${editingUser.role === 'staff' ? 'text-indigo-600' : 'text-slate-300'}`} />
                        <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">نوع الحساب</p>
                        <p className="text-lg font-black text-slate-900 tracking-tight text-slate-900">موظف محدود الصلاحيات</p>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-100/50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl ${editingUser.canModify ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-slate-900">تفعيل صلاحيات التعديل والحذف</p>
                          <p className="text-sm font-bold text-slate-500 mt-1">السماح لهذا المستخدم بالتحكم الكامل في مسح وتعديل السجلات</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingUser({ ...editingUser, canModify: !editingUser.canModify })}
                        className={`w-24 h-12 rounded-full relative transition-all duration-300 shadow-inner ${editingUser.canModify ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-2 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-xl ${editingUser.canModify ? 'right-14' : 'right-2'}`}></div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-4 lg:p-16 rounded-3xl border border-slate-100 shadow-sm space-y-2 text-right">
                    <p className="text-xl font-black text-slate-900 px-6">تخصيص الأقسام المسموح بالوصول إليها</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {ALL_TABS.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => togglePermission(tab.id, editingUser)}
                          className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-4 transition-all ${editingUser.permissions?.includes(tab.id) ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xl scale-105' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200 grayscale hover:grayscale-0'}`}
                        >
                          <tab.icon className="w-6 h-6" />
                          <span className="text-sm font-black tracking-tight">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-50 gap-3">
                <button
                  onClick={handleUpdateUser}
                  className="w-full max-w-xl bg-slate-900 text-white py-2 px-6 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  حفظ وتطبيق الصلاحيات الجديدة
                </button>
              </div>
            </div>
          </div>
        )}
      

      {/* Add User Modal */}
      
        {showAddModal && (
          <div className="integrated-page z-[300] no-scrollbar">
            <div
              className="modal-content"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">
                <div className="flex items-center gap-3 text-right leading-relaxed">
                  <div className="p-5 theme-bg rounded-2xl text-white shadow-xl theme-shadow rotate-3 px-10">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight leading-relaxed">إضافة مستخدم جديد لمنظومة المدرسة</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1">تأكد من توزيع الصلاحيات بدقة للأمان الكامل</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowAddModal(false)} 
                    className="bg-slate-50 p-4 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-slate-600 hover:text-slate-900 active:scale-95 transition-all text-slate-400 hover:text-rose-600 border border-slate-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddUser} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar w-full bg-slate-50/20 custom-scrollbar">
                  <div className="max-w-5xl mx-auto w-full /space-y-2">
                    <div className="bg-white p-4 lg:p-14 rounded-3xl border border-slate-100 shadow-xl space-y-2 text-right">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest px-6">اسم المستخدم (User ID)</label>
                          <input
                            required
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-10 py-6 outline-none focus:ring-2 focus:ring-slate-100 font-black text-lg shadow-inner"
                            placeholder="User_Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest px-6">كلمة المرور (Password)</label>
                          <input
                            required
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-10 py-6 outline-none focus:ring-2 focus:ring-slate-100 font-black text-lg shadow-inner"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'admin' })}
                          className={`p-4 rounded-2xl border-4 transition-all text-right group ${formData.role === 'admin' ? 'border-rose-600 bg-rose-50/50 shadow-xl' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                        >
                          <ShieldCheck className={`w-6 h-6 mb-6 ${formData.role === 'admin' ? 'text-rose-600' : 'text-slate-300'}`} />
                          <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">نوع الحساب المختار</p>
                          <p className="text-lg font-black text-slate-900 tracking-tight text-slate-900">مدير نظام بصلاحية وصول كاملة</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, role: 'staff' })}
                          className={`p-4 rounded-2xl border-4 transition-all text-right group ${formData.role === 'staff' ? 'border-indigo-600 bg-indigo-50/50 shadow-xl' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                        >
                          <Users className={`w-6 h-6 mb-6 ${formData.role === 'staff' ? 'text-indigo-600' : 'text-slate-300'}`} />
                          <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">نوع الحساب المختار</p>
                          <p className="text-lg font-black text-slate-900 tracking-tight text-slate-900">موظف بصلاحيات تشغيلية فقط</p>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-100/50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl ${formData.canModify ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                            <Lock className="w-6 h-6" />
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-slate-900">تفعيل صلاحية التغيير والحذف</p>
                            <p className="text-sm font-bold text-slate-500 mt-1">تحديد ما إذا كان بإمكان المستخدم تعديل أو مسح البيانات</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, canModify: !formData.canModify })}
                          className={`w-24 h-12 rounded-full relative transition-all duration-300 shadow-inner ${formData.canModify ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-2 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-xl ${formData.canModify ? 'right-14' : 'right-2'}`}></div>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 lg:p-16 rounded-3xl border border-slate-100 shadow-sm space-y-2 text-right">
                      <p className="text-xl font-black text-slate-900 px-6">اختيار الأقسام المسموح للمستخدم برؤيتها</p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {ALL_TABS.map(tab => (
                          <button
                            type="button"
                            key={tab.id}
                            onClick={() => togglePermission(tab.id)}
                            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-4 transition-all ${formData.permissions.includes(tab.id) ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xl scale-105' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200 grayscale hover:grayscale-0'}`}
                          >
                            <tab.icon className="w-6 h-6" />
                            <span className="text-sm font-black tracking-tight">{tab.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-50">
                  <button
                    type="submit"
                    className="w-full max-w-2xl bg-slate-900 text-white py-2 px-6 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                  >
                    تأكيد وإنشاء المستخدم الجديد
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      
      {/* Modals for Accounts */}
      {confirmingAuthToggle !== null && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 ${confirmingAuthToggle ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                {confirmingAuthToggle ? <ShieldCheck className="w-12 h-12" /> : <Key className="w-12 h-12" />}
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">تأكيد الإجراء</h3>
              <p className="text-lg text-slate-500 font-bold leading-relaxed">
                {confirmingAuthToggle 
                  ? 'سوف يتم تفعيل نظام تسجيل الدخول. هل تريد المتابعة؟ (يرجى التأكد من وجود حساب مدير نظام لتجنب قفل الدخول)' 
                  : 'سوف يتم إلغاء نظام الحماية والدخول المباشر كمدير نظام بدون كلمة مرور. هل أنت متأكد؟'}
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={confirmToggleAuthMode}
                  className={`w-full text-white py-4 rounded-2xl font-black text-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${confirmingAuthToggle ? 'bg-amber-600 hover:bg-amber-700 shadow-xl shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200'}`}
                >
                  نعم، تأكيد
                </button>
                <button 
                  onClick={() => setConfirmingAuthToggle(null)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-lg hover:bg-slate-200 active:scale-95 transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-rose-50 rounded-full mx-auto flex items-center justify-center text-rose-500 mb-6">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">تأكيد الحذف</h3>
              <p className="text-lg text-slate-500 font-bold leading-relaxed">
                هل أنت متأكد من حذف الحساب <span className="text-rose-600">"{deletingUser.username}"</span>؟
                <br />
                <span className="text-sm font-medium">سيتم فقدان إمكانية الدخول من خلال هذا الحساب بشكل نهائي.</span>
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => {
                    authService.deleteUser(deletingUser.id);
                    setUsers(authService.getAllUsers());
                    setDeletingUser(null);
                  }}
                  className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-6 h-6" />
                  نعم، تأكيد الحذف
                </button>
                <button 
                  onClick={() => setDeletingUser(null)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-lg hover:bg-slate-200 active:scale-95 transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
