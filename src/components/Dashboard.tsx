import { useMemo } from 'react';
import { motion, Variants } from 'motion/react';
import { School, Student, Payment, Staff, StaffPayment, StaffInvoice, GeneralExpense, AttendanceRecord, AttendanceStatus, ParentNotification } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
  Bell,
  Clock,
  ExternalLink,
  ChevronRight,
  FileText,
  Plus,
  School as SchoolIcon
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DashboardProps {
  school: School;
  students: Student[];
  payments: Payment[];
  staff: Staff[];
  staffPayments: StaffPayment[];
  staffInvoices: StaffInvoice[];
  expenses: GeneralExpense[];
  attendanceRecords: AttendanceRecord[];
  notifications: ParentNotification[];
  onNavigate: (tab: any) => void;
}

const containerVars: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
}}};

const itemVars: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function Dashboard({ 
  school, 
  students, 
  payments, 
  staff, 
  staffPayments, 
  staffInvoices, 
  expenses,
  attendanceRecords,
  notifications,
  onNavigate
}: DashboardProps) {
  const stats = useMemo(() => {
    const totalIncome = (payments || []).reduce((sum, p) => sum + p.amount, 0);
    const totalSalaries = (staffPayments || []).reduce((sum, p) => sum + p.amount, 0);
    const totalInvoices = (staffInvoices || []).reduce((sum, i) => sum + i.amount, 0);
    const totalGeneralExpenses = (expenses || []).reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalSalaries + totalInvoices + totalGeneralExpenses;
    const netProfit = totalIncome - totalExpenses;

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    const monthlyIncome = (payments || [])
      .filter(p => isWithinInterval(new Date(p.date), { start: currentMonthStart, end: currentMonthEnd }))
      .reduce((sum, p) => sum + p.amount, 0);

    const todayAttendance = (attendanceRecords || []).filter(r => isToday(new Date(r.date)) && r.type === 'student');
    const presentCount = todayAttendance.filter(r => r.status === 'present').length;
    const absentCount = (students || []).length - presentCount;

    const todayStaffAttendance = (attendanceRecords || []).filter(r => isToday(new Date(r.date)) && r.type === 'staff');
    const staffPresentCount = todayStaffAttendance.filter(r => r.status === 'present').length;
    const staffAbsentCount = (staff || []).length - staffPresentCount;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      monthlyIncome,
      studentCount: (students || []).length,
      staffCount: (staff || []).length,
      presentCount,
      absentCount,
      staffPresentCount,
      staffAbsentCount
    };
  }, [students, payments, staff, staffPayments, staffInvoices, expenses, attendanceRecords]);

  const recentNotifications = useMemo(() => {
    return (notifications || [])
      .filter(n => {
        const student = students.find(s => s.id === n.studentId);
        return student && student.schoolId === school.id;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [notifications, students, school.id]);

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthName = format(date, 'MMM');

      const income = (payments || [])
        .filter(p => isWithinInterval(new Date(p.date), { start, end }))
        .reduce((sum, p) => sum + p.amount, 0);

      const monthlyExpenses = [
        ...(staffPayments || []).filter(p => isWithinInterval(new Date(p.date), { start, end })),
        ...(staffInvoices || []).filter(i => isWithinInterval(new Date(i.date), { start, end })),
        ...(expenses || []).filter(e => isWithinInterval(new Date(e.date), { start, end }))
      ].reduce((sum, item) => sum + item.amount, 0);

      return { name: monthName, income, expenses: monthlyExpenses };
    });
  }, [payments, staffPayments, staffInvoices, expenses]);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      className="space-y-4 p-2 lg:p-6 pb-24"
    >
      {/* Header Section (Greeting + Dark Net Profit Card) */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Welcome Card */}
        <div className="flex-[2] bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-64 h-64 bg-slate-100 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none"></div>
          
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 outline outline-1 outline-slate-200/60 rounded-full text-xs font-bold tracking-wide uppercase">مرحباً بك مجدداً</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(), 'EEEE, d MMM yyyy', { locale: ar })}
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mt-4">
                {school.name}
              </h1>
              <p className="text-base text-slate-500 font-medium max-w-lg mt-3 leading-relaxed">
                لوحة تحكم تفاعلية لإدارة عمليات المدرسة، الطلاب، والموظفين بكل سهولة.
              </p>
            </div>
            <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center overflow-hidden border border-slate-100 rotate-3 z-10 shrink-0">
              {school.logo ? (
                <img src={school.logo} alt={school.name} className="w-full h-full object-contain p-2" />
              ) : (
                <SchoolIcon className="text-slate-300 w-10 h-10" />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-8 z-10 relative">
            <button onClick={() => onNavigate('students')} className="bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-lg shadow-slate-900/20">
              <Plus className="w-5 h-5" />
              إضافة طالب جديد
            </button>
            <button onClick={() => onNavigate('payments')} className="bg-white text-slate-700 border border-slate-200 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 hover:text-slate-900 transition-all hover:-translate-y-0.5 shadow-sm">
              <CreditCard className="w-5 h-5" />
              تسجيل دفعة
            </button>
          </div>
        </div>

        {/* Premium Dark Summary Card */}
        <div className="flex-1 bg-slate-950 rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.01)_100%)] pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-400 font-bold text-sm uppercase tracking-widest">صافي الإيرادات</h2>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            
            <h3 className="text-5xl font-black tracking-tight tabular-nums mt-2">
              {formatCurrency(stats.netProfit)}
            </h3>
            <div className="flex items-center gap-2 mt-4 text-emerald-400 text-sm font-bold bg-emerald-400/10 w-max px-3 py-1.5 rounded-lg border border-emerald-400/20">
              <ArrowUpRight className="w-4 h-4" />
              أداء إيجابي هذا الشهر
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-bold mb-1">المدخول الكلي</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(stats.totalIncome)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold mb-1">المصروف الكلي</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(stats.totalExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Grid Stats Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <span className="text-xs font-black text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">هذا الشهر</span>
          </div>
          <h4 className="text-slate-500 font-bold text-sm mb-1">إيرادات الشهر الحالي</h4>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{formatCurrency(stats.monthlyIncome)}</p>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <span className="text-xs font-black text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">تحليل</span>
          </div>
          <h4 className="text-slate-500 font-bold text-sm mb-1">نسبة المصروفات للإيرادات</h4>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0}%
          </p>
        </div>

        {/* Students Stats */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
          </div>
          <h4 className="text-slate-500 font-bold text-sm mb-1">حضور الطلاب اليوم</h4>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.presentCount}</p>
            <p className="text-xs font-bold text-slate-400">من أصل {stats.studentCount}</p>
          </div>
        </div>

        {/* Staff Stats */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            </div>
          </div>
          <h4 className="text-slate-500 font-bold text-sm mb-1">دوام الموظفين</h4>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.staffPresentCount}</p>
            <p className="text-xs font-bold text-slate-400">من أصل {stats.staffCount}</p>
          </div>
        </div>
      </div>

      {/* Main Bottom Section: Chart + Notifications */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Charts Container */}
        <div className="xl:col-span-2 flex flex-col gap-4">
           {/* Area Chart */}
           <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm">
             <h3 className="text-xl font-black mb-8 text-slate-900 flex items-center gap-3">
               <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
               </div>
               مؤشر الإيرادات والمصروفات (6 أشهر)
             </h3>
             <div className="h-[320px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorIncomeNew" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorExpensesNew" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                       <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} dx={-10} width={80} />
                   <Tooltip 
                     contentStyle={{borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                     itemStyle={{fontWeight: 900}}
                   />
                   <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncomeNew)" name="الإيرادات" />
                   <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExpensesNew)" name="المصاريف" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-4">
          {/* Notifications */}
          <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                  <Bell className="w-5 h-5" />
                </div>
                آخر الأحداث
              </h3>
            </div>
            
            <div className="space-y-4">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((n, i) => {
                  const student = students.find(s => s.id === n.studentId);
                  return (
                    <div key={n.id} className="flex gap-4 group">
                      <div className="relative flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10 ${
                          n.type === 'attendance' ? 'bg-emerald-100 text-emerald-600' :
                          n.type === 'absence' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {n.type === 'attendance' ? <CheckCircle className="w-4 h-4" /> :
                           n.type === 'absence' ? <XCircle className="w-4 h-4" /> :
                           <Bell className="w-4 h-4" />}
                        </div>
                        {i !== recentNotifications.length - 1 && (
                          <div className="w-px h-full bg-slate-100 absolute top-10 -bottom-4"></div>
                        )}
                      </div>
                      <div className="flex-1 py-1">
                        <p className="text-sm font-bold text-slate-900 leading-none mb-1">{student?.name}</p>
                        <p className="text-xs text-slate-500 font-medium mb-1.5">{n.content}</p>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded inline-block">{format(new Date(n.date), 'hh:mm a')}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center opacity-40">
                  <Bell className="w-10 h-10 mb-3 text-slate-400" />
                  <p className="text-sm font-black text-slate-500">سجل الأحداث هادئ جداً</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links Accent */}
          <div className="bg-[var(--primary-theme)] p-6 lg:p-8 rounded-[2rem] text-white overflow-hidden relative shadow-lg">
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-[40px]"></div>
             <h3 className="text-xl font-black mb-6 relative z-10">إجراءات سريعة</h3>
             <div className="grid grid-cols-2 gap-3 relative z-10">
                <button onClick={() => onNavigate('attendance')} className="bg-white/10 hover:bg-white/20 transition-colors border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center gap-2 group">
                  <CheckCircle className="w-6 h-6 outline-none group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold mt-1">حضور سريع</span>
                </button>
                <button onClick={() => onNavigate('idcards')} className="bg-white/10 hover:bg-white/20 transition-colors border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center gap-2 group">
                  <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold mt-1">إصدار بطاقات</span>
                </button>
                <button onClick={() => onNavigate('reports')} className="bg-white/10 hover:bg-white/20 transition-colors border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center gap-2 group col-span-2">
                  <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span className="text-xs font-bold mt-1">التقارير الشاملة</span>
                </button>
             </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

