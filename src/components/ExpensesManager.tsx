import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { School, GeneralExpense, ExpenseCategory } from '../types';
import { localDb } from '../services/localDb';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Filter,
  X,
  Calendar,
  Tag,
  FileText,
  Printer,
  RefreshCw,
  Repeat,
  Settings2,
  PieChart as PieChartIcon,
  ChevronDown
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format, startOfMonth, isSameDay, subMonths, startOfYear, endOfMonth, isWithinInterval } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ExpensesManagerProps {
  school: School;
  expenses: GeneralExpense[];
  categories: ExpenseCategory[];
  canModify?: boolean;
}

const DEFAULT_CATEGORIES = [
  "إيجار",
  "كهرباء وماء",
  "قرطاسية",
  "صيانة",
  "وقود ومواصلات",
  "تسويق وإعلان",
  "أخرى"
];

const RECURRING_TEMPLATES = [
  { category: 'إيجار', description: 'إيجار البناية الشهري', amount: 500000 },
  { category: 'كهرباء وماء', description: 'فاتورة الكهرباء والماء', amount: 150000 },
  { category: 'أخرى', description: 'خدمات النظافة والأمن', amount: 200000 },
  { category: 'أخرى', description: 'اشتراك الإنترنت الشهري', amount: 50000 }
];

export default function ExpensesManager({ school, expenses, categories, canModify = true }: ExpensesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GeneralExpense | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [showCharts, setShowCharts] = useState(false);
  const [stampConfig, setStampConfig] = useState({
    showAccountant: true,
    showPrincipal: true
  });
  
  const allCategories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...(categories || []).map(c => c.name)];
  }, [categories]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ 
    contentRef: printRef,
    documentTitle: `تقرير مصروفات - ${school.name}`
  });

  const [formData, setFormData] = useState({
    amount: '',
    category: allCategories[0],
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'الكل' || e.category === selectedCategory;
      
      const expenseDate = new Date(e.date);
      const isAfterStart = !startDateFilter || expenseDate >= new Date(startDateFilter);
      const isBeforeEnd = !endDateFilter || expenseDate <= new Date(endDateFilter);
      
      return matchesSearch && matchesCategory && isAfterStart && isBeforeEnd;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, selectedCategory, startDateFilter, endDateFilter]);

  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: GeneralExpense[] } = {};
    filteredExpenses.forEach(expense => {
      const month = format(new Date(expense.date), 'yyyy-MM');
      if (!groups[month]) groups[month] = [];
      groups[month].push(expense);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expenseData = {
      ...formData,
      schoolId: school.id,
      amount: Number(formData.amount),
    };

    if (editingExpense) {
      localDb.update('expenses', editingExpense.id, expenseData);
    } else {
      localDb.add('expenses', expenseData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      amount: '', 
      category: allCategories[0], 
      description: '', 
      date: format(new Date(), 'yyyy-MM-dd') 
    });
    setIsAdding(false);
    setEditingExpense(null);
  };

  const chartData = useMemo(() => {
    const now = new Date();
    let start: Date;
    const end = now;

    if (reportPeriod === 'monthly') {
      start = startOfMonth(now);
    } else if (reportPeriod === 'quarterly') {
      start = subMonths(now, 3);
    } else {
      start = startOfYear(now);
    }

    const periodExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return isWithinInterval(d, { start, end });
    });

    const categoriesMap: { [key: string]: number } = {};
    periodExpenses.forEach(e => {
      categoriesMap[e.category] = (categoriesMap[e.category] || 0) + e.amount;
    });

    const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];
    
    return Object.entries(categoriesMap).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [expenses, reportPeriod]);

  const startEdit = (expense: GeneralExpense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
      date: expense.date.split('T')[0]
    });
    setIsAdding(true);
  };

  const deleteExpense = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المصروفات؟')) {
      localDb.delete('expenses', id);
    }
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    if (allCategories.includes(newCategoryName.trim())) {
      alert('هذا التصنيف موجود بالفعل');
      return;
    }
    localDb.add('expenseCategories', {
      schoolId: school.id,
      name: newCategoryName.trim()
    });
    setNewCategoryName('');
  };

  const deleteCategory = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
      localDb.delete('expenseCategories', id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm('هل أنت متأكد من حذف جميع المصروفات؟ لا يمكن التراجع عن هذا الإجراء.')) {
      expenses.forEach(e => localDb.delete('expenses', e.id));
    }
  };

  const applyTemplate = (template: typeof RECURRING_TEMPLATES[0]) => {
    localDb.add('expenses', {
      schoolId: school.id,
      amount: template.amount,
      category: template.category,
      description: template.description,
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setShowTemplates(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-6 justify-between items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="البحث في المصروفات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-12 pl-6 py-4 focus:ring-4 focus:ring-red-100 outline-none font-bold transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <div className="flex flex-1 lg:flex-none gap-3">
            <div className="relative flex-1">
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-10 pl-4 py-4 focus:ring-4 focus:ring-red-100 outline-none font-bold transition-all text-xs"
                placeholder="من تاريخ"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-10 pl-4 py-4 focus:ring-4 focus:ring-red-100 outline-none font-bold transition-all text-xs"
                placeholder="إلى تاريخ"
              />
            </div>
          </div>

          <div className="relative flex-1 lg:flex-none">
            <Tag className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-10 pl-6 py-4 focus:ring-4 focus:ring-red-100 outline-none font-black text-gray-700 appearance-none text-xs"
            >
              <option value="الكل">جميع الفئات</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          {(startDateFilter || endDateFilter || selectedCategory !== 'الكل') && (
            <button
              onClick={() => {
                setStartDateFilter('');
                setEndDateFilter('');
                setSelectedCategory('الكل');
              }}
              className="bg-gray-100 text-gray-500 px-4 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all"
              title="مسح الفلاتر"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {canModify && (
            <>
              <button
                onClick={() => setShowCategoryManager(true)}
                className="bg-gray-50 text-gray-600 px-4 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-100 border border-gray-200 transition-all"
                title="إدارة التصنيفات"
              >
                <Settings2 className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowTemplates(true)}
                className="bg-amber-50 text-amber-600 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-amber-100 border border-amber-100 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                مصاريف متكررة
              </button>
            </>
          )}

          <button
            onClick={() => setIsPreviewing(true)}
            className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
          >
            <Printer className="w-5 h-5" />
            معاينة وطباعة
          </button>

          <button
            onClick={() => setShowCharts(!showCharts)}
            className={`${showCharts ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'} px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-red-50 transition-all border border-transparent`}
          >
            <PieChartIcon className="w-5 h-5" />
            {showCharts ? 'إخفاء الإحصائيات' : 'عرض الإحصائيات'}
          </button>

          {canModify && (
            <button
              onClick={() => setIsAdding(true)}
              className="theme-bg text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 theme-shadow transition-all hover:opacity-90"
            >
              <Plus className="w-5 h-5" />
              إضافة مصروفات
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm mb-6">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                        <PieChartIcon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900">توزيع المصروفات حسب الفئة</h3>
                    </div>
                    
                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                      {(['monthly', 'quarterly', 'yearly'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setReportPeriod(period)}
                          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                            reportPeriod === period 
                              ? 'bg-white text-red-600 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {period === 'monthly' ? 'شهري' : period === 'quarterly' ? 'فصلي' : 'سنوي'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '20px', 
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                            textAlign: 'right',
                            direction: 'rtl',
                            fontFamily: 'Cairo',
                            fontWeight: 'bold'
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'المبلغ']}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value) => <span className="text-xs font-black text-gray-600 px-2">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="w-full lg:w-80 space-y-4">
                  <h4 className="text-sm font-black text-gray-400 mb-4 px-2 tracking-widest">تفاصيل فئات الصرف</h4>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {chartData.map((data, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group hover:bg-red-50 transition-all border border-transparent hover:border-red-100">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
                          <span className="font-black text-gray-700">{data.name}</span>
                        </div>
                        <span className="font-black text-red-600">{formatCurrency(data.value)}</span>
                      </div>
                    ))}
                    {chartData.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <p className="font-bold">لا توجد بيانات للفترة المختارة</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.05 }
          }
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
          className="bg-red-50 p-6 rounded-3xl border border-red-100"
        >
          <p className="text-red-600 font-black text-sm mb-1 text-right">إجمالي المصروفات</p>
          <p className="text-2xl font-black text-red-700 text-right" dir="rtl">
            {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
          </p>
        </motion.div>
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
          className="bg-gray-50 p-6 rounded-3xl border border-gray-100"
        >
          <p className="text-gray-500 font-black text-sm mb-1 text-right">عدد العمليات</p>
          <p className="text-2xl font-black text-gray-700 text-right">{filteredExpenses.length} عملية</p>
        </motion.div>
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
          className="bg-blue-50 p-6 rounded-3xl border border-blue-100"
        >
          <p className="text-blue-600 font-black text-sm mb-1 text-right">أعلى فئة صرف</p>
          <p className="text-2xl font-black text-blue-700 text-right">{
            allCategories.reduce((max, cat) => {
              const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
              return total > max.total ? { cat, total } : max;
            }, { cat: 'لا يوجد', total: 0 }).cat
          }</p>
        </motion.div>
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
          className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100"
        >
          <p className="text-emerald-600 font-black text-sm mb-1 text-right">المتوسط اليومي</p>
          <p className="text-2xl font-black text-emerald-700 text-right" dir="rtl">
            {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0) / (filteredExpenses.length || 1))}
          </p>
        </motion.div>
      </motion.div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-6 font-black text-gray-600 text-xs">التاريخ</th>
                <th className="px-8 py-6 font-black text-gray-600 text-xs">الفئة</th>
                <th className="px-8 py-6 font-black text-gray-600 text-xs">الوصف / التفاصيل</th>
                <th className="px-8 py-6 font-black text-gray-600 text-xs">المبلغ</th>
                <th className="px-8 py-6 font-black text-gray-600 text-xs">الإجراءات</th>
              </tr>
            </thead>
            <motion.tbody 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { 
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
              className="divide-y divide-gray-50"
            >
              {filteredExpenses.map((expense) => (
                <motion.tr 
                  key={expense.id} 
                  variants={{
                    hidden: { opacity: 0, x: 10 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  className="hover:bg-red-50/20 transition-all group"
                >
                  <td className="px-8 py-6 text-sm text-gray-500 font-bold">
                    {format(new Date(expense.date), 'yyyy-MM-dd')}
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black border border-red-100">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-black text-gray-900">{expense.description}</div>
                  </td>
                  <td className="px-8 py-6 font-black text-xl text-red-600" dir="rtl">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-8 py-6">
                    {canModify && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => startEdit(expense)} 
                          className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteExpense(expense.id)} 
                          className="p-3 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <DollarSign className="w-24 h-24 mb-6 opacity-10 animate-bounce" />
            <p className="text-2xl font-black text-gray-300">لا توجد مصروفات مسجلة حالياً</p>
          </div>
        )}
      </div>

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplates && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplates(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-20">
                <div className="flex items-center gap-5">
                  <div className="p-5 bg-amber-50 text-amber-600 rounded-[1.8rem] shadow-xl shadow-amber-50">
                    <RefreshCw className="w-8 h-8 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">مصاريف متكررة وجاهزة</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">Recurring Templates</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTemplates(false)} 
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-[1.5rem] transition-all text-slate-400 grow-0 shrink-0"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-10 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/20">
                {RECURRING_TEMPLATES.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyTemplate(t)}
                    className="w-full flex items-center justify-between p-7 bg-white hover:bg-amber-50/50 border border-slate-100 hover:border-amber-200 rounded-[2.5rem] transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900 group-hover:text-amber-700 transition-colors">{t.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.category}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-black text-amber-600 tracking-tight">{formatCurrency(t.amount)}</p>
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-500/80 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 mt-2 ml-auto">
                        <Repeat className="w-3 h-3" />
                        ثابت شهرياً
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Expense Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-20">
                <div className="flex items-center gap-5">
                  <div className="theme-bg p-5 rounded-[1.8rem] text-white shadow-xl theme-shadow rotate-3 flex items-center justify-center">
                    {editingExpense ? <Edit2 className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingExpense ? 'تعديل سجل الصرف' : 'إضافة مصروفات جديدة'}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">Expense Record Details</p>
                  </div>
                </div>
                <button 
                  onClick={resetForm} 
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-[1.5rem] transition-all text-slate-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-slate-50/20 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 mb-2 px-4 uppercase tracking-widest">القيمة المالية</label>
                    <div className="relative group">
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-red-50 p-2 rounded-xl text-red-600 transition-colors group-hover:bg-red-100 shadow-sm border border-red-50">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <input 
                        required 
                        type="number" 
                        value={formData.amount} 
                        onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                        className="w-full bg-white border border-slate-100 rounded-3xl pr-[4.5rem] pl-6 py-5 outline-none focus:ring-4 focus:ring-red-100/50 font-black text-2xl text-red-600 transition-all shadow-sm" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 mb-2 px-4 uppercase tracking-widest">التصنيف</label>
                    <div className="relative group">
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-slate-100 p-2 rounded-xl text-slate-400">
                        <Tag className="w-5 h-5" />
                      </div>
                      <select 
                        value={formData.category} 
                        onChange={(e) => setFormData({...formData, category: e.target.value})} 
                        className="w-full bg-white border border-slate-100 rounded-3xl pr-[4.5rem] pl-6 py-5 outline-none focus:ring-4 focus:ring-slate-100/50 font-black appearance-none transition-all shadow-sm text-slate-700"
                      >
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 px-4 uppercase tracking-widest">تاريخ العملية</label>
                  <div className="relative group">
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-slate-100 p-2 rounded-xl text-slate-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <input 
                      required 
                      type="date" 
                      value={formData.date} 
                      onChange={(e) => setFormData({...formData, date: e.target.value})} 
                      className="w-full bg-white border border-slate-100 rounded-3xl pr-[4.5rem] pl-6 py-5 outline-none focus:ring-4 focus:ring-slate-100/50 font-black transition-all shadow-sm text-slate-700" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 px-4 uppercase tracking-widest">تفاصيل ووصف المصروفات</label>
                  <div className="relative group">
                    <div className="absolute right-6 top-6 bg-slate-100 p-2 rounded-xl text-slate-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <textarea 
                      required 
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} 
                      className="w-full bg-white border border-slate-100 rounded-[2.5rem] pr-[4.5rem] pl-8 py-6 outline-none focus:ring-4 focus:ring-slate-100/50 font-bold min-h-[140px] transition-all shadow-sm text-slate-700 text-lg leading-relaxed" 
                      placeholder="اكتب ماذا تم صرفه والى أي جهة معينة..."
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full bg-red-600 text-white py-7 rounded-[2.2rem] font-black text-xl hover:bg-red-700 shadow-2xl shadow-red-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                >
                  <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition-transform">
                    {editingExpense ? <RefreshCw className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  {editingExpense ? 'تحديث بيانات الصرف' : 'تأكيد وإضافة المصروفات'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Manager Modal */}
      <AnimatePresence>
        {showCategoryManager && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryManager(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem] shadow-sm">
                      <Settings2 className="w-8 h-8" />
                   </div>
                   <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">إدارة التصنيفات</h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em] leading-none">Category Management</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowCategoryManager(false)} 
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-300"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
              
              <div className="p-10 space-y-8 bg-slate-50/30">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Tag className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 pointer-events-none" />
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="أدخل اسم التصنيف الجديد..."
                      className="w-full bg-white border border-slate-100 rounded-[1.5rem] pr-12 pl-6 py-4 outline-none focus:ring-4 focus:ring-indigo-100/50 font-black text-slate-700 transition-all shadow-sm"
                    />
                  </div>
                  <button
                    onClick={addCategory}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-[1.5rem] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    إضافة
                  </button>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-3 custom-scrollbar">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">التصنيفات الحالية في النظام</p>
                    <span className="w-10 h-0.5 bg-slate-100 rounded-full"></span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {DEFAULT_CATEGORIES.map(c => (
                      <div key={c} className="flex items-center justify-between p-5 bg-white border border-slate-50 rounded-[1.8rem] shadow-sm group">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                          <span className="font-black text-slate-500">{c}</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100/50 italic">افتراضي</span>
                      </div>
                    ))}
                    
                    {categories.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-5 bg-white border border-indigo-100/30 rounded-[1.8rem] group transition-all hover:bg-indigo-50/30 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform"></div>
                          <span className="font-black text-slate-900">{c.name}</span>
                        </div>
                        <button
                          onClick={() => deleteCategory(c.id)}
                          className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewing && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewing(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-5xl h-[92vh] rounded-[3.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-white/20"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-20">
                <div className="flex items-center gap-5">
                  <div className="bg-blue-50 p-5 rounded-[1.8rem] text-blue-600 shadow-lg shadow-blue-50/50">
                    <Printer className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">معاينة تقرير المصروفات</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">Expense Report Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handlePrint()}
                    className="bg-blue-600 text-white px-10 py-5 rounded-[1.8rem] font-black text-lg hover:bg-blue-700 flex items-center gap-3 transition-all shadow-2xl shadow-blue-200 active:scale-95 transform translate-y-0 hover:-translate-y-1"
                  >
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Printer className="w-5 h-5" />
                    </div>
                    إرسال للطباعة
                  </button>
                  <button 
                    onClick={() => setIsPreviewing(false)} 
                    className="p-5 hover:bg-slate-100 rounded-[1.8rem] text-slate-300 transition-all grow-0 shrink-0 border border-slate-50"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-8 px-12 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="expToggleAccountant" 
                    checked={stampConfig.showAccountant} 
                    onChange={(e) => setStampConfig({...stampConfig, showAccountant: e.target.checked})}
                    className="w-5 h-5 accent-blue-600 rounded-lg cursor-pointer"
                  />
                  <label htmlFor="expToggleAccountant" className="text-xs font-black text-gray-700 cursor-pointer">توقيع المحاسب</label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="expTogglePrincipal" 
                    checked={stampConfig.showPrincipal} 
                    onChange={(e) => setStampConfig({...stampConfig, showPrincipal: e.target.checked})}
                    className="w-5 h-5 accent-blue-600 rounded-lg cursor-pointer"
                  />
                  <label htmlFor="expTogglePrincipal" className="text-xs font-black text-gray-700 cursor-pointer">توقيع المدير</label>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-gray-100 flex justify-center custom-scrollbar">
                <div className="bg-white shadow-xl p-12 w-full max-w-4xl h-fit">
                  <ExpensesReportBody 
                    school={school}
                    groupedExpenses={groupedExpenses}
                    filteredExpenses={filteredExpenses}
                    stampConfig={stampConfig}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Report (Hidden) */}
      <div className="hidden">
        <div ref={printRef}>
          <ExpensesReportBody 
            school={school}
            groupedExpenses={groupedExpenses}
            filteredExpenses={filteredExpenses}
            stampConfig={stampConfig}
          />
        </div>
      </div>
    </div>
  );
}

interface ExpensesReportBodyProps {
  school: School;
  groupedExpenses: [string, GeneralExpense[]][];
  filteredExpenses: GeneralExpense[];
  stampConfig: {
    showAccountant: boolean;
    showPrincipal: boolean;
  };
}

function ExpensesReportBody({ school, groupedExpenses, filteredExpenses, stampConfig }: ExpensesReportBodyProps) {
  return (
    <div className="p-12 text-right rtl" dir="rtl">
      <div className="text-center mb-12 border-b-2 border-gray-900 pb-8">
        <h2 className="text-4xl font-black text-gray-900 mb-2">{school.name}</h2>
        <h3 className="text-2xl font-black text-gray-600">تقرير المصروفات العامة التفصيلي</h3>
        <p className="text-gray-500 font-bold mt-2">تاريخ التقرير: {format(new Date(), 'yyyy-MM-dd')}</p>
      </div>

      {groupedExpenses.map(([month, monthExpenses]) => {
        const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        return (
          <div key={month} className="mb-12 break-inside-avoid">
            <div className="flex justify-between items-center bg-gray-100 p-4 rounded-xl mb-4">
              <h4 className="text-xl font-black text-gray-900">شهر: {month}</h4>
              <span className="text-lg font-black text-red-600">الإجمالي: {formatCurrency(monthTotal)}</span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-3 px-4 text-right font-black">التاريخ</th>
                  <th className="py-3 px-4 text-right font-black">الفئة</th>
                  <th className="py-3 px-4 text-right font-black">الوصف</th>
                  <th className="py-3 px-4 text-left font-black">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monthExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="py-3 px-4 font-bold">{format(new Date(expense.date), 'yyyy-MM-dd')}</td>
                    <td className="py-3 px-4">{expense.category}</td>
                    <td className="py-3 px-4">{expense.description}</td>
                    <td className="py-3 px-4 text-left font-black">{formatCurrency(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="mt-12 pt-8 border-t-2 border-gray-900 flex justify-between items-center">
        <span className="text-2xl font-black text-gray-900">إجمالي المصروفات الكلي:</span>
        <span className="text-3xl font-black text-red-600">
          {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
        </span>
      </div>

      <div className="mt-24 flex justify-between gap-12 text-center">
        {stampConfig.showPrincipal && (
          <div>
            <div className="w-48 border-b-2 border-gray-900 mb-2 mx-auto"></div>
            <p className="font-black">مدير المدرسة</p>
          </div>
        )}
        {stampConfig.showAccountant && (
          <div>
            <div className="w-48 border-b-2 border-gray-900 mb-2 mx-auto"></div>
            <p className="font-black">توقيع المحاسب</p>
          </div>
        )}
      </div>
    </div>
  );
}
