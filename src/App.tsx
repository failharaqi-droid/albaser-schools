import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  FileText, 
  AlertCircle, 
  Settings, 
  LogOut, 
  School as SchoolIcon,
  Plus,
  Lock,
  Database,
  UserPlus,
  Menu,
  X,
  ShieldCheck,
  Smartphone,
  Globe,
  DollarSign,
  ScanLine,
  CheckCircle2,
  XCircle,
  Bot,
  Trash2,
  MessageSquare,
  Upload,
  Zap,
  Clock,
  GraduationCap,
  TrendingDown,
  PieChart as PieChartIcon,
  Printer,
  Key
} from 'lucide-react';
import { School, Student, Payment, Staff, StaffPayment, StaffInvoice, User, GeneralExpense, ManualLedgerConfig, ManualLedgerEntry, AttendanceRecord, AttendanceStatus, ParentNotification, WhatsAppSettings, WhatsAppTemplate, ExpenseCategory, InvestorPayment, Tab } from './types';
import Dashboard from './components/Dashboard';
import StudentManager from './components/StudentManager';
import PaymentProcessor from './components/PaymentProcessor';
import Reports from './components/Reports';
import UnpaidList from './components/UnpaidList';
import StaffManager from './components/StaffManager';
import ExpensesManager from './components/ExpensesManager';
import LedgerManager from './components/LedgerManager';
import ManualLedgerManager from './components/ManualLedgerManager';
import IDCardManager from './components/IDCardManager';
import AttendanceManager from './components/AttendanceManager';
import TeacherManager from './components/TeacherManager';
import WhatsAppBotManager from './components/WhatsAppBotManager';
import BackupRestore from './components/BackupRestore';
import BarcodeScanner from './components/BarcodeScanner';
import PaymentModal from './components/PaymentModal';
import BackgroundBot from './components/BackgroundBot';
import InvestorManager from './components/InvestorManager';
import AccountManager from './components/AccountManager';
import { authService } from './services/authService';
import { localDb } from './services/localDb';
import { WhatsAppService } from './services/WhatsAppService';


export default function App() {
  const GUEST_USER: User = {
    id: 'guest',
    username: 'مدير النظام',
    role: 'admin',
    permissions: ['dashboard', 'students', 'attendance', 'teachers', 'whatsapp', 'payments', 'unpaid', 'expenses', 'investor', 'ledger', 'reports', 'staff', 'idcards', 'accounts', 'backup'],
    canModify: true,
    createdAt: new Date().toISOString()
  };

  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [preSelectedStudentId, setPreSelectedStudentId] = useState<string | null>(null);
  const [activePaymentStudent, setActivePaymentStudent] = useState<Student | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffPayments, setStaffPayments] = useState<StaffPayment[]>([]);
  const [staffInvoices, setStaffInvoices] = useState<StaffInvoice[]>([]);
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [ledgerConfigs, setLedgerConfigs] = useState<ManualLedgerConfig[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<ManualLedgerEntry[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [parentNotifications, setParentNotifications] = useState<ParentNotification[]>([]);
  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppSettings[]>([]);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>([]);
  const [investorPayments, setInvestorPayments] = useState<InvestorPayment[]>([]);

  const selectedSchool = useMemo(() => {
    if (selectedSchoolId) {
      return schools.find(s => s.id === selectedSchoolId) || schools[0] || null;
    }
    return schools[0] || null;
  }, [schools, selectedSchoolId]);

  const menuGroups = useMemo(() => {
    if (!user) return [];
    
    const groups = [
      {
        title: 'العمليات الأساسية',
        items: [
          { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
          { id: 'students', label: 'الطلاب', icon: Users },
          { id: 'attendance', label: 'الحضور والانصراف', icon: ShieldCheck },
          { id: 'teachers', label: 'إدارة المدرسين', icon: GraduationCap },
          { id: 'whatsapp', label: 'بوت واتساب', icon: Bot },
        ]
      },
      {
        title: 'الإدارة المالية',
        items: [
          { id: 'payments', label: 'سجل المدفوعات', icon: CreditCard },
          { id: 'unpaid', label: 'المتأخرات والديون', icon: AlertCircle },
          { id: 'expenses', label: 'المصروفات العامة', icon: DollarSign },
          { id: 'investor', label: 'المسلم للمستثمر', icon: TrendingDown },
          { id: 'ledger', label: 'سجل الحسابات', icon: FileText },
          { id: 'reports', label: 'التقارير المالية', icon: PieChartIcon },
        ]
      },
      {
        title: 'النظام والأدوات',
        items: [
          { id: 'staff', label: 'إدارة الموظفين', icon: UserPlus },
          { id: 'idcards', label: 'هويات الطلاب', icon: Smartphone },
          { id: 'accounts', label: 'إدارة الحسابات', icon: Key },
          { id: 'backup', label: 'النسخ والبيانات', icon: Database },
        ]
      }
    ];

    // Filter items based on user permissions
    return groups.map(group => ({
      ...group,
      items: group.items.filter(item => user.permissions?.includes(item.id as Tab))
    })).filter(group => group.items.length > 0);
  }, [user]);

  const allItems = useMemo(() => menuGroups.flatMap(g => g.items), [menuGroups]);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isGlobalScanning, setIsGlobalScanning] = useState(false);
  const [globalScanFeedback, setGlobalScanFeedback] = useState<{ 
    name: string; 
    status: 'present' | 'absent' | 'payment' | 'error'; 
    time: string;
    whatsappUrl?: string | null;
  } | null>(null);
  const [isHardwareScannerActive, setIsHardwareScannerActive] = useState(true);
  const [scannerStatus, setScannerStatus] = useState<'connected' | 'disconnected'>('connected');

  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // School Creation & Settings
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [showEditSchool, setShowEditSchool] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [editSchoolData, setEditSchoolData] = useState({ 
    name: '', 
    logo: '', 
    address: '', 
    phone: '', 
    receiptNote: '',
    shiftStartTime: '08:00',
    shiftEndTime: '14:00',
    autoAbsenceCheckEnabled: false,
    autoPrintReceipt: true,
    themeColor: '#7f1d1d',
    zainCashNumber: '',
    quickPaymentLink: '',
    receiptHeaderColor: '#f3f4f6',
    receiptTextColor: '#111827',
    receiptFontSize: 'medium',
    showPreviousPayments: true
  });

  useEffect(() => {
    if (showEditSchool && selectedSchool) {
      setEditSchoolData({
        name: selectedSchool.name || '',
        logo: selectedSchool.logo || '',
        address: selectedSchool.address || '',
        phone: selectedSchool.phone || '',
        receiptNote: selectedSchool.receiptNote || '',
        shiftStartTime: selectedSchool.shiftStartTime || '08:00',
        shiftEndTime: selectedSchool.shiftEndTime || '14:00',
        autoAbsenceCheckEnabled: selectedSchool.autoAbsenceCheckEnabled || false,
        autoPrintReceipt: selectedSchool.autoPrintReceipt ?? true,
        themeColor: selectedSchool.themeColor || '#7f1d1d',
        zainCashNumber: selectedSchool.zainCashNumber || '',
        quickPaymentLink: selectedSchool.quickPaymentLink || '',
        receiptHeaderColor: selectedSchool.receiptHeaderColor || '#f3f4f6',
        receiptTextColor: selectedSchool.receiptTextColor || '#111827',
        receiptFontSize: selectedSchool.receiptFontSize || 'medium',
        showPreviousPayments: selectedSchool.showPreviousPayments ?? true
      });
    }
  }, [showEditSchool, selectedSchool]);

  useEffect(() => {
    const isAuthEnabled = localStorage.getItem('isAuthEnabled') === 'true';
    
    if (!isAuthEnabled) {
      setUser(GUEST_USER);
      setIsAuthReady(true);
    } else {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthReady(true);
    }

    const handleUpdate = () => {
      setSchools(localDb.getAll('schools'));
      setStudents(localDb.getAll('students'));
      setPayments(localDb.getAll('payments'));
      setStaff(localDb.getAll('staff'));
      setStaffPayments(localDb.getAll('staffPayments'));
      setStaffInvoices(localDb.getAll('staffInvoices'));
      setExpenses(localDb.getAll('expenses'));
      setLedgerConfigs(localDb.getAll('manualLedgerConfigs'));
      setLedgerEntries(localDb.getAll('manualLedgerEntries'));
      setExpenseCategories(localDb.getAll('expenseCategories'));
      setAttendanceRecords(localDb.getAll('attendanceRecords'));
      setParentNotifications(localDb.getAll('parentNotifications'));
      setWhatsAppSettings(localDb.getAll('whatsAppSettings'));
      setWhatsAppTemplates(localDb.getAll('whatsAppTemplates'));
      setInvestorPayments(localDb.getAll('investorPayments'));
    };

    handleUpdate();
    window.addEventListener('local-db-update', handleUpdate);
    return () => window.removeEventListener('local-db-update', handleUpdate);
  }, []);

  useEffect(() => {
    if (user && user.permissions && !user.permissions.includes(activeTab)) {
      setActiveTab(user.permissions[0] || 'dashboard');
    }
  }, [user, activeTab]);

  // Global Hardware Scanner Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHardwareScannerActive) return;
      
      const currentTime = Date.now();
      
      // Scanners are extremely fast. Manual typing is slow.
      // If time between keys is > 50ms, it's likely a manual type or slow entry
      // We reset buffer if last key was too long ago
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      // Some scanners send 'Enter' at the end
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleGlobalScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [students, staff, selectedSchoolId, isHardwareScannerActive, attendanceRecords, activeTab]);

  const playScanBeep = (type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + (type === 'success' ? 0.1 : 0.2));
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  const handleGlobalScan = (barcode: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();
    const timeStr = format(new Date(), 'HH:mm:ss');

    // 1. Staff Match (Current School Only)
    const staffMatch = staff.find(s => s.schoolId === selectedSchoolId && (s.attendanceBarcode === barcode || s.fingerprintId === barcode));
    if (staffMatch) {
      playScanBeep('success');
      const records = localDb.getAll('attendanceRecords') as AttendanceRecord[];
      const existing = records.find(r => r.entityId === staffMatch.id && r.date === today);
      if (existing) {
        localDb.update('attendanceRecords', existing.id, { status: 'present', scanTime: now });
      } else {
        localDb.add('attendanceRecords', {
          entityId: staffMatch.id,
          type: 'staff',
          status: 'present',
          date: today,
          scanTime: now,
          createdAt: now
        });
      }
      const isFingerprint = staffMatch.fingerprintId === barcode;
      setGlobalScanFeedback({ 
        name: staffMatch.name, 
        status: 'present', 
        time: `${timeStr} ${isFingerprint ? '(بصمة)' : ''}` 
      });
      setTimeout(() => setGlobalScanFeedback(null), 3000);
      return;
    }

    // 2. Student Match (Current School Only)
    const schoolStudents = students.filter(s => s.schoolId === selectedSchoolId);
    const studentAttendanceMatch = schoolStudents.find(s => s.attendanceBarcode === barcode);
    const studentInstallmentMatch = schoolStudents.find(s => s.installmentBarcode === barcode);
    const studentFingerprintMatch = schoolStudents.find(s => s.fingerprintId === barcode);
    const studentGenericMatch = schoolStudents.find(s => s.barcode === barcode);

    if (studentAttendanceMatch || studentInstallmentMatch || studentFingerprintMatch || studentGenericMatch) {
      const student = studentAttendanceMatch || studentInstallmentMatch || studentFingerprintMatch || studentGenericMatch!;
      playScanBeep('success');
      
      const isFingerprint = studentFingerprintMatch?.fingerprintId === barcode;

      // If it's for attendance or generic (fallback) or fingerprint
      if (studentAttendanceMatch || studentFingerprintMatch || (studentGenericMatch && activeTab === 'attendance')) {
        const records = localDb.getAll('attendanceRecords') as AttendanceRecord[];
        const existing = records.find(r => r.entityId === student.id && r.date === today);
        if (existing) {
          localDb.update('attendanceRecords', existing.id, { status: 'present', scanTime: now });
        } else {
          localDb.add('attendanceRecords', {
            entityId: student.id,
            type: 'student',
            status: 'present',
            date: today,
            scanTime: now,
            createdAt: now
          });
          // Trigger WhatsApp Notification
          WhatsAppService.sendNotification(student.schoolId, student.id, 'attendance').then(res => {
            if (res && res.mode === 'manual' && res.url) {
              setGlobalScanFeedback(prev => prev ? { ...prev, whatsappUrl: res.url } : null);
            }
          });
        }
        setGlobalScanFeedback({ 
          name: student.name, 
          status: 'present', 
          time: `${timeStr} ${isFingerprint ? '(بصمة)' : ''}` 
        });
      } 
      
      // If it's for installments or generic (payment mode)
      if (studentInstallmentMatch || (studentGenericMatch && activeTab !== 'attendance')) {
        setActivePaymentStudent(student);
        setIsGlobalScanning(false);
        setGlobalScanFeedback({ name: student.name, status: 'payment', time: timeStr });
      }
      
      setTimeout(() => setGlobalScanFeedback(null), 3000);
      return;
    }

    // Error feedback
    playScanBeep('error');
    setGlobalScanFeedback({ name: 'باركود غير معرف', status: 'error', time: '' });
    setTimeout(() => setGlobalScanFeedback(null), 2000);
  };

  const schoolStudents = useMemo(() => 
    (students || []).filter(s => s.schoolId === selectedSchoolId),
    [students, selectedSchoolId]
  );

  const schoolStaff = useMemo(() => 
    (staff || []).filter(s => s.schoolId === selectedSchoolId),
    [staff, selectedSchoolId]
  );

  const schoolExpenses = useMemo(() => 
    (expenses || []).filter(e => e.schoolId === selectedSchoolId),
    [expenses, selectedSchoolId]
  );

  const schoolPayments = useMemo(() => {
    const sIds = new Set(schoolStudents.map(s => s.id));
    return (payments || []).filter(p => sIds.has(p.studentId));
  }, [payments, schoolStudents]);

  const schoolStaffPayments = useMemo(() => {
    const sIds = new Set(schoolStaff.map(s => s.id));
    return (staffPayments || []).filter(p => sIds.has(p.staffId));
  }, [staffPayments, schoolStaff]);

  const schoolStaffInvoices = useMemo(() => {
    const sIds = new Set(schoolStaff.map(s => s.id));
    return (staffInvoices || []).filter(i => sIds.has(i.staffId));
  }, [staffInvoices, schoolStaff]);

  const schoolAttendanceRecords = useMemo(() => {
    const studentIds = new Set(schoolStudents.map(s => s.id));
    const staffIds = new Set(schoolStaff.map(s => s.id));
    return (attendanceRecords || []).filter(r => 
      (r.type === 'student' && studentIds.has(r.entityId)) || 
      (r.type === 'staff' && staffIds.has(r.entityId))
    );
  }, [attendanceRecords, schoolStudents, schoolStaff]);

  const schoolLedgerConfigs = useMemo(() => 
    (ledgerConfigs || []).filter(c => c.schoolId === selectedSchoolId),
    [ledgerConfigs, selectedSchoolId]
  );

  const schoolLedgerEntries = useMemo(() => 
    (ledgerEntries || []).filter(e => e.schoolId === selectedSchoolId),
    [ledgerEntries, selectedSchoolId]
  );
  
  const schoolExpenseCategories = useMemo(() => 
    (expenseCategories || []).filter(c => c.schoolId === selectedSchoolId),
    [expenseCategories, selectedSchoolId]
  );

  const schoolInvestorPayments = useMemo(() => 
    (investorPayments || []).filter(p => p.schoolId === selectedSchoolId),
    [investorPayments, selectedSchoolId]
  );

  useEffect(() => {
    if (selectedSchool && !selectedSchoolId) {
      setSelectedSchoolId(selectedSchool.id);
    }
  }, [selectedSchool, selectedSchoolId]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        const loggedInUser = authService.login(username, password);
        setUser(loggedInUser);
      } else {
        const newUser = authService.register(username, password);
        setUser(newUser);
      }
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName || !user) return;
    const newSchool = localDb.add('schools', { name: newSchoolName, ownerId: user.id });
    setSelectedSchoolId(newSchool.id);
    setNewSchoolName('');
    setShowAddSchool(false);
  };

  const handleEditSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool || !editSchoolData.name) return;
    localDb.update('schools', selectedSchool.id, { 
      name: editSchoolData.name,
      logo: editSchoolData.logo,
      address: editSchoolData.address,
      phone: editSchoolData.phone,
      receiptNote: editSchoolData.receiptNote,
      shiftStartTime: editSchoolData.shiftStartTime,
      shiftEndTime: editSchoolData.shiftEndTime,
      autoAbsenceCheckEnabled: editSchoolData.autoAbsenceCheckEnabled,
      autoPrintReceipt: editSchoolData.autoPrintReceipt,
      themeColor: editSchoolData.themeColor,
      zainCashNumber: editSchoolData.zainCashNumber,
      quickPaymentLink: editSchoolData.quickPaymentLink,
      receiptHeaderColor: editSchoolData.receiptHeaderColor,
      receiptTextColor: editSchoolData.receiptTextColor,
      receiptFontSize: editSchoolData.receiptFontSize,
      showPreviousPayments: editSchoolData.showPreviousPayments
    });
    setShowEditSchool(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditSchoolData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isAuthReady) return null;

  const isAuthEnabled = localStorage.getItem('isAuthEnabled') === 'true';

  if (isAuthEnabled && !user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-cairo" dir="rtl" style={{ 
        ['--primary-theme' as any]: '#7f1d1d',
        ['--primary-theme-soft' as any]: '#7f1d1d10',
        ['--primary-theme-hover' as any]: '#7f1d1d20'
      }}>
        <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-12 border border-gray-100 relative overflow-hidden" style={{ boxShadow: '0 25px 50px -12px var(--primary-theme-hover)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 theme-bg-soft rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
          
          <div className="relative z-10 text-center mb-12">
            <div className="theme-bg w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-6 hover:rotate-0 transition-transform duration-500" style={{ boxShadow: '0 20px 25px -5px var(--primary-theme-hover)' }}>
              <Lock className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">نظام المحاسبة المدرسي</h1>
            <p className="text-gray-500 font-bold">نظام محلي آمن لإدارة مدرستك</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6 relative z-10">
            <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
              <button 
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-3 rounded-xl font-black transition-all ${authMode === 'login' ? 'bg-white theme-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                تسجيل الدخول
              </button>
              <button 
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-3 rounded-xl font-black transition-all ${authMode === 'register' ? 'bg-white theme-text shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                إنشاء حساب
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <input
                  required
                  type="text"
                  placeholder="اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-gray-900 focus:ring-4"
                  style={{ ['--tw-ring-color' as any]: 'var(--primary-theme-soft)', borderColor: 'var(--primary-theme)' }}
                />
              </div>
              <div className="relative group">
                <input
                  required
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-gray-900 focus:ring-4"
                  style={{ ['--tw-ring-color' as any]: 'var(--primary-theme-soft)', borderColor: 'var(--primary-theme)' }}
                />
              </div>
            </div>

            {authError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-5 h-5" />
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full theme-bg text-white py-5 rounded-2xl font-black text-lg hover:opacity-90 theme-shadow transition-all transform hover:-translate-y-1 active:scale-95"
            >
              {authMode === 'login' ? 'دخول النظام' : 'تأكيد التسجيل'}
            </button>
          </form>

          <div className="mt-12 flex items-center justify-center gap-6 opacity-40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black">تشفير محلي</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black">يعمل بدون انترنت</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedSchool && !showAddSchool) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-cairo" dir="rtl">
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="bg-red-900 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-red-200 rotate-12">
            <SchoolIcon className="text-white w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900">أهلاً بك، {user.username}</h2>
            <p className="text-gray-500 font-bold text-lg">لنبدأ بإضافة مدرستك الأولى للنظام</p>
          </div>
          <button
            onClick={() => setShowAddSchool(true)}
            className="bg-red-900 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-red-950 shadow-2xl shadow-red-200 flex items-center gap-3 mx-auto transition-all transform hover:scale-105"
          >
            <Plus className="w-6 h-6" />
            إضافة مدرسة جديدة
          </button>
        </div>
      </div>
    );
  }

  if (showAddSchool) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-cairo" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-12 border border-gray-100">
          <h2 className="text-3xl font-black text-gray-900 mb-8 text-center">إضافة مدرسة</h2>
          <form onSubmit={handleAddSchool} className="space-y-6">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">اسم المدرسة</label>
              <input
                required
                type="text"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-red-100 font-bold"
                placeholder="مثال: مدرسة النخبة الأهلية"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-red-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-950 shadow-xl shadow-red-200">
                حفظ المدرسة
              </button>
              <button type="button" onClick={() => setShowAddSchool(false)} className="px-8 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-cairo selection:bg-red-100 selection:text-red-900 overflow-x-hidden" dir="rtl" style={{ 
      ['--primary-theme' as any]: selectedSchool?.themeColor || '#7f1d1d',
      ['--primary-theme-soft' as any]: (selectedSchool?.themeColor || '#7f1d1d') + '10',
      ['--primary-theme-hover' as any]: (selectedSchool?.themeColor || '#7f1d1d') + '20'
    }}>
      {/* Sidebar Container */}
      <aside 
        className="fixed inset-y-0 right-0 z-50 flex active-sidebar-container w-80 shadow-2xl shadow-slate-900/10"
      >
        <div className="h-screen flex flex-col bg-white border-l border-slate-200 relative overflow-hidden w-full">
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 right-0 w-full h-80 bg-[var(--primary-theme-soft)] pointer-events-none opacity-40"></div>
          
          {/* Header & School Selector */}
          <div className="p-5 pb-2 overflow-hidden relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative group cursor-pointer" onClick={() => setShowEditSchool(true)}>
                <div 
                  className="p-3 rounded-2xl shadow-lg flex-shrink-0 relative transition-transform group-hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'var(--primary-theme)' }}
                >
                  {selectedSchool.logo ? (
                    <img src={selectedSchool.logo} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                  ) : (
                    <SchoolIcon className="text-white w-7 h-7" />
                  )}
                </div>
                <div 
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ borderColor: 'var(--primary-theme)' }}
                >
                  <Settings className="w-3 h-3" style={{ color: 'var(--primary-theme)' }} />
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap opacity-40" style={{ color: 'var(--primary-theme)' }}>البوابة الذكية</span>
                </div>
                <div className="relative group">
                  <select
                    value={selectedSchoolId || ''}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="w-full bg-transparent border-none text-base font-black truncate outline-none cursor-pointer p-0 appearance-none focus:ring-0 leading-tight transition-colors"
                    style={{ color: 'var(--primary-theme)' }}
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id} className="text-slate-900 font-bold">{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                onClick={() => setShowAddSchool(true)}
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all flex-shrink-0"
                title="إضافة مدرسة جديدة"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="h-[1px] mb-4" style={{ background: `linear-gradient(to left, var(--primary-theme-soft), var(--primary-theme-soft), transparent)` }}></div>
          </div>

          {/* Navigation Area */}
          <nav className="flex-1 overflow-y-auto px-3 custom-scrollbar space-y-7 pb-6 overflow-x-hidden relative z-10 scroll-smooth">
            {menuGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-3">
                <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-3 opacity-30" style={{ color: 'var(--primary-theme)' }}>
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'currentColor' }}></div>
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        layout
                        whileHover={{ scale: 1.02, x: isActive ? -4 : -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(item.id as Tab)}
                        className={`w-full group flex items-center gap-4 px-4 py-4 rounded-2xl font-black text-base transition-all relative overflow-hidden ${
                          isActive 
                            ? 'text-white shadow-xl animate-in fade-in zoom-in-95 duration-300' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                        style={{ 
                          backgroundColor: isActive ? 'var(--primary-theme)' : 'transparent',
                          boxShadow: isActive ? `0 10px 25px -5px ${selectedSchool?.themeColor}40` : 'none'
                        }}
                      >
                        <AnimatePresence>
                          {isActive && (
                            <motion.div 
                              layoutId="active-indicator"
                              className="absolute inset-x-0 inset-y-0 theme-bg pointer-events-none"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                        </AnimatePresence>
                        
                        {isActive && (
                          <div className="absolute inset-y-0 right-0 w-1.5 bg-white/20 rounded-l-full z-20"></div>
                        )}
                        
                        <span className="relative z-10 flex items-center gap-4">
                          <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'}`} />
                          <span className="transition-all duration-300 whitespace-nowrap tracking-wide font-black truncate max-w-[160px]">
                            {item.label}
                          </span>
                        </span>
                        
                        {!isActive && item.id === 'whatsapp' && (
                          <div className="relative z-10 mr-auto w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981] transition-all"></div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer Area */}
          <div className="p-4 mt-auto relative z-10">
            <div className="bg-slate-50/50 rounded-3xl p-2.5 border border-slate-100 space-y-2">
              <button
                onClick={() => setIsHardwareScannerActive(!isHardwareScannerActive)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group/hardware overflow-hidden ${
                  isHardwareScannerActive 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-all ${isHardwareScannerActive ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <ScanLine className={`w-4 h-4 ${isHardwareScannerActive ? 'animate-pulse' : ''}`} />
                </div>
                <div className="text-right flex-1">
                  <p className="text-[7px] font-black uppercase tracking-widest leading-none mb-1 text-slate-400">Scanner</p>
                  <p className="text-[11px] font-black truncate uppercase">{isHardwareScannerActive ? 'Online' : 'Offline'}</p>
                </div>
              </button>

            <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center text-red-900 font-black flex-shrink-0 border border-white">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-black text-slate-800 leading-none mb-0.5 truncate">{user.username}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{user.role === 'admin' ? 'مدير نظام' : 'حساب موظف'}</p>
                  </div>
                </div>
                {isAuthEnabled && (
                  <button
                    onClick={() => authService.logout()}
                    className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group/logout"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>


      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 mr-80">
        <header className="h-[7rem] px-8 flex items-center justify-between sticky top-0 z-30 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex items-center gap-6"
          >
            <div className="bg-white/70 backdrop-blur-2xl px-8 py-3.5 rounded-[2rem] border border-white/80 shadow-2xl shadow-slate-900/5 transition-all flex items-center gap-5">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-4">
                {allItems.find(i => i.id === activeTab)?.icon && (
                  <div className="text-slate-900 p-2 bg-slate-100 rounded-xl">
                    {React.createElement(allItems.find(i => i.id === activeTab)!.icon, { className: "w-5 h-5" })}
                  </div>
                )}
                <span className="tracking-tight">{allItems.find(i => i.id === activeTab)?.label}</span>
              </h2>
              <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
              <div className="hidden md:flex items-center gap-2 pl-2">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"
                ></motion.div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Online</span>
              </div>
            </div>
          </motion.div>
          
          <div className="pointer-events-auto flex items-center gap-4">
            <button 
              onClick={() => setIsGlobalScanning(true)}
              className="group relative bg-[#020617] text-white pl-8 pr-6 py-3.5 rounded-[1.8rem] shadow-xl shadow-slate-900/20 font-black text-xs flex items-center gap-4 transition-all hover:bg-slate-900 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="w-9 h-9 bg-white/10 group-hover:bg-red-600/20 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12">
                <ScanLine className="w-5 h-5 text-red-400 group-hover:text-red-300" />
              </div>
              <span className="tracking-wider uppercase">نظام التحقق الشامل</span>
            </button>
          </div>
        </header>


        <div className="px-10 pb-24 max-w-[1900px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              {activeTab === 'dashboard' && selectedSchool && (
            <Dashboard 
              school={selectedSchool} 
              students={schoolStudents} 
              payments={schoolPayments}
              staff={schoolStaff}
              staffPayments={schoolStaffPayments}
              staffInvoices={schoolStaffInvoices}
              expenses={schoolExpenses}
              attendanceRecords={schoolAttendanceRecords}
              notifications={parentNotifications}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'students' && selectedSchool && (
            <StudentManager 
              school={selectedSchool} 
              students={schoolStudents} 
              canModify={user.canModify}
              onPay={(studentId) => {
                setPreSelectedStudentId(studentId);
                setActiveTab('payments');
              }}
            />
          )}
          {activeTab === 'payments' && selectedSchool && (
            <PaymentProcessor 
              school={selectedSchool} 
              students={schoolStudents} 
              payments={schoolPayments} 
              canModify={user.canModify}
              preSelectedStudentId={preSelectedStudentId}
              onClearPreSelect={() => setPreSelectedStudentId(null)}
            />
          )}
          {activeTab === 'reports' && selectedSchool && (
            <Reports 
              school={selectedSchool} 
              students={schoolStudents} 
              payments={schoolPayments}
              staff={schoolStaff}
              staffPayments={schoolStaffPayments}
              staffInvoices={schoolStaffInvoices}
              expenses={schoolExpenses}
              investorPayments={schoolInvestorPayments}
            />
          )}
          {activeTab === 'unpaid' && selectedSchool && (
            <UnpaidList school={selectedSchool} students={schoolStudents} payments={schoolPayments} />
          )}
          {activeTab === 'staff' && selectedSchool && (
            <StaffManager 
              school={selectedSchool} 
              staff={schoolStaff}
              staffPayments={schoolStaffPayments}
              staffInvoices={schoolStaffInvoices}
              attendanceRecords={schoolAttendanceRecords}
              canModify={user.canModify}
            />
          )}
          {activeTab === 'expenses' && selectedSchool && (
            <ExpensesManager 
              school={selectedSchool} 
              expenses={schoolExpenses}
              categories={schoolExpenseCategories}
              canModify={user.canModify}
            />
          )}
          {activeTab === 'ledger' && selectedSchool && (
            <LedgerManager 
              school={selectedSchool} 
              students={schoolStudents}
              staff={schoolStaff}
              expenses={schoolExpenses}
              payments={schoolPayments}
              ledgerConfigs={schoolLedgerConfigs}
              ledgerEntries={schoolLedgerEntries}
              canModify={user.canModify}
            />
          )}
          {activeTab === 'attendance' && selectedSchool && (
            <AttendanceManager 
              school={selectedSchool}
              students={schoolStudents}
              staff={schoolStaff}
              attendanceRecords={schoolAttendanceRecords}
              canModify={user.canModify}
            />
          )}
          {activeTab === 'teachers' && selectedSchool && (
            <TeacherManager 
              school={selectedSchool} 
              students={schoolStudents}
              staff={schoolStaff}
              canModify={user.canModify}
            />
          )}
          {activeTab === 'whatsapp' && selectedSchool && (
            <WhatsAppBotManager 
              school={selectedSchool}
              students={schoolStudents}
              notifications={parentNotifications}
              settings={whatsAppSettings}
              templates={whatsAppTemplates}
              canModify={user.canModify}
            />
          )}
          {activeTab === 'idcards' && selectedSchool && (
            <IDCardManager 
              school={selectedSchool} 
              students={schoolStudents}
              staff={schoolStaff}
            />
          )}
          {activeTab === 'investor' && selectedSchool && (
            <InvestorManager
              school={selectedSchool}
              investorPayments={schoolInvestorPayments}
              canModify={user.canModify}
            />
          )}
          {activeTab === 'accounts' && <AccountManager />}
          {activeTab === 'backup' && <BackupRestore />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {isGlobalScanning && (
        <BarcodeScanner 
          onScan={handleGlobalScan}
          onClose={() => setIsGlobalScanning(false)}
        />
      )}

      <AnimatePresence>
        {activePaymentStudent && selectedSchool && (
          <PaymentModal
            student={activePaymentStudent}
            school={selectedSchool}
            payments={payments}
            onClose={() => setActivePaymentStudent(null)}
          />
        )}
      </AnimatePresence>

      {/* Global Scan Feedback Overlay */}
      {globalScanFeedback && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-500">
          <div className={`${
            globalScanFeedback.status === 'payment' ? 'bg-blue-600 border-blue-400 font-bold' : 
            globalScanFeedback.status === 'error' ? 'bg-red-600 border-red-400' :
            'bg-emerald-600 border-emerald-400'
          } border-2 p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-6 text-white min-w-[320px]`}>
            <div className="bg-white/20 p-4 rounded-2xl">
              {globalScanFeedback.status === 'payment' ? <CreditCard className="w-10 h-10" /> : 
               globalScanFeedback.status === 'error' ? <XCircle className="w-10 h-10" /> :
               <CheckCircle2 className="w-10 h-10" />}
            </div>
            <div className="text-right flex-1">
              <h4 className="text-2xl font-black">{globalScanFeedback.name}</h4>
              <p className="text-sm font-bold opacity-90">
                {globalScanFeedback.status === 'payment' ? 'تم فتح سجل الأقساط' : 
                 globalScanFeedback.status === 'error' ? 'الباركود غير معرف في النظام' :
                 `تم تسجيل الحضور في ${globalScanFeedback.time}`}
              </p>
              {globalScanFeedback.whatsappUrl && (
                <button
                  onClick={() => window.open(globalScanFeedback.whatsappUrl!, '_blank')}
                  className="mt-3 flex items-center gap-2 bg-white text-emerald-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-50 transition-all shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  إرسال إشعار ولي الأمر
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      <AnimatePresence>
        {showEditSchool && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditSchool(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl border border-white/20 relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full -translate-y-20 translate-x-20 blur-3xl opacity-50"></div>
              
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-20">
                <div className="flex items-center gap-5">
                  <div className="theme-bg p-5 rounded-[1.8rem] text-white shadow-xl theme-shadow rotate-3">
                    <Settings className="w-8 h-8 animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">إعدادات المدرسة</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">School Configuration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEditSchool(false)} 
                  className="bg-slate-50 p-4 hover:bg-slate-100 rounded-[1.5rem] transition-all text-slate-400 hover:text-slate-900 shadow-sm grow-0 shrink-0"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditSchool} className="p-10 space-y-8 relative z-10 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/20">
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-2">الهوية البصرية والاسم</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="flex flex-col items-center gap-4 bg-slate-50/50 p-6 rounded-[2.5rem] border border-dashed border-slate-200 group">
                        <div className="w-32 h-32 bg-white rounded-[2.2rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-xl relative">
                          {editSchoolData.logo ? (
                            <img src={editSchoolData.logo} alt="Preview" className="w-full h-full object-contain p-2" />
                          ) : (
                            <SchoolIcon className="text-slate-200 w-12 h-12 group-hover:scale-110 transition-transform duration-500" />
                          )}
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">شعار المدرسة</p>
                          <label className="text-xs font-black text-indigo-600 hover:text-indigo-700 cursor-pointer bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">تحميل صورة</label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-2 px-2 uppercase tracking-widest">لون التصميم الأساسي</label>
                          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                            <input
                              type="color"
                              value={editSchoolData.themeColor}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, themeColor: e.target.value }))}
                              className="w-12 h-12 bg-transparent border-none outline-none cursor-pointer p-0 appearance-none rounded-xl overflow-hidden shadow-sm"
                            />
                            <input
                              type="text"
                              value={editSchoolData.themeColor}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, themeColor: e.target.value }))}
                              className="flex-1 bg-transparent border-none outline-none font-mono text-sm font-black text-slate-600"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-2 px-2 uppercase tracking-widest">اسم المدرسة</label>
                          <input
                            required
                            type="text"
                            value={editSchoolData.name}
                            onChange={(e) => setEditSchoolData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-slate-100 font-black text-slate-800 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-2">معلومات التواصل والوقت</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-2 px-2 uppercase tracking-widest">رقم الهاتف</label>
                          <input
                            type="text"
                            value={editSchoolData.phone}
                            onChange={(e) => setEditSchoolData(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-slate-100 font-bold"
                            placeholder="رقم هاتف المدرسة"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-2 px-2 uppercase tracking-widest">العنوان</label>
                          <input
                            type="text"
                            value={editSchoolData.address}
                            onChange={(e) => setEditSchoolData(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-slate-100 font-bold"
                            placeholder="عنوان المدرسة"
                          />
                        </div>
                      </div>

                      <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-100/50 space-y-4">
                        <p className="text-[10px] font-black text-indigo-400 uppercase text-center tracking-widest">توقيتات الدوام الرسمي</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <label className="block text-[10px] font-black text-slate-400 mb-1">بداية الدوام</label>
                            <input
                              type="time"
                              value={editSchoolData.shiftStartTime}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, shiftStartTime: e.target.value }))}
                              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 outline-none font-black text-slate-700 shadow-sm"
                            />
                          </div>
                          <div className="text-center">
                            <label className="block text-[10px] font-black text-slate-400 mb-1">نهاية الدوام</label>
                            <input
                              type="time"
                              value={editSchoolData.shiftEndTime}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, shiftEndTime: e.target.value }))}
                              className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 outline-none font-black text-slate-700 shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                      <div className="p-3 bg-white/10 rounded-2xl">
                        <CreditCard className="w-6 h-6 text-indigo-300" />
                      </div>
                      <h3 className="text-xl font-black text-white">إعدادات الدفع المالي</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-2 px-2 uppercase tracking-widest">رقم محفظة زين كاش</label>
                        <input
                          type="text"
                          value={editSchoolData.zainCashNumber}
                          onChange={(e) => setEditSchoolData(prev => ({ ...prev, zainCashNumber: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-white/5 font-black text-indigo-100"
                          placeholder="رقم المحفظة"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-2 px-2 uppercase tracking-widest">رابط الدفع المباشر</label>
                        <input
                          type="url"
                          value={editSchoolData.quickPaymentLink}
                          onChange={(e) => setEditSchoolData(prev => ({ ...prev, quickPaymentLink: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-4 outline-none focus:ring-4 focus:ring-white/5 font-bold text-indigo-100"
                          placeholder="https://pay.link/..."
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/10 relative z-10">
                       <label className="block text-[10px] font-black text-slate-400 mb-0 px-2 uppercase tracking-widest">نمط وصل القبض (خيارات متقدمة)</label>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                            <label className="block text-[8px] font-black text-slate-500 mb-2 uppercase">حجم الخط</label>
                            <select
                              value={editSchoolData.receiptFontSize}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, receiptFontSize: e.target.value as any }))}
                              className="w-full bg-transparent border-none text-xs font-black outline-none cursor-pointer p-0"
                            >
                              <option value="small" className="text-slate-900">صغير (S)</option>
                              <option value="medium" className="text-slate-900">متوسط (M)</option>
                              <option value="large" className="text-slate-900">كبير (L)</option>
                            </select>
                          </div>
                          
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-200">الدفعات السابقة</span>
                            <button
                              type="button"
                              onClick={() => setEditSchoolData(prev => ({ ...prev, showPreviousPayments: !prev.showPreviousPayments }))}
                              className={`w-10 h-5 rounded-full relative transition-all duration-300 ${editSchoolData.showPreviousPayments ? 'bg-indigo-500' : 'bg-white/10'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editSchoolData.showPreviousPayments ? 'right-5.5' : 'right-0.5'}`}></div>
                            </button>
                          </div>

                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-200">الطباعة الآلية</span>
                            <button
                              type="button"
                              onClick={() => setEditSchoolData(prev => ({ ...prev, autoPrintReceipt: !prev.autoPrintReceipt }))}
                              className={`w-10 h-5 rounded-full relative transition-all duration-300 ${editSchoolData.autoPrintReceipt ? 'bg-indigo-500' : 'bg-white/10'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editSchoolData.autoPrintReceipt ? 'right-5.5' : 'right-0.5'}`}></div>
                            </button>
                          </div>
                       </div>

                       <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                          <div className="flex flex-wrap gap-6">
                            <div className="flex-1 min-w-[140px]">
                               <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase">لون الترويسة</label>
                               <div className="flex items-center gap-3">
                                  <input type="color" value={editSchoolData.receiptHeaderColor} onChange={(e) => setEditSchoolData(prev => ({ ...prev, receiptHeaderColor: e.target.value }))} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none" />
                                  <span className="text-[10px] font-mono text-indigo-200">{editSchoolData.receiptHeaderColor}</span>
                               </div>
                            </div>
                            <div className="flex-1 min-w-[140px]">
                               <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase">لون النص</label>
                               <div className="flex items-center gap-3">
                                  <input type="color" value={editSchoolData.receiptTextColor} onChange={(e) => setEditSchoolData(prev => ({ ...prev, receiptTextColor: e.target.value }))} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none" />
                                  <span className="text-[10px] font-mono text-indigo-200">{editSchoolData.receiptTextColor}</span>
                               </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase">ملاحظة أسفل الوصل</label>
                            <input
                              type="text"
                              value={editSchoolData.receiptNote}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, receiptNote: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-[1.2rem] px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold text-xs text-indigo-100"
                              placeholder="ملاحظات ختامية للوصل..."
                            />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button
                      type="button"
                      onClick={() => setEditSchoolData(prev => ({ ...prev, autoAbsenceCheckEnabled: !prev.autoAbsenceCheckEnabled }))}
                      className={`p-7 rounded-[2.5rem] flex items-center justify-between border transition-all ${
                        editSchoolData.autoAbsenceCheckEnabled 
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-900' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <div className="text-right">
                        <h4 className="text-base font-black flex items-center gap-3">
                          <CheckCircle2 className={`w-5 h-5 ${editSchoolData.autoAbsenceCheckEnabled ? 'text-indigo-600' : 'text-slate-200'}`} />
                          معالجة الغياب تلقائياً
                        </h4>
                        <p className={`text-[10px] font-bold mt-1 ${editSchoolData.autoAbsenceCheckEnabled ? 'text-indigo-600/70' : 'text-slate-400'}`}>
                          إرسال إشعارات التنبيه لولي الأمر بعد انتهاء توقيت الدوام الرسمي
                        </p>
                      </div>
                      <div className={`w-14 h-7 rounded-full transition-all relative ${editSchoolData.autoAbsenceCheckEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${editSchoolData.autoAbsenceCheckEnabled ? 'right-8' : 'right-1'}`}></div>
                      </div>
                    </button>


                  {schools.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-6 rounded-[2rem] flex items-center justify-between border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-100 transition-all group"
                    >
                      <div className="text-right">
                        <h4 className="text-sm font-black flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          حذف هذه المدرسة نهائياً
                        </h4>
                        <p className="text-[10px] font-bold mt-0.5 opacity-70">
                          سيتم مسح كافة سجلات الطلاب والمالية لهذه المدرسة
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Trash2 className="w-5 h-5" />
                      </div>
                    </button>
                  )}
                </div>

                </div>

                <div className="pt-6">
                  <button type="submit" className="w-full theme-bg text-white py-6 rounded-[2.2rem] font-black text-xl theme-shadow hover:opacity-90 transition-all active:scale-[0.98] transform flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-6 h-6" />
                    حفظ وتركيب الإعدادات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete School Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl p-10 border border-white/20 relative z-10 overflow-hidden text-center"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -translate-y-16 translate-x-16 blur-2xl opacity-50"></div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-100">
                  <AlertCircle className="w-10 h-10" />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-3">تأكيد حذف المدرسة</h3>
                <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                  هل أنت متأكد من حذف <span className="text-rose-600">"{selectedSchool?.name}"</span>؟ 
                  <br />
                  هذا الإجراء سيقوم بمسح كافة سجلات الطلاب، الموظفين، والبيانات المالية نهائياً ولا يمكن التراجع عنه.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (!selectedSchool) return;
                      localDb.delete('schools', selectedSchool.id);
                      // Also delete related data
                      const deleteRelated = (collection: any, field: string) => {
                        const items = localDb.getAll(collection);
                        items.forEach((item: any) => {
                          if (item[field] === selectedSchool.id) {
                            localDb.delete(collection, item.id);
                          }
                        });
                      };
                      
                      deleteRelated('students', 'schoolId');
                      deleteRelated('staff', 'schoolId');
                      deleteRelated('expenses', 'schoolId');
                      deleteRelated('manualLedgerConfigs', 'schoolId');
                      deleteRelated('manualLedgerEntries', 'schoolId');
                      deleteRelated('expenseCategories', 'schoolId');
                      deleteRelated('attendanceRecords', 'schoolId');
                      deleteRelated('investorPayments', 'schoolId');
                      
                      setSelectedSchoolId(schools.find(s => s.id !== selectedSchool.id)?.id || null);
                      setShowDeleteConfirm(false);
                      setShowEditSchool(false);
                    }}
                    className="w-full bg-rose-600 text-white py-5 rounded-[1.8rem] font-black text-lg hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Trash2 className="w-5 h-5" />
                    تأكيد الحذف النهائي
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full bg-slate-100 text-slate-600 py-5 rounded-[1.8rem] font-black text-lg hover:bg-slate-200 transition-all"
                  >
                    إلغاء الإجراء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <BackgroundBot />
    </div>
  );
}
