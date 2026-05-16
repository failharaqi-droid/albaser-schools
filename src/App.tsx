import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Key,
  ChevronRight,
  BookOpen,
  ClipboardList,
  ChevronDown
} from 'lucide-react';
import { School, Student, Payment, Staff, StaffPayment, StaffInvoice, User, GeneralExpense, ManualLedgerConfig, ManualLedgerEntry, AttendanceRecord, AttendanceStatus, ParentNotification, WhatsAppSettings, WhatsAppTemplate, ExpenseCategory, InvestorPayment, Tab, Holiday } from './types';
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
import ToastContainer from './components/Toast';
import InvestorManager from './components/InvestorManager';
import AccountManager from './components/AccountManager';
import UserGuide from './components/UserGuide';
import DbSetupModal from './components/DbSetupModal';
import { auth, signInWithGoogle, logout, loginWithEmail, registerWithEmail } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { localDb } from './services/localDb';
import { WhatsAppService } from './services/WhatsAppService';

export default function App() {
  const GUEST_USER: User = {
    id: 'guest',
    username: 'مدير النظام',
    role: 'admin',
    permissions: ['dashboard', 'students', 'attendance', 'teachers', 'whatsapp', 'payments', 'add-student', 'attendance-reports', 'unpaid', 'expenses', 'investor', 'ledger', 'reports', 'staff', 'idcards', 'accounts', 'backup', 'userguide'],
    canModify: true,
    createdAt: new Date().toISOString()
  };

  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [navHistory, setNavHistory] = useState<Tab[]>(['dashboard']);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>(['النظام والأدوات']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleNavigate = (tab: Tab) => {
    if (tab === activeTab) return;
    setNavHistory(prev => [...prev, tab]);
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleBack = () => {
    if (navHistory.length > 1) {
      const newHistory = [...navHistory];
      newHistory.pop();
      const prev = newHistory[newHistory.length - 1];
      setNavHistory(newHistory);
      setActiveTab(prev);
    } else {
      setActiveTab('dashboard');
      setNavHistory(['dashboard']);
    }
  };

  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(() => {
    return localStorage.getItem('selectedSchoolId') || null;
  });

  useEffect(() => {
    if (selectedSchoolId) {
      localStorage.setItem('selectedSchoolId', selectedSchoolId);
    } else {
      localStorage.removeItem('selectedSchoolId');
    }
  }, [selectedSchoolId]);

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
  const [holidays, setHolidays] = useState<Holiday[]>([]);

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
          { id: 'add-student', label: 'تسجيل طالب جديد', icon: UserPlus },
          { id: 'attendance', label: 'الحضور والانصراف', icon: ShieldCheck },
          { id: 'attendance-reports', label: 'تقارير الغيابات', icon: FileText },
          { id: 'teachers', label: 'إدارة المدرسين', icon: GraduationCap },
          { id: 'whatsapp', label: 'بوت واتساب', icon: Bot },
          { id: 'manual-ledger', label: 'سجل المسطر', icon: ClipboardList },
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
          { id: 'userguide', label: 'دليل النظام', icon: BookOpen },
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

  const [dbLoaded, setDbLoaded] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking' | 'not_configured'>('checking');
  
  const checkDb = () => {
     fetch('/api/health')
      .then(r => r.json())
      .then(data => setDbStatus(data.mode))
      .catch(() => setDbStatus('offline'));
  };

  useEffect(() => {
    checkDb();
  }, []);
  
  // Remaining states

  const feedbackTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isGlobalScanning, setIsGlobalScanning] = useState(false);
  const [globalScanFeedback, setGlobalScanFeedback] = useState<{ 
    name: string; 
    status: 'present' | 'absent' | 'payment' | 'error'; 
    time: string;
    grade?: string | null;
    whatsappUrl?: string | null;
  } | null>(null);
  const [isHardwareScannerActive, setIsHardwareScannerActive] = useState(true);
  const [scannerStatus, setScannerStatus] = useState<'connected' | 'disconnected'>('connected');

  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    
    // Local mock auth
    if (authMode === 'login') {
      const savedUser = localStorage.getItem('mock_user_email');
      const savedPass = localStorage.getItem('mock_user_pass');
      if (savedUser === authEmail && savedPass === authPassword) {
        setUser({
          id: 'user_123',
          username: authEmail.split('@')[0],
          email: authEmail,
          role: 'admin',
          permissions: ['all'],
          canModify: true,
          createdAt: new Date().toISOString()
        });
        setIsAuthReady(true);
      } else {
        setAuthError('كلمة المرور أو البريد الإلكتروني غير صحيح.');
      }
    } else {
      localStorage.setItem('mock_user_email', authEmail);
      localStorage.setItem('mock_user_pass', authPassword);
      setUser({
        id: 'user_123',
        username: authEmail.split('@')[0],
        email: authEmail,
        role: 'admin',
        permissions: ['all'],
        canModify: true,
        createdAt: new Date().toISOString()
      });
      setIsAuthReady(true);
    }
  };

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
    receiptFontSize: 'medium' as 'small' | 'medium' | 'large',
    showPreviousPayments: true,
    academicYear: '',
    systemFontFamily: 'Inter',
    systemFontSize: '200%'
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
        showPreviousPayments: selectedSchool.showPreviousPayments ?? true,
        academicYear: (selectedSchool as any).academicYear || '',
        systemFontFamily: selectedSchool.systemFontFamily || 'Inter',
        systemFontSize: selectedSchool.systemFontSize || '200%'
      });
    }
  }, [showEditSchool, selectedSchool]);

  useEffect(() => {
    const savedUserEmail = localStorage.getItem('mock_user_email');
    if (savedUserEmail) {
       setUser({
          id: 'user_local',
          username: savedUserEmail.split('@')[0],
          email: savedUserEmail,
          role: 'admin',
          permissions: GUEST_USER.permissions,
          canModify: true,
          createdAt: new Date().toISOString()
       });
    } else {
       setUser(null);
    }
    setIsAuthReady(true);

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
      setHolidays(localDb.getAll('holidays'));
    };

    window.addEventListener('local-db-update', handleUpdate);
    
    localDb.init().then(() => {
      handleUpdate(); // ensure we get the initial state even if event missed
      setDbLoaded(true);
    });

    return () => {
      window.removeEventListener('local-db-update', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (user && user.permissions && !user.permissions.includes(activeTab)) {
      setActiveTab(user.permissions[0] || 'dashboard');
    }
  }, [user, activeTab]);

  // Dynamic Font Scaling
  useEffect(() => {
    const handleResize = () => {
      // Base design dimensions (e.g., standard 1080p desktop)
      const baseWidth = 1440;
      const baseHeight = 900;
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      
      // Calculate ratio to scale the UI properly
      const scale = Math.min(currentWidth / baseWidth, currentHeight / baseHeight);
      
      // Clamp the scale to prevent text from being too small to read or too large
      const clampedScale = Math.max(0.65, Math.min(scale, 1.4));
      
      // Update the root font size, which scales all Tailwind 'rem' classes dynamically
      document.documentElement.style.fontSize = `${16 * clampedScale}px`;
    };

    handleResize(); // Init on mount
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.documentElement.style.fontSize = '16px'; // Reset on unmount
    };
  }, []);

  // Global Hardware Scanner Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHardwareScannerActive) return;

      // Ignore input focused events to prevent manual typing from triggering scans
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      
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
      } else if (e.key && e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [students, staff, selectedSchoolId, isHardwareScannerActive, attendanceRecords, activeTab]);

  const playScanBeep = (type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (type === 'success') {
        // First chime (ding)
        const osc1 = audioCtx.createOscillator();
        const gainNode1 = audioCtx.createGain();
        osc1.connect(gainNode1);
        gainNode1.connect(audioCtx.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode1.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode1.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.02);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.5);

        // Second chime (dong) higher pitch
        const osc2 = audioCtx.createOscillator();
        const gainNode2 = audioCtx.createGain();
        osc2.connect(gainNode2);
        gainNode2.connect(audioCtx.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.15); // C#6
        gainNode2.gain.setValueAtTime(0, audioCtx.currentTime + 0.15);
        gainNode2.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.17);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
        
        osc2.start(audioCtx.currentTime + 0.15);
        osc2.stop(audioCtx.currentTime + 0.7);
        
      } else {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  const handleGlobalScan = (barcode: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();
    const timeStr = format(new Date(), 'HH:mm:ss');

    // 1. Staff Match (Global across all schools)
    const staffMatch = staff.find(s => s.attendanceBarcode === barcode || s.fingerprintId === barcode);
    if (staffMatch) {
      if (staffMatch.schoolId !== selectedSchoolId) {
        setSelectedSchoolId(staffMatch.schoolId);
      }
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
        time: `${timeStr} ${isFingerprint ? '(بصمة)' : ''}`,
        grade: staffMatch.role
      });
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setGlobalScanFeedback(null), 3000);
      return;
    }

    // 2. Student Match (Global across all schools)
    const studentAttendanceMatch = students.find(s => s.attendanceBarcode === barcode);
    const studentInstallmentMatch = students.find(s => s.installmentBarcode === barcode);
    const studentFingerprintMatch = students.find(s => s.fingerprintId === barcode);
    const studentGenericMatch = students.find(s => s.barcode === barcode);

    if (studentAttendanceMatch || studentInstallmentMatch || studentFingerprintMatch || studentGenericMatch) {
      const student = studentAttendanceMatch || studentInstallmentMatch || studentFingerprintMatch || studentGenericMatch!;
      
      if (student.schoolId !== selectedSchoolId) {
        setSelectedSchoolId(student.schoolId);
      }
      
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
          time: `${timeStr} ${isFingerprint ? '(بصمة)' : ''}`,
          grade: student.grade
        });
      } 
      
      // If it's for installments or generic (payment mode)
      if (studentInstallmentMatch || (studentGenericMatch && activeTab !== 'attendance')) {
        setActivePaymentStudent(student);
        setIsGlobalScanning(false);
        setGlobalScanFeedback({ name: student.name, status: 'payment', time: timeStr, grade: student.grade });
      }
      
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setGlobalScanFeedback(null), 3000);
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

  const schoolHolidays = useMemo(() => 
    (holidays || []).filter(h => h.schoolId === selectedSchoolId),
    [holidays, selectedSchoolId]
  );

  // Global Font Family Application
  useEffect(() => {
    if (selectedSchool?.systemFontFamily) {
      document.documentElement.style.setProperty('--font-sans', selectedSchool.systemFontFamily);
    } else {
      document.documentElement.style.setProperty('--font-sans', 'Inter');
    }
    
    if (selectedSchool?.systemFontSize) {
      document.documentElement.style.setProperty('--system-font-size', selectedSchool.systemFontSize);
    } else {
      document.documentElement.style.setProperty('--system-font-size', '200%');
    }
  }, [selectedSchool?.systemFontFamily, selectedSchool?.systemFontSize]);

  useEffect(() => {
    if (selectedSchool && !selectedSchoolId) {
      setSelectedSchoolId(selectedSchool.id);
    }
  }, [selectedSchool, selectedSchoolId]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    try {
      const gUser = await signInWithGoogle();
      setUser({
        id: gUser.uid,
        username: gUser.displayName || 'مدير النظام',
        email: gUser.email,
        role: 'admin',
        permissions: GUEST_USER.permissions,
        canModify: true,
        createdAt: new Date().toISOString()
      });
      setIsAuthReady(true);
    } catch (error) {
      setAuthError('فشل تسجيل الدخول: ' + (error as Error).message);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('mock_user_email');
      localStorage.removeItem('mock_user_pass');
      await logout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
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
      showPreviousPayments: editSchoolData.showPreviousPayments,
      academicYear: editSchoolData.academicYear,
      systemFontFamily: editSchoolData.systemFontFamily,
      systemFontSize: editSchoolData.systemFontSize
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

  if (!isAuthReady || !dbLoaded) return (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full"></div>
    </div>
  );

  if (dbStatus === 'not_configured') {
    return <DbSetupModal onSuccess={() => { checkDb(); window.location.reload(); }} />;
  }

  if (!user) {
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
              <GraduationCap className="text-white w-10 h-10" />
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-2">نظام المحاسبة المدرسي</h1>
            <p className="text-gray-500 font-bold text-lg">نظام سحابي آمن لإدارة مدرستك</p>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl mb-6">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
              >
                إنشاء حساب جديد
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                تسجيل الدخول
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-[#7f1d1d] focus:border-transparent transition-all outline-none"
                    placeholder="example@school.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">كلمة المرور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-[#7f1d1d] focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full theme-bg text-white py-4 rounded-2xl font-black text-lg hover:opacity-90 transition-all shadow-md active:scale-95"
              >
                {authMode === 'register' ? 'تسجيل كمدير مدرسة' : 'تسجيل الدخول'}
              </button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm font-bold text-gray-400">أو</span>
              </div>
            </div>

            <button
              onClick={() => handleLogin()}
              className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-black text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
              المتابعة باستخدام جوجل
            </button>

            {authError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            
            <p className="text-center text-[11px] font-bold text-gray-400 px-4 mt-6 leading-relaxed">
              بالتسجيل في النظام، أنت توافق على تخزين بيانات مدرستك وسجلاتها بشكل سحابي آمن وتلقائي
            </p>
          </div>

          <div className="mt-12 flex items-center justify-center gap-3 opacity-40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black">تخزين سحابي</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black">مربوط بالاستضافة</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedSchool && !showAddSchool) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-cairo" dir="rtl">
        <div className="text-center space-y-2 animate-in fade-in zoom-in duration-500">
          <div className="bg-red-900 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-red-200 rotate-12">
            <SchoolIcon className="text-white w-6 h-6" />
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
          <h2 className="text-xl font-black text-gray-900 mb-8 text-center">إضافة مدرسة</h2>
          <form onSubmit={handleAddSchool} className="space-y-2">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">اسم المدرسة</label>
              <input
                required
                type="text"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 min-h-[38px] outline-none focus:ring-4 focus:ring-red-100 font-bold"
                placeholder="مثال: مدرسة النخبة الأهلية"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-red-900 text-white py-2 rounded-2xl font-black text-lg hover:bg-red-950 shadow-xl shadow-red-200">
                حفظ المدرسة
              </button>
              <button type="button" onClick={() => setShowAddSchool(false)} className="px-8 bg-gray-100 text-gray-600 py-2 rounded-2xl font-black hover:bg-gray-200">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#f1f5f9] flex items-center justify-center selection:bg-red-100 selection:text-red-900 overflow-hidden" dir="rtl" style={{ 
      ['--primary-theme' as any]: selectedSchool?.themeColor || '#7f1d1d',
      ['--primary-theme-soft' as any]: (selectedSchool?.themeColor || '#7f1d1d') + '10',
      ['--primary-theme-hover' as any]: (selectedSchool?.themeColor || '#7f1d1d') + '20'
    }}>
      {/* Main App Window Container */}
      <div className="w-full h-full bg-white shadow-2xl shadow-slate-200 overflow-hidden flex relative">
        
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container - Integrated inside the Window */}
        <aside 
          className={`shrink-0 h-full z-50 flex flex-col bg-white border-slate-200 transition-all duration-300 overflow-hidden absolute lg:relative
            ${isSidebarOpen ? 'w-[280px] md:w-[340px] translate-x-0 border-l-2 opacity-100' : 'w-0 translate-x-full border-l-0 opacity-0'}
          `}
        >
          <div className="h-full flex flex-col relative w-[280px] md:w-[320px]">
            
            {/* Header & School Selector */}
            <div className="p-5 pb-3 relative z-10 border-b-2 border-slate-100 bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer" onClick={() => setShowEditSchool(true)}>
                  <div 
                    className="p-3 bg-white rounded-xl shadow-sm border-2 border-slate-200 transition-all active:scale-95 flex-shrink-0"
                  >
                    {selectedSchool.logo ? (
                      <img src={selectedSchool.logo} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                    ) : (
                      <GraduationCap className="w-8 h-8 text-indigo-600" />
                    )}
                  </div>
                </div>
                <div className="overflow-hidden flex-1 relative cursor-pointer">
                  <select
                    value={selectedSchoolId || ''}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW_SCHOOL') {
                         setShowAddSchool(true);
                      } else {
                         setSelectedSchoolId(e.target.value);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                    disabled={!user?.canModify}
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    {user?.canModify && (
                      <option value="ADD_NEW_SCHOOL">+ إضافة مدرسة جديدة</option>
                    )}
                  </select>
                  <div className="flex items-center gap-1 hover:bg-slate-200 p-1.5 -ml-1.5 rounded-lg transition-colors">
                    <h1 className="text-xl font-black text-slate-900 leading-tight truncate">{selectedSchool?.name || 'النظام المدرسي'}</h1>
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest px-1.5">نظام الإدارة المدرسي</p>
                </div>
              </div>
            </div>

            {/* Navigation Area */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar space-y-8 overflow-x-hidden relative z-10 bg-slate-50/50">
              {menuGroups.map((group, gIdx) => {
                const isCollapsible = true;
                const isCollapsed = collapsedGroups.includes(group.title);
                
                const toggleGroup = () => {
                  if (isCollapsible) {
                    if (isCollapsed) {
                      // Expand it and collapse others
                      setCollapsedGroups(menuGroups.map(g => g.title).filter(t => t !== group.title));
                    } else {
                      // Collapse it
                      setCollapsedGroups(prev => [...prev, group.title]);
                    }
                  }
                };

                return (
                 <div key={gIdx} className="space-y-4 relative bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 
                    onClick={toggleGroup}
                    className={`px-2 text-2xl font-black flex items-center justify-between transition-all ${isCollapsible ? 'cursor-pointer hover:text-indigo-600' : ''}`} 
                    style={{ color: 'var(--primary-theme)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-md rotate-45" style={{ backgroundColor: 'currentColor' }}></div>
                      {group.title}
                    </div>
                    {isCollapsible && (
                      <svg className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                    )}
                  </h3>
                  
                  <div className={`space-y-2.5 transition-all duration-300 origin-top ${isCollapsible && isCollapsed ? 'h-0 overflow-hidden opacity-0 scale-y-95 mt-0' : 'h-auto opacity-100 scale-y-100 mt-4'}`}>
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.id as Tab)}
                          className={`w-full group flex items-center justify-between gap-4 px-5 py-4 rounded-2xl font-black text-2xl transition-all relative overflow-hidden ${
                            isActive 
                              ? 'text-white shadow-xl scale-[1.02]' 
                              : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100'
                          }`}
                          style={{ 
                            backgroundColor: isActive ? 'var(--primary-theme)' : 'transparent',
                            boxShadow: isActive ? '0 10px 25px -5px var(--primary-theme-hover)' : 'none'
                          }}
                        >
                          <span className="relative z-10 flex items-center gap-4">
                            <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                               <item.icon className={`w-8 h-8 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                            </div>
                            <span className="whitespace-nowrap tracking-wide truncate max-w-[180px]">
                              {item.label}
                            </span>
                          </span>
                          
                          {!isActive && item.id === 'whatsapp' && (
                            <div className="relative w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )})}
            </nav>

            {/* Footer Area */}
            <div className="p-5 mt-auto relative z-10 border-t-2 border-slate-100 bg-slate-50">
              <div className="space-y-3">
                <button
                  onClick={() => setIsHardwareScannerActive(!isHardwareScannerActive)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all relative font-bold ${
                    isHardwareScannerActive 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-all ${isHardwareScannerActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <ScanLine className={`w-5 h-5 ${isHardwareScannerActive ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scanner</p>
                    <p className="text-xs truncate">{isHardwareScannerActive ? 'Online' : 'Offline'}</p>
                  </div>
                </button>

                <div className="flex items-center justify-between gap-3 px-1 pt-1">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-white shadow-sm border-2 border-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-black flex-shrink-0 text-xl">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="text-sm font-black text-slate-900 truncate">{user.username}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{user.role === 'admin' ? 'مدير نظام' : 'حساب موظف'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border-2 border-transparent hover:border-red-100"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>


        {/* Main Content Area - Integrated inside the Window */}
        <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative bg-[#F8FAFC]`}>
          <header className="h-[5.5rem] px-8 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-30 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-800 group hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <Menu className="w-6 h-6" />
              </button>
              {activeTab !== 'dashboard' && (
                <button
                    onClick={handleBack}
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-slate-800 font-bold group hover:bg-slate-100 hover:text-slate-900 transition-all hidden md:flex"
                >
                  <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  <span className="text-xs">الرجوع</span>
                </button>
              )}
              
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                  {allItems.find(i => i.id === activeTab)?.icon && (
                    <div className="text-white p-2.5 rounded-xl shadow-md" style={{ backgroundColor: 'var(--primary-theme)' }}>
                      {React.createElement(allItems.find(i => i.id === activeTab)!.icon, { className: "w-5 h-5" })}
                    </div>
                  )}
                  <span>{allItems.find(i => i.id === activeTab)?.label}</span>
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end px-4 border-r border-slate-100 ml-4">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                  متصل بالنظام
                </span>
                <span className="text-[9px] font-bold text-slate-400">{format(new Date(), 'yyyy/MM/dd')}</span>
              </div>
              
              <button 
                onClick={() => setIsGlobalScanning(true)}
                className="group relative bg-[#020617] text-white pl-6 pr-4 py-2.5 rounded-2xl shadow-lg font-black text-[10px] flex items-center gap-3 transition-all hover:bg-slate-900 active:scale-95 overflow-hidden"
              >
                <div className="w-7 h-7 bg-white/10 group-hover:bg-red-600/20 rounded-lg flex items-center justify-center transition-all duration-500">
                  <ScanLine className="w-4 h-4 text-red-400" />
                </div>
                <span className="tracking-wider uppercase">التحقق الشامل</span>
              </button>
            </div>
          </header>


          {/* Content Frame - The Scrollable Container for pages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 relative">
            <div className="w-full h-full mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
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
                  onNavigate={handleNavigate}
                />
              )}
              {activeTab === 'students' && selectedSchool && (
                <StudentManager 
                  school={selectedSchool} 
                  students={schoolStudents} 
                  canModify={user.canModify}
                  onPay={(studentId) => {
                    setPreSelectedStudentId(studentId);
                    handleNavigate('payments');
                  }}
                />
              )}
              {activeTab === 'add-student' && selectedSchool && (
                <StudentManager 
                  school={selectedSchool} 
                  students={schoolStudents} 
                  canModify={user.canModify}
                  initialMode="add"
                  onPay={(studentId) => {
                    setPreSelectedStudentId(studentId);
                    handleNavigate('payments');
                  }}
                  key="add-student-view"
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
              {activeTab === 'manual-ledger' && selectedSchool && (
                <ManualLedgerManager 
                  school={selectedSchool} 
                  students={schoolStudents}
                  configs={schoolLedgerConfigs}
                  entries={schoolLedgerEntries}
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
                  holidays={schoolHolidays}
                  canModify={user.canModify}
                />
              )}
              {activeTab === 'attendance-reports' && selectedSchool && (
                <AttendanceManager 
                  school={selectedSchool}
                  students={schoolStudents}
                  staff={schoolStaff}
                  attendanceRecords={schoolAttendanceRecords}
                  holidays={schoolHolidays}
                  canModify={user.canModify}
                  initialMode="reports"
                  key="attendance-reports-view"
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
              {activeTab === 'userguide' && <UserGuide />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Overlays and Modals */}
      {isGlobalScanning && (
        <BarcodeScanner 
          onScan={handleGlobalScan}
          onClose={() => setIsGlobalScanning(false)}
        />
      )}

      {activePaymentStudent && selectedSchool && (
        <PaymentModal
          student={activePaymentStudent}
          school={selectedSchool}
          payments={payments}
          onClose={() => setActivePaymentStudent(null)}
        />
      )}
      

      {/* Global Scan Feedback Overlay */}
      {globalScanFeedback && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] animate-in zoom-in-95 fade-in duration-300">
          <div className={`${
            globalScanFeedback.status === 'payment' ? 'bg-blue-600 border-blue-400 font-bold' : 
            globalScanFeedback.status === 'error' ? 'bg-red-600 border-red-400' :
            'bg-emerald-600 border-emerald-400'
          } border-2 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 text-white min-w-[480px] text-center backdrop-blur-sm bg-opacity-95`}>
            <div className="bg-white/20 p-6 rounded-full flex-shrink-0">
              {globalScanFeedback.status === 'payment' ? <CreditCard className="w-20 h-20" /> : 
               globalScanFeedback.status === 'error' ? <XCircle className="w-20 h-20" /> :
               <CheckCircle2 className="w-20 h-20" />}
            </div>
            <div className="flex-1 w-full space-y-2">
              <h4 className="text-4xl font-black mb-2">{globalScanFeedback.name}</h4>
              
              {globalScanFeedback.grade && (
                <div className="text-xl font-bold bg-white/20 py-2 px-6 rounded-full inline-block mb-4">
                  {globalScanFeedback.grade}
                </div>
              )}

              <p className="text-xl font-bold opacity-90 mt-2">
                {globalScanFeedback.status === 'payment' ? 'تم فتح سجل الأقساط' : 
                 globalScanFeedback.status === 'error' ? 'الباركود غير معرف في النظام' :
                 `تم تسجيل الحضور في ${globalScanFeedback.time}`}
              </p>
              {globalScanFeedback.whatsappUrl && (
                <button
                  onClick={() => window.open(globalScanFeedback.whatsappUrl!, '_blank')}
                  className="mt-6 flex items-center justify-center gap-3 bg-white text-emerald-600 px-6 py-4 rounded-2xl text-lg font-black hover:bg-emerald-50 transition-all shadow-sm w-full"
                >
                  <MessageSquare className="w-6 h-6" />
                  إرسال إشعار ولي الأمر
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {showEditSchool && (
        <div className="integrated-page">
          <div className="modal-content">
              <div className="p-10 lg:p-12 border-b border-gray-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none opacity-60" />

                <div className="flex items-center gap-3 text-right relative z-20">
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-4 rounded-2xl text-white shadow-2xl shadow-indigo-200/50 flex items-center justify-center">
                    <Settings className="w-10 h-10 animate-[spin_4s_linear_infinite]" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-relaxed">إعدادات المدرسة والهوية</h2>
                    <p className="text-sm font-bold text-gray-500 mt-2">تهيئة وتكوين الروابط المرجعية وبيانات المؤسسة الأساسية</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-20">
                   <button 
                    onClick={() => setShowEditSchool(false)} 
                    className="p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-400 hover:text-rose-600 border border-slate-100"
                  >
                    <X className="w-10 h-10" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleEditSchool} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-10 lg:p-20 overflow-y-auto custom-scrollbar bg-slate-50/20 space-y-12">
                  <div className="max-w-5xl mx-auto space-y-12">
                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-2">
                      <h3 className="text-lg font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4 text-right">الهوية البصرية والاسم</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                        <div className="flex flex-col items-center gap-3 bg-slate-50/50 p-10 rounded-[3.5rem] border border-dashed border-slate-200 group relative">
                          <div className="w-48 h-48 bg-white rounded-[3rem] flex items-center justify-center overflow-hidden border-8 border-white shadow-2xl relative">
                            {editSchoolData.logo ? (
                              <img src={editSchoolData.logo} alt="Preview" className="w-full h-full object-contain p-4" />
                            ) : (
                              <SchoolIcon className="text-slate-200 w-20 h-20 group-hover:scale-110 transition-transform duration-500" />
                            )}
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="text-white w-10 h-10" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">شعار المدرسة الرسمي</p>
                            <span className="text-sm font-black text-indigo-600 bg-white px-8 py-3 rounded-2xl shadow-sm border border-slate-100">تحميل شعار جديد</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-black text-slate-400 mb-3 px-4 uppercase tracking-widest text-right">لون الهوية البصرية (Theme)</label>
                            <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                              <input
                                type="color"
                                value={editSchoolData.themeColor}
                                onChange={(e) => setEditSchoolData(prev => ({ ...prev, themeColor: e.target.value }))}
                                className="w-10 h-10 bg-transparent border-none outline-none cursor-pointer p-0 appearance-none rounded-2xl overflow-hidden shadow-lg"
                              />
                              <input
                                type="text"
                                value={editSchoolData.themeColor}
                                onChange={(e) => setEditSchoolData(prev => ({ ...prev, themeColor: e.target.value }))}
                                className="flex-1 bg-transparent border-none outline-none font-mono text-xl font-black text-slate-600 text-left"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-black text-slate-400 mb-3 px-4 uppercase tracking-widest text-right">اسم المدرسة الرسمي</label>
                            <input
                              required
                              type="text"
                              value={editSchoolData.name}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-8 py-6 outline-none focus:ring-8 focus:ring-slate-100 font-black text-lg text-slate-800 transition-all text-right shadow-inner"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-black text-slate-400 mb-3 px-4 uppercase tracking-widest text-right">العام الدراسي</label>
                            <input
                              type="text"
                              value={editSchoolData.academicYear || ''}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, academicYear: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-8 py-6 outline-none focus:ring-8 focus:ring-slate-100 font-black text-lg text-slate-800 transition-all text-right shadow-inner"
                              placeholder="مثال: 2025-2026"
                            />
                          </div>

                          <div className="col-span-1">
                            <label className="block text-xs font-black text-slate-400 mb-3 px-4 uppercase tracking-widest text-right">خط النظام</label>
                            <div className="relative">
                              <select
                                value={editSchoolData.systemFontFamily || 'Inter'}
                                onChange={(e) => {
                                  setEditSchoolData(prev => ({ ...prev, systemFontFamily: e.target.value }));
                                }}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-8 py-6 outline-none focus:ring-8 focus:ring-slate-100 font-black text-lg text-slate-800 transition-all text-right shadow-inner appearance-none cursor-pointer"
                                style={{ fontFamily: editSchoolData.systemFontFamily || 'Inter' }}
                              >
                                <option value="Inter" style={{ fontFamily: 'Inter' }}>Inter (الافتراضي)</option>
                                <option value="'Cairo', sans-serif" style={{ fontFamily: "'Cairo', sans-serif" }}>Cairo (كايرو)</option>
                                <option value="'Tajawal', sans-serif" style={{ fontFamily: "'Tajawal', sans-serif" }}>Tajawal (تجوال)</option>
                                <option value="'Almarai', sans-serif" style={{ fontFamily: "'Almarai', sans-serif" }}>Almarai (المراعي)</option>
                                <option value="'Changa', sans-serif" style={{ fontFamily: "'Changa', sans-serif" }}>Changa (تشانجا)</option>
                                <option value="'Readex Pro', sans-serif" style={{ fontFamily: "'Readex Pro', sans-serif" }}>Readex Pro</option>
                              </select>
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                              </div>
                            </div>
                          </div>

                          <div className="col-span-1">
                            <label className="block text-xs font-black text-slate-400 mb-3 px-4 uppercase tracking-widest text-right">حجم خط النظام</label>
                            <div className="relative">
                              <select
                                value={editSchoolData.systemFontSize || '200%'}
                                onChange={(e) => {
                                  setEditSchoolData(prev => ({ ...prev, systemFontSize: e.target.value }));
                                }}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-8 py-6 outline-none focus:ring-8 focus:ring-slate-100 font-black text-lg text-slate-800 transition-all text-right shadow-inner appearance-none cursor-pointer"
                              >
                                <option value="160%">صغير (160%)</option>
                                <option value="180%">متوسط (180%)</option>
                                <option value="200%">الافتراضي (200%)</option>
                                <option value="220%">كبير (220%)</option>
                                <option value="240%">كبير جداً (240%)</option>
                                <option value="260%">ضخم (260%)</option>
                                <option value="300%">عملاق (300%)</option>
                              </select>
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-2">
                      <h3 className="text-lg font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4 text-right">معلومات التواصل والوقت</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-black text-slate-400 mb-3 px-4 uppercase tracking-widest text-right">رقم الهاتف الأساسي</label>
                            <input
                              type="text"
                              value={editSchoolData.phone}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-8 py-5 outline-none focus:ring-8 focus:ring-slate-100 font-black text-xl text-slate-700 text-right shadow-inner"
                              placeholder="أدخل رقم هاتف المدرسة..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-slate-400 mb-3 px-4 uppercase tracking-widest text-right">العنوان الجغرافي</label>
                            <input
                              type="text"
                              value={editSchoolData.address}
                              onChange={(e) => setEditSchoolData(prev => ({ ...prev, address: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-8 py-5 outline-none focus:ring-8 focus:ring-slate-100 font-black text-xl text-slate-700 text-right shadow-inner"
                              placeholder="أدخل عنوان المدرسة بالتفصيل..."
                            />
                          </div>
                        </div>

                        <div className="bg-indigo-50/50 p-10 rounded-[3rem] border border-indigo-100 space-y-2">
                          <p className="text-xs font-black text-indigo-400 uppercase text-center tracking-[0.3em]">توقيتات الدوام الرسمي</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center">
                              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">بداية الدوام</label>
                              <input
                                type="time"
                                value={editSchoolData.shiftStartTime}
                                onChange={(e) => setEditSchoolData(prev => ({ ...prev, shiftStartTime: e.target.value }))}
                                className="w-full bg-white border border-slate-100 rounded-2xl px-3 py-1.5 min-h-[38px] outline-none font-black text-lg text-slate-700 shadow-sm text-center"
                              />
                            </div>
                            <div className="text-center">
                              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">نهاية الدوام</label>
                              <input
                                type="time"
                                value={editSchoolData.shiftEndTime}
                                onChange={(e) => setEditSchoolData(prev => ({ ...prev, shiftEndTime: e.target.value }))}
                                className="w-full bg-white border border-slate-100 rounded-2xl px-3 py-1.5 min-h-[38px] outline-none font-black text-lg text-slate-700 shadow-sm text-center"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl space-y-10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-[100px]"></div>
                      <div className="flex items-center gap-2 mb-4 relative z-10">
                        <div className="p-4 bg-white/10 rounded-2xl">
                          <DollarSign className="w-6 h-6 text-indigo-300" />
                        </div>
                        <h3 className="text-lg font-black text-white">إعدادات السمة المالية والوصولات</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-3 px-4 uppercase tracking-[0.3em] text-right">رقم محفظة زين كاش</label>
                          <input
                            type="text"
                            value={editSchoolData.zainCashNumber}
                            onChange={(e) => setEditSchoolData(prev => ({ ...prev, zainCashNumber: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:ring-8 focus:ring-white/5 font-black text-xl text-indigo-100 text-right shadow-inner"
                            placeholder="أدخل رقم المحفظة لظهوره في الوصولات..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 mb-3 px-4 uppercase tracking-[0.3em] text-right">رابط الدفع المباشر</label>
                          <input
                            type="url"
                            value={editSchoolData.quickPaymentLink}
                            onChange={(e) => setEditSchoolData(prev => ({ ...prev, quickPaymentLink: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:ring-8 focus:ring-white/5 font-black text-xl text-indigo-100 text-left shadow-inner"
                            placeholder="https://pay.link/..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-10 border-t border-white/10 relative z-10">
                         <label className="block text-[10px] font-black text-slate-400 mb-2 px-4 uppercase tracking-[0.4em] text-right">نمط وصل القبض والطباعة</label>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                              <label className="block text-[9px] font-black text-slate-500 mb-3 uppercase text-right">حجم الخط في الطباعة</label>
                              <select
                                value={editSchoolData.receiptFontSize}
                                onChange={(e) => setEditSchoolData(prev => ({ ...prev, receiptFontSize: e.target.value as any }))}
                                className="w-full bg-transparent border-none text-base font-black outline-none cursor-pointer p-0 text-white"
                              >
                                <option value="small" className="text-slate-900">حجم خط صغير (S)</option>
                                <option value="medium" className="text-slate-900">حجم خط متوسط (M)</option>
                                <option value="large" className="text-slate-900">حجم خط كبير (L)</option>
                              </select>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setEditSchoolData(prev => ({ ...prev, showPreviousPayments: !prev.showPreviousPayments }))}
                              className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all"
                            >
                              <span className="text-[11px] font-black text-slate-200">إظهار الدفعات السابقة</span>
                              <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${editSchoolData.showPreviousPayments ? 'bg-indigo-500' : 'bg-white/20'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSchoolData.showPreviousPayments ? 'right-7' : 'right-1'}`}></div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditSchoolData(prev => ({ ...prev, autoPrintReceipt: !prev.autoPrintReceipt }))}
                              className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all"
                            >
                              <span className="text-[11px] font-black text-slate-200">الطباعة الآلية عند الحفظ</span>
                              <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${editSchoolData.autoPrintReceipt ? 'bg-indigo-500' : 'bg-white/20'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSchoolData.autoPrintReceipt ? 'right-7' : 'right-1'}`}></div>
                              </div>
                            </button>
                         </div>

                         <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div className="space-y-2">
                                 <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase text-right">ألوان ترويسة الوصل</label>
                                 <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <input type="color" value={editSchoolData.receiptHeaderColor} onChange={(e) => setEditSchoolData(prev => ({ ...prev, receiptHeaderColor: e.target.value }))} className="w-6 h-6 rounded-xl cursor-pointer bg-transparent border-none shadow-lg" />
                                    <span className="text-xl font-mono text-indigo-200">{editSchoolData.receiptHeaderColor}</span>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase text-right">ألوان نصوص الوصل</label>
                                 <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <input type="color" value={editSchoolData.receiptTextColor} onChange={(e) => setEditSchoolData(prev => ({ ...prev, receiptTextColor: e.target.value }))} className="w-6 h-6 rounded-xl cursor-pointer bg-transparent border-none shadow-lg" />
                                    <span className="text-xl font-mono text-indigo-200">{editSchoolData.receiptTextColor}</span>
                                 </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase text-right px-4">ملاحظات ختامية تظهر أسفل كل وصل</label>
                              <input
                                type="text"
                                value={editSchoolData.receiptNote}
                                onChange={(e) => setEditSchoolData(prev => ({ ...prev, receiptNote: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-5 outline-none focus:ring-4 focus:ring-indigo-500/30 font-bold text-lg text-indigo-100 text-right"
                                placeholder="مثال: يرجى الاحتفاظ بالوصل لغرض المراجعة..."
                              />
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditSchoolData(prev => ({ ...prev, autoAbsenceCheckEnabled: !prev.autoAbsenceCheckEnabled }))}
                        className={`p-10 rounded-[4rem] flex items-center justify-between border transition-all ${
                          editSchoolData.autoAbsenceCheckEnabled 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-xl' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="text-right">
                          <h4 className="text-xl font-black flex items-center gap-2">
                            <div className={`p-2 rounded-xl ${editSchoolData.autoAbsenceCheckEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            معالجة وتدقيق الغياب تلقائياً
                          </h4>
                          <p className={`text-sm font-bold mt-2 pr-12 ${editSchoolData.autoAbsenceCheckEnabled ? 'text-indigo-600/70' : 'text-slate-400'}`}>
                            النظام سيقوم تلقائياً بإخطار أولياء الأمور عبر الواتساب في حال عدم تسجيل بصمة الطالب عند فحص الغياب
                          </p>
                        </div>
                        <div className={`w-16 h-8 rounded-full transition-all relative ${editSchoolData.autoAbsenceCheckEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${editSchoolData.autoAbsenceCheckEnabled ? 'right-9' : 'right-1'}`}></div>
                        </div>
                      </button>


                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-10 rounded-[4rem] flex items-center justify-between border border-rose-100 bg-rose-50/30 text-rose-600 hover:bg-rose-50 transition-all group shadow-sm hover:shadow-xl"
                      >
                        <div className="text-right">
                          <h4 className="text-xl font-black flex items-center gap-2">
                            <div className="p-2 bg-rose-100 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
                              <Trash2 className="w-6 h-6" />
                            </div>
                            حذف المدرسة نهائياً من النظام
                          </h4>
                          <p className="text-sm font-bold mt-2 pr-12 opacity-60">
                            سيقوم هذا الإجراء بمسح كافة سجلات الطلاب والبيانات المالية والنسخ الاحتياطية لهذه المدرسة
                            {schools.length === 1 && " (تنبيه: هذه هي المدرسة الوحيدة في النظام)"}
                          </p>
                        </div>
                        <div className="w-6 h-6 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-125 transition-transform border border-rose-50">
                          <Trash2 className="w-6 h-6" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-10 bg-white border-t border-slate-100 flex items-center justify-center sticky bottom-0 z-30">
                  <button type="submit" className="w-full max-w-xl theme-bg text-white py-8 rounded-2xl font-black text-lg theme-shadow hover:scale-[1.02] transition-all active:scale-[0.98] transform shadow-2xl flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-10 h-10" />
                    حفظ وتركيب كافة الإعدادات الحالية
                  </button>
                </div>
              </form>
            </div>
          </div>
          )}

      {/* Delete School Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="integrated-page">
          <div key="delete-school-modal" className="modal-content">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -translate-y-16 translate-x-16 blur-2xl opacity-50"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-rose-100 rotate-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-4">تأكيد حذف المدرسة النهائية</h3>
              <p className="text-slate-500 font-bold mb-10 leading-relaxed text-lg max-w-md mx-auto">
                هل أنت متأكد من حذف <span className="text-rose-600 font-black">"{selectedSchool?.name}"</span>؟ 
                <br />
                سيقوم هذا الإجراء بمسح كافة السجلات والبيانات نهائياً.
              </p>

              <div className="w-full max-w-sm space-y-2">
                <button
                  onClick={() => {
                    if (!selectedSchool) return;
                    
                    const schoolId = selectedSchool.id;
                    const schoolStudentIds = localDb.getAll('students')
                      .filter(s => s.schoolId === schoolId)
                      .map(s => s.id);
                    const schoolStaffIds = localDb.getAll('staff')
                      .filter(s => s.schoolId === schoolId)
                      .map(s => s.id);

                    // 1. Delete payments and notifications for these students
                    const payments = localDb.getAll('payments');
                    payments.forEach(p => {
                      if (schoolStudentIds.includes(p.studentId)) localDb.delete('payments', p.id);
                    });

                    const notifications = localDb.getAll('parentNotifications');
                    notifications.forEach(n => {
                      if (schoolStudentIds.includes(n.studentId)) localDb.delete('parentNotifications', n.id);
                    });

                    // 2. Delete staff payments and invoices
                    const staffPayments = localDb.getAll('staffPayments');
                    staffPayments.forEach(sp => {
                      if (schoolStaffIds.includes(sp.staffId)) localDb.delete('staffPayments', sp.id);
                    });

                    const staffInvoices = localDb.getAll('staffInvoices');
                    staffInvoices.forEach(si => {
                      if (schoolStaffIds.includes(si.staffId)) localDb.delete('staffInvoices', si.id);
                    });

                    // 3. Delete collections with schoolId
                    const collectionsWithSchoolId = [
                      'students', 'staff', 'expenses', 'manualLedgerConfigs', 
                      'manualLedgerEntries', 'expenseCategories', 'attendanceRecords', 
                      'investorPayments', 'whatsAppSettings', 'whatsAppTemplates', 'holidays'
                    ] as const;

                    collectionsWithSchoolId.forEach(col => {
                      const items = localDb.getAll(col as any);
                      items.forEach((item: any) => {
                        if (item.schoolId === schoolId) localDb.delete(col as any, item.id);
                      });
                    });

                    // 4. Delete the school itself
                    localDb.delete('schools', schoolId);
                    
                    // Update state
                    const remainingSchools = schools.filter(s => s.id !== schoolId);
                    setSelectedSchoolId(remainingSchools.length > 0 ? remainingSchools[0].id : null);
                    setShowDeleteConfirm(false);
                    setShowEditSchool(false);
                  }}
                  className="w-full bg-rose-600 text-white py-6 rounded-2xl font-black text-xl hover:bg-rose-700 shadow-2xl shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Trash2 className="w-6 h-6" />
                  تأكيد الحذف النهائي
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full bg-slate-100 text-slate-600 py-6 rounded-2xl font-black text-xl hover:bg-slate-200 transition-all shadow-sm"
                >
                  إلغاء الإجراء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <BackgroundBot />
      <ToastContainer />
    </div>
  );
}
