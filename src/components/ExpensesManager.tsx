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
  TrendingUp,
  Settings2,
  PieChart as PieChartIcon,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format, startOfMonth, isSameDay, subMonths, startOfYear, endOfMonth, isWithinInterval } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { toast } from './Toast';

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
  const [deletingItem, setDeletingItem] = useState<{id: string, type: 'expense' | 'category' | 'all', title: string} | null>(null);
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

  const executeDelete = () => {
    if (!deletingItem) return;
    
    if (deletingItem.type === 'expense') {
      localDb.delete('expenses', deletingItem.id);
    } else if (deletingItem.type === 'category') {
      localDb.delete('expenseCategories', deletingItem.id);
    } else if (deletingItem.type === 'all') {
      expenses.forEach(e => localDb.delete('expenses', e.id));
    }
    setDeletingItem(null);
  };

  const deleteExpense = (expense: GeneralExpense) => {
    setDeletingItem({ id: expense.id, type: 'expense', title: expense.description });
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    if (allCategories.includes(newCategoryName.trim())) {
      toast.warning('هذا التصنيف موجود بالفعل');
      return;
    }
    localDb.add('expenseCategories', {
      schoolId: school.id,
      name: newCategoryName.trim()
    });
    setNewCategoryName('');
  };

  const deleteCategory = (category: typeof categories[0]) => {
    setDeletingItem({ id: category.id, type: 'category', title: category.name });
  };

  const handleDeleteAll = () => {
    setDeletingItem({ id: 'all', type: 'all', title: 'جميع المصروفات' });
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
    <div className="space-y-2 animate-in fade-in duration-700">
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-3 justify-between items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="البحث في المصروفات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-12 pl-6 py-2 focus:ring-4 focus:ring-red-100 outline-none font-bold transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <div className="flex flex-1 lg:flex-none gap-3">
            <div className="relative flex-1">
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-10 pl-4 py-2 focus:ring-4 focus:ring-red-100 outline-none font-bold transition-all text-xs"
                placeholder="من تاريخ"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-10 pl-4 py-2 focus:ring-4 focus:ring-red-100 outline-none font-bold transition-all text-xs"
                placeholder="إلى تاريخ"
              />
            </div>
          </div>

          <div className="relative flex-1 lg:flex-none">
            <Tag className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-10 pl-6 py-2 focus:ring-4 focus:ring-red-100 outline-none font-black text-gray-700 appearance-none text-xs"
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
              className="bg-gray-100 text-gray-500 px-4 py-2 rounded-2xl font-black hover:bg-gray-200 transition-all"
              title="مسح الفلاتر"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {canModify && (
            <>
              <button
                onClick={() => setShowCategoryManager(true)}
                className="bg-gray-50 text-gray-600 px-4 py-2 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-100 border border-gray-200 transition-all"
                title="إدارة التصنيفات"
              >
                <Settings2 className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowTemplates(true)}
                className="bg-amber-50 text-amber-600 px-3 py-1.5 min-h-[38px] rounded-2xl font-black flex items-center gap-2 hover:bg-amber-100 border border-amber-100 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                مصاريف متكررة
              </button>
            </>
          )}

          <button
            onClick={() => setIsPreviewing(true)}
            className="bg-blue-600 text-white px-3 py-1.5 min-h-[38px] rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
          >
            <Printer className="w-5 h-5" />
            معاينة وطباعة
          </button>

          <button
            onClick={() => setShowCharts(!showCharts)}
            className={`${showCharts ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'} px-3 py-1.5 min-h-[38px] rounded-2xl font-black flex items-center gap-2 hover:bg-red-50 transition-all border border-transparent`}
          >
            <PieChartIcon className="w-5 h-5" />
            {showCharts ? 'إخفاء الإحصائيات' : 'عرض الإحصائيات'}
          </button>

          {canModify && (
            <button
              onClick={() => setIsAdding(true)}
              className="theme-bg text-white px-8 py-2 rounded-2xl font-black flex items-center gap-2 theme-shadow transition-all hover:opacity-90"
            >
              <Plus className="w-5 h-5" />
              إضافة مصروفات
            </button>
          )}
        </div>
      </div>

      
        {showCharts && (
          <div
            className="overflow-hidden"
          >
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6">
              <div className="flex flex-col lg:flex-row gap-2">
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

                <div className="w-full lg:w-80 space-y-2">
                  <h4 className="text-sm font-black text-gray-400 mb-4 px-2 tracking-widest">تفاصيل فئات الصرف</h4>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
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
          </div>
        )}
      

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-10 h-10 bg-red-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
          <div className="relative z-10">
            <div className="p-3 bg-red-500 text-white rounded-2xl w-fit mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="text-gray-400 font-bold text-xs mb-1 text-right uppercase tracking-[0.2em]">إجمالي المصروفات</p>
            <p className="text-lg font-black text-slate-900 tracking-tight text-red-600 text-right" dir="rtl">
              {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-10 h-10 bg-gray-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
          <div className="relative z-10">
            <div className="p-3 bg-gray-800 text-white rounded-2xl w-fit mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-gray-400 font-bold text-xs mb-1 text-right uppercase tracking-[0.2em]">عدد العمليات</p>
            <p className="text-lg font-black text-slate-900 tracking-tight text-gray-900 text-right">{filteredExpenses.length} <span className="text-sm">سجل</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-10 h-10 bg-blue-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
          <div className="relative z-10">
            <div className="p-3 bg-blue-600 text-white rounded-2xl w-fit mb-4">
              <Tag className="w-6 h-6" />
            </div>
            <p className="text-gray-400 font-bold text-xs mb-1 text-right uppercase tracking-[0.2em]">أعلى فئة صرف</p>
            <p className="text-lg font-black text-blue-700 text-right truncate">{
              allCategories.reduce((max, cat) => {
                const total = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                return total > max.total ? { cat, total } : max;
              }, { cat: 'لا يوجد', total: 0 }).cat
            }</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-10 h-10 bg-emerald-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
          <div className="relative z-10">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl w-fit mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-gray-400 font-bold text-xs mb-1 text-right uppercase tracking-[0.2em]">المتوسط اليومي</p>
            <p className="text-lg font-black text-slate-900 tracking-tight text-emerald-700 text-right" dir="rtl">
              {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0) / (filteredExpenses.length || 1))}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-xs">التاريخ</th>
                <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-xs">الفئة</th>
                <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-xs">الوصف / التفاصيل</th>
                <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-xs">المبلغ</th>
                <th className="px-3 py-1.5 min-h-[38px] text-lg font-black text-gray-600 text-xs">الإجراءات</th>
              </tr>
            </thead>
            <motion.tbody 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="divide-y divide-gray-50"
            >
              {filteredExpenses.map((expense) => (
                <tr 
                  key={expense.id}
                  className="hover:bg-red-50/20 transition-all group"
                >
                  <td className="px-3 py-1.5 min-h-[38px] text-lg text-sm text-gray-500 font-bold">
                    {format(new Date(expense.date), 'yyyy-MM-dd')}
                  </td>
                  <td className="px-3 py-1.5 min-h-[38px] text-lg">
                    <span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black border border-red-100">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 min-h-[38px] text-lg">
                    <div className="font-black text-gray-900">{expense.description}</div>
                  </td>
                  <td className="px-3 py-1.5 min-h-[38px] text-lg font-black text-xl text-red-600" dir="rtl">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-3 py-1.5 min-h-[38px] text-lg">
                    {canModify && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => startEdit(expense)} 
                          className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteExpense(expense)} 
                          className="p-3 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </motion.tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <DollarSign className="w-10 h-10 mb-6 opacity-10 animate-bounce" />
            <p className="text-lg font-black text-gray-300">لا توجد مصروفات مسجلة حالياً</p>
          </div>
        )}
      </div>

      
        {showTemplates && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight">مصاريف متكررة وجاهزة</h3>
                    <p className="text-xs font-bold text-slate-500 mt-2">قوالب المصروفات الثابتة لسرعة الإنجاز</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTemplates(false)} 
                  className="bg-slate-50 p-4 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-slate-600 hover:text-slate-900 active:scale-95 transition-all text-slate-400 hover:text-rose-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-5 lg:p-4 bg-slate-50/20">
                <div className="max-w-5xl mx-auto w-full /grid grid-cols-1 md:grid-cols-2 gap-2">
                  {RECURRING_TEMPLATES.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyTemplate(t)}
                      className="group p-5 bg-white hover:bg-amber-50/50 border border-slate-100 hover:border-amber-200 rounded-2xl transition-all flex flex-col text-right shadow-sm hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                          <DollarSign className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-500/80 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                          <Repeat className="w-3 h-3" />
                          ثابت شهرياً
                        </div>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mb-2 truncate">{t.description}</h4>
                      <div className="flex items-center gap-2 mb-6">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t.category}</span>
                      </div>
                      <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">المبلغ</span>
                        <span className="text-lg font-black text-slate-900 tracking-tight text-amber-600 tracking-tight">{formatCurrency(t.amount)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {isAdding && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                  {editingExpense ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{editingExpense ? 'تعديل السجل المالي' : 'تسجيل مصروفات تشغيلية جديدة'}</h3>
                </div>
              </div>
              <button 
                onClick={resetForm} 
                className="p-3 bg-white hover:bg-gray-100 rounded-xl transition-all text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative">
                  <label className="block text-xs font-black text-gray-500 mb-2">قيمة المبلغ المصروف بالدينار العراقي</label>
                  <div className="relative">
                    <input 
                      required 
                      type="number" 
                      step="any"
                      value={formData.amount} 
                      onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                      className="w-full bg-white border border-gray-200 rounded-xl px-12 py-4 outline-none focus:ring-2 focus:ring-red-100 font-black text-3xl text-red-600 text-center" 
                      placeholder="0.00"
                      autoFocus
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-red-300">د.ع</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-600">تصنيف الفئة</label>
                    <select 
                      required
                      value={formData.category} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 font-bold"
                    >
                      {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-600">تاريخ العملية</label>
                    <input 
                      required 
                      type="date" 
                      value={formData.date} 
                      onChange={(e) => setFormData({...formData, date: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 font-bold text-left" 
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-1 md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-black text-gray-600">البيان والغرض من الصرف</label>
                    <textarea 
                      required 
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 font-bold min-h-[80px] resize-none" 
                      placeholder="اكتب وصفاً للعملية..."
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-sm hover:bg-gray-200 transition-all"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      handleSubmit(e);
                      setIsAdding(true);
                    }}
                    className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black text-sm hover:bg-red-100 transition-all"
                  >
                    حفظ وإضافة جديد
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {editingExpense ? 'تحديث البيانات' : 'حفظ وإنهاء'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      

      
        {showCategoryManager && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm flex items-center justify-center">
                    <Settings2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight">إدارة وتبويب التصنيفات</h3>
                    <p className="text-xs font-bold text-slate-500 mt-2">تنظيم فئات المصروفات للتقارير الدقيقة</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCategoryManager(false)} 
                  className="bg-slate-50 p-4 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-slate-600 hover:text-slate-900 active:scale-95 transition-all text-slate-400 hover:text-rose-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar w-full p-5 lg:p-4 bg-slate-50/20">
                <div className="max-w-5xl mx-auto w-full /space-y-2">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="text-lg font-black text-slate-900 mb-6 text-right px-4">إضافة تصنيف جديد</h4>
                    <div className="flex flex-col md:flex-row gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 pointer-events-none" />
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="أدخل اسم التصنيف الجديد هنا..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-3xl pr-12 pl-6 py-2 text-lg outline-none focus:ring-2 focus:ring-indigo-100/50 font-black text-xl text-slate-700 transition-all shadow-inner text-right"
                        />
                      </div>
                      <button
                        onClick={addCategory}
                        className="bg-indigo-600 text-white px-12 py-6 rounded-3xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                      >
                        إضافة للتصنيفات
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-8">
                       <span className="h-0.5 flex-1 bg-slate-200 rounded-full"></span>
                       <p className="px-6 text-xs font-black text-slate-400 uppercase tracking-widest">قائمة التصنيفات الحالية في النظام</p>
                       <span className="h-0.5 flex-1 bg-slate-200 rounded-full"></span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {DEFAULT_CATEGORIES.map(c => (
                        <div key={c} className="flex items-center justify-between p-4 bg-white border border-slate-50 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                            <span className="font-black text-slate-500 text-lg">{c}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100/50 italic">تصنيف افتراضي</span>
                        </div>
                      ))}
                      
                      {categories.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-indigo-100/30 rounded-2xl group transition-all hover:bg-indigo-50 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-indigo-400 group-hover:scale-150 transition-transform"></div>
                            <span className="font-black text-slate-900 text-lg">{c.name}</span>
                          </div>
                          <button
                            onClick={() => deleteCategory(c)}
                            className="p-4 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                          >
                            <Trash2 className="w-6 h-6" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      

      {/* Preview Modal */}
      
        {isPreviewing && (
          <div className="integrated-page">
            <div className="modal-content">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 shadow-sm">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight text-slate-900 tracking-tight">معاينة تقرير المصروفات المالي</h3>
                    <p className="text-xs font-bold text-slate-500 mt-2">مراجعة البيانات قبل الاستخراج النهائي للطباعة</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handlePrint()}
                    className="bg-blue-600 text-white px-12 py-6 rounded-2xl font-black text-xl hover:bg-blue-700 flex items-center gap-2 transition-all shadow-2xl shadow-blue-200 active:scale-95"
                  >
                    <Printer className="w-6 h-6" />
                    إرسال للطباعة الآن
                  </button>
                  <button 
                    onClick={() => setIsPreviewing(false)} 
                    className="bg-slate-50 p-4 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-slate-600 hover:text-slate-900 active:scale-95 transition-all text-slate-400 hover:text-rose-600 border border-slate-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 px-20 py-6 bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 sticky top-[137px] z-20">
                <div className="flex items-center gap-2 group cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      id="expToggleAccountant" 
                      checked={stampConfig.showAccountant} 
                      onChange={(e) => setStampConfig({...stampConfig, showAccountant: e.target.checked})}
                      className="w-6 h-6 accent-blue-600 rounded-xl cursor-pointer"
                    />
                  </div>
                  <label htmlFor="expToggleAccountant" className="text-lg font-black text-slate-700 cursor-pointer group-hover:text-blue-600 transition-colors">إظهار حقل توقيع المحاسب</label>
                </div>
                <div className="flex items-center gap-2 group cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      id="expTogglePrincipal" 
                      checked={stampConfig.showPrincipal} 
                      onChange={(e) => setStampConfig({...stampConfig, showPrincipal: e.target.checked})}
                      className="w-6 h-6 accent-blue-600 rounded-xl cursor-pointer"
                    />
                  </div>
                  <label htmlFor="expTogglePrincipal" className="text-lg font-black text-slate-700 cursor-pointer group-hover:text-blue-600 transition-colors">إظهار حقل توقيع مدير المدرسة</label>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 lg:p-4 bg-slate-900/5 flex justify-center custom-scrollbar">
                <div className="bg-white shadow-2xl p-16 w-full max-w-5xl h-fit rounded-[1rem] border border-slate-100">
                  <ExpensesReportBody 
                    school={school}
                    groupedExpenses={groupedExpenses}
                    filteredExpenses={filteredExpenses}
                    stampConfig={stampConfig}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      

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
      
      {deletingItem && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-rose-50 rounded-full mx-auto flex items-center justify-center text-rose-500 mb-6">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">تأكيد الحذف</h3>
              <p className="text-lg text-slate-500 font-bold leading-relaxed">
                هل أنت متأكد من حذف <span className="text-rose-600">"{deletingItem.title}"</span>؟
                <br />
                <span className="text-sm font-medium">لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.</span>
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={executeDelete}
                  className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-6 h-6" />
                  نعم، تأكيد الحذف
                </button>
                <button 
                  onClick={() => setDeletingItem(null)}
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
    <div className="p-4 text-right rtl" dir="rtl">
      <div className="text-center mb-12 border-b-2 border-gray-900 pb-4">
        {school.logo && (
          <div className="flex justify-center mb-4">
            <img src={school.logo} alt="شعار المدرسة" className="h-24 object-contain" />
          </div>
        )}
        <h2 className="text-4xl font-black text-gray-900 mb-2">{school.name}</h2>
        <h3 className="text-lg font-black text-gray-600">تقرير المصروفات العامة التفصيلي</h3>
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
        <span className="text-lg font-black text-gray-900">إجمالي المصروفات الكلي:</span>
        <span className="text-lg font-black text-slate-900 tracking-tight text-red-600">
          {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
        </span>
      </div>

      <div className="mt-24 flex justify-between gap-3 text-center">
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
