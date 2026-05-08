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
    }
  }
};

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
      variants={containerVars}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Modern Dashboard Header */}
      <motion.div variants={itemVars} className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* School Profile Card */}
        <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex items-center gap-7 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-50/50 rounded-full -translate-y-20 translate-x-20 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
          <motion.div 
            whileHover={{ rotate: 0, scale: 1.05 }}
            className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl overflow-hidden shrink-0 relative z-10 p-4 border-4 border-white rotate-6 transition-all duration-500" 
            style={{ backgroundColor: 'var(--primary-theme)', boxShadow: '0 20px 25px -5px var(--primary-theme-hover)' }}
          >
            {school.logo ? (
              <img src={school.logo} alt={school.name} className="w-full h-full object-contain" />
            ) : (
              <SchoolIcon className="text-white w-10 h-10" />
            )}
          </motion.div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-black text-slate-950 tracking-tight">{school.name}</h1>
              <div className="theme-bg-soft theme-text text-[9px] font-black px-4 py-1.5 rounded-full border theme-border-soft uppercase tracking-[0.2em] whitespace-nowrap">Dashboard</div>
            </div>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-slate-400 font-bold text-sm">
              <p className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 opacity-30" style={{ color: 'var(--primary-theme)' }} />
                <span className="text-slate-500">{format(new Date(), 'EEEE, d MMMM yyyy', { locale: ar })}</span>
              </p>
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
              <p className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-300" />
                <span className="text-slate-500 font-black">{stats.studentCount} طالب مسجل</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Balance Overview */}
        <div className="flex flex-col sm:flex-row gap-4 lg:w-[450px]">
          <div className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] group-hover:scale-110 transition-transform duration-700"></div>
            <p className="text-emerald-100 font-black text-xs uppercase tracking-widest mb-2 relative z-10">الرصيد الكلي</p>
            <div className="flex items-end justify-between relative z-10">
              <h2 className="text-3xl font-black">{formatCurrency(stats.netProfit)}</h2>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm group hover:border-blue-200 transition-colors">
            <p className="text-gray-400 font-black text-xs uppercase tracking-widest mb-2">إيرادات الشهر</p>
            <div className="flex items-end justify-between">
              <h2 className="text-3xl font-black text-gray-900">{formatCurrency(stats.monthlyIncome)}</h2>
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Action Navigation Buttons */}
      <motion.div variants={itemVars} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
        <motion.button 
          whileHover={{ y: -5, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('students')}
          className="flex items-center justify-between p-7 bg-slate-950 rounded-[2.2rem] text-white shadow-2xl shadow-slate-900/10 group hover:bg-slate-900 transition-all border border-slate-800"
        >
          <div className="flex items-center gap-5">
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7 text-red-500" />
            </div>
            <div className="text-right">
              <h3 className="text-xl font-black">إضافة طالب جديد</h3>
              <p className="text-slate-400 text-xs font-bold mt-1">تسجيل وإصدار الهوية تلقائياً</p>
            </div>
          </div>
          <div className="bg-white/5 w-10 h-10 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all group-hover:rotate-90">
            <Plus className="w-6 h-6" />
          </div>
        </motion.button>

        <motion.button 
          whileHover={{ y: -5, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('payments')}
          className="flex items-center justify-between p-7 rounded-[2.2rem] text-white shadow-2xl transition-all border hover:opacity-95"
          style={{ 
            backgroundColor: 'var(--primary-theme)',
            boxShadow: '0 20px 25px -5px var(--primary-theme-hover)',
            borderColor: 'var(--primary-theme)'
          }}
        >
          <div className="flex items-center gap-5">
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md group-hover:scale-110 transition-transform">
              <CreditCard className="w-7 h-7" />
            </div>
            <div className="text-right">
              <h3 className="text-xl font-black">دفع قسط مالي</h3>
              <p className="text-white/60 text-xs font-bold mt-1">تسجيل المدفوعات وطباعة الوصل</p>
            </div>
          </div>
          <div className="bg-white/5 w-10 h-10 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all group-hover:translate-y-[-2px]">
            <DollarSign className="w-6 h-6" />
          </div>
        </motion.button>
      </motion.div>

      {/* Main Stats Bento Grid */}
      <motion.div variants={itemVars} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Card */}
        <motion.div 
          whileHover={{ y: -8, scale: 1.02 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute -bottom-6 -right-6 w-24 h-24 theme-bg-soft rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="theme-bg-soft p-4 rounded-2xl theme-text group-hover:theme-bg group-hover:text-white transition-colors shadow-sm">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-end">
               <span className="text-emerald-600 text-[10px] font-black bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                 <ArrowUpRight className="w-3 h-3" />
                 12%
               </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 font-black mb-1 relative z-10">إجمالي المقبوضات</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <h3 className="text-3xl font-black text-gray-900">{formatCurrency(stats.totalIncome)}</h3>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 relative z-10">
             <div className="flex -space-x-2 rtl:space-x-reverse">
                {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white theme-bg-soft shrink-0"></div>)}
             </div>
             <span className="text-[10px] text-gray-400 font-bold">آخر 3 دفعات اليوم</span>
          </div>
        </motion.div>

        {/* Expenses Card */}
        <motion.div 
          whileHover={{ y: -8, scale: 1.02 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute -bottom-6 -right-6 w-24 h-24 theme-bg-soft rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="theme-bg-soft p-4 rounded-2xl theme-text group-hover:theme-bg group-hover:text-white transition-colors shadow-sm">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-end">
               <span className="text-red-600 text-[10px] font-black bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 flex items-center gap-1">
                 <ArrowDownRight className="w-3 h-3" />
                 8%
               </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 font-black mb-1 relative z-10">المصاريف الكلية</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <h3 className="text-3xl font-black text-gray-900">{formatCurrency(stats.totalExpenses)}</h3>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 relative z-10">
             <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "65%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="theme-bg h-full rounded-full"
                ></motion.div>
             </div>
             <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400 font-bold">نسبة من الإيراد</span>
                <span className="text-[10px] theme-text font-black">65%</span>
             </div>
          </div>
        </motion.div>

        {/* Student Attendance Card */}
        <motion.div 
          whileHover={{ y: -8, scale: 1.02 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-full h-full bg-emerald-50/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="bg-emerald-50 px-3 py-1 rounded-full">
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">مباشر الآن</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 font-black mb-1 relative z-10">حضور الطلاب اليوم</p>
          <div className="flex items-center gap-3 relative z-10">
            <h3 className="text-4xl font-black text-emerald-600">{stats.presentCount}</h3>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold leading-none">طالب حاضر</span>
              <span className="text-[10px] text-red-400 font-bold">غائب: {stats.absentCount}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 flex gap-1 relative z-10">
             {Array.from({length: 12}).map((_, i) => (
                <motion.div 
                  key={i} 
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.1 * i, duration: 0.3 }}
                  className={`flex-1 h-3 rounded-sm ${i < (stats.presentCount / (stats.studentCount || 1)) * 12 ? 'bg-emerald-500' : 'bg-gray-100'}`}
                ></motion.div>
             ))}
          </div>
        </motion.div>

        {/* Staff Card */}
        <motion.div 
          whileHover={{ y: -8, scale: 1.02 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-full h-full bg-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="bg-purple-50 p-4 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex gap-2 relative z-10">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    {stats.staffPresentCount}
                  </span>
                  <span className="text-[10px] font-black text-red-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                    {stats.staffAbsentCount}
                  </span>
               </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 font-black mb-1 relative z-10">إجمالي الكادر الوظيفي</p>
          <div className="flex items-center gap-3 relative z-10">
            <h3 className="text-4xl font-black text-gray-900">{stats.staffCount}</h3>
            <span className="text-xs text-gray-400 font-bold">موظف مفعل</span>
          </div>
          <div className="mt-6 flex items-center gap-2 relative z-10">
             <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.staffPresentCount / (stats.staffCount || 1)) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-purple-500 transition-all duration-500" 
                ></motion.div>
             </div>
             <span className="text-[10px] font-black text-purple-600">{Math.round((stats.staffPresentCount / (stats.staffCount || 1)) * 100)}%</span>
          </div>
        </motion.div>
      </motion.div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={itemVars} className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black mb-8 flex items-center gap-2">
              <Calendar className="text-blue-600" />
              تحليل الإيرادات والمصاريف (6 أشهر)
            </h3>
            <div className="h-[350px] w-full relative">
              <ResponsiveContainer width="100%" height={350} minWidth={0} minHeight={0}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                  />
                  <Area type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" name="الإيرادات" />
                  <Area type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={4} fillOpacity={1} fill="url(#colorExpenses)" name="المصاريف" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black mb-8 flex items-center gap-2">
              <CreditCard className="text-blue-600" />
              مقارنة شهرية
            </h3>
            <div className="h-[350px] w-full relative">
              <ResponsiveContainer width="100%" height={350} minWidth={0} minHeight={0}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="income" fill="#2563eb" radius={[6, 6, 0, 0]} name="الإيرادات" />
                  <Bar dataKey="expenses" fill="#dc2626" radius={[6, 6, 0, 0]} name="المصاريف" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVars} className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Bell className="text-blue-600 w-5 h-5" />
                آخر الإشعارات
              </h3>
              <button className="text-blue-600 text-xs font-black hover:underline px-2">الكل</button>
            </div>
            <div className="space-y-4">
              {recentNotifications.length > 0 ? (
                recentNotifications.map(n => {
                  const student = students.find(s => s.id === n.studentId);
                  return (
                    <motion.div 
                      key={n.id} 
                      whileHover={{ x: -4 }}
                      className="flex gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        n.type === 'attendance' ? 'bg-emerald-50 text-emerald-600' :
                        n.type === 'absence' ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {n.type === 'attendance' ? <CheckCircle className="w-5 h-5" /> :
                         n.type === 'absence' ? <XCircle className="w-5 h-5" /> :
                         <Bell className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-black text-gray-900 truncate">{student?.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold line-clamp-1">{n.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span className="text-[10px] text-gray-400 font-bold">{format(new Date(n.date), 'HH:mm')}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-8 opacity-20">
                  <Bell className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm font-black">لا يوجد إشعارات</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                <Users className="w-6 h-6" />
                تحليل الغياب اليوم
              </h3>
              <p className="text-blue-100 font-bold text-xs mb-6">إجمالي {stats.absentCount} طالب لم يسجلوا حضوراً بعد</p>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-black">نسبة الحضور</span>
                  <span className="text-xl font-black">
                    {Math.round((stats.presentCount / (stats.studentCount || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-1000" 
                    style={{ width: `${(stats.presentCount / (stats.studentCount || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <button className="w-full bg-white text-blue-600 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                <ExternalLink className="w-4 h-4" />
                عرض قائمة الغياب
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black mb-6">روابط سريعة</h3>
            <div className="grid grid-cols-1 gap-3">
              <motion.button 
                whileHover={{ x: -8, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('payments')}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all group w-full text-right"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-black">إضافة دفعة مالية</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
              <motion.button 
                whileHover={{ x: -8, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('attendance')}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all group w-full text-right"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-black">تسجيل حضور سريع</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
              <motion.button 
                whileHover={{ x: -8, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('idcards')}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all group w-full text-right"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-black">إصدار تقرير هويات</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

