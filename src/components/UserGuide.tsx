import React, { useState, useMemo } from 'react';
import { 
  BookOpen, FileText, PieChart, Users, CreditCard, ShieldCheck, 
  HelpCircle, Search, Settings, Share2, Printer, Database, 
  MessageSquare, UserCheck, LayoutDashboard, ChevronLeft,
  ArrowRight
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: string;
  content: string;
  details: string[];
}

export default function UserGuide() {
  const [searchQuery, setSearchQuery] = useState('');

  const sections: GuideSection[] = [
    {
      id: 'dashboard',
      title: 'لوحة القيادة والمؤشرات (العمليات المركزية)',
      icon: <LayoutDashboard className="w-5 h-5 text-indigo-500" />,
      category: 'النظام العام',
      content: 'الواجهة المركزية لإدارة المدرسة، توفر رؤية حية وفورية للميزانية، حضور الموظفين، ونشاط الطلاب اليومي.',
      details: [
        'الرصيد الصافي: يتم حسابه ديناميكياً (إجمالي الإيرادات - إجمالي المصروفات - رواتب الموظفين).',
        'مؤشر الإنجاز المالي: نسبة التحصيل الشهري مقارنة بالمستهدف.',
        'إحصائيات الحضور الفورية: رسم بياني يوضح عدد الحاضرين والغائبين والمجازين لهذا اليوم.',
        'التنبيهات العاجلة: قائمة بالطلاب الذين تجاوزوا حد الغياب المسموح به وتاج تذكير بالدفع.',
        'المخططات البيانية (Charts): تحليل شهري وسنوي للدخل والمصروفات لمقارنة الأداء.'
      ]
    },
    {
      id: 'student-reg',
      title: 'تسجيل وإدارة بيانات الطلاب',
      icon: <Users className="w-5 h-5 text-blue-500" />,
      category: 'شؤون الطلاب',
      content: 'نظام أرشفة رقمي يحفظ سجل الطالب الأكاديمي والمالي والتعريفي بدقة عالية.',
      details: [
        'التسجيل اليدوي: إدخال بيانات الطالب (الاسم، العنوان، الأبوين، الهاتف) وتوليد باركود تلقائي.',
        'الاستيراد الجماعي (Excel): تحميل مئات الطلاب بملف واحد مع ميزة التدقيق الآلي للبيانات.',
        'التصوير المباشر: إمكانية رفع صورة الطالب الشخصية لتظهر في وصولات القبض وبطاقات الهوية.',
        'توزيع الشعب: أداة ذكية لتوزيع الطلاب على الشعب (أ، ب، ج) حسب الأبجدية أو السعة المكانية.',
        'إحصائيات المراحل: كشف إجمالي عدد الطلاب في كل مرحلة دراسية (ابتدائي/متوسط/إعدادي).'
      ]
    },
    {
      id: 'finance-system',
      title: 'الدورة المالية والأقساط الدراسية',
      icon: <CreditCard className="w-5 h-5 text-emerald-500" />,
      category: 'المحاسبة والمالية',
      content: 'نظام محاسبي متكامل يضمن دقة تحصيل الأقساط، إدارة الخصومات، والديون المتراكمة.',
      details: [
        'إدارة الأقساط: تحديد القسط السنوي وتتبع الدفعات (نقدية، دفع إلكتروني كـ زين كاش).',
        'طباعة الوصولات: إصدار وصل قبض حراري أو A4 يحتوي على تفاصيل الدفع والمبلغ المتبقي.',
        'المذمة المالية: لكل طالب صفحة مالية تعرض كافة الحركات السابقة والديون بذمة ولي الأمر.',
        'نظام الخصومات: تطبيق خصم (مبلغ ثابت أو نسبة) للطلاب المتفوقين أو الإخوة.',
        'تصدير الكشوفات: إنتاج قوائم "المتأخرات" لإرسالها للجنة المحاسبة لغرض المتابعة.'
      ]
    },
    {
      id: 'attendance-system',
      title: 'نظام التحضير الرقمي (الباركود والبصمة)',
      icon: <UserCheck className="w-5 h-5 text-amber-500" />,
      category: 'الانضباط والدوام',
      content: 'أتمتة الحضور اليومي باستخدام قارئ الباركود أو البصمة لضمان السرية والسرعة وتجنب الأخطاء البشرية.',
      details: [
        'التحضير السريع: تمرير بطاقة الطالب تحت القارئ يسجل حضوره بدقة (بالثانية).',
        'الغياب التلقائي: يقوم النظام بحصر الطلاب الذين لم يسجلوا دخولاً وإدراجهم في قائمة الغياب.',
        'إشعارات الرسائل: إرسال "رسالة غياب" فورية لولي الأمر عبر الواتساب لإخطاره بعدم وصول الابن.',
        'سجل العقوبات والغيابات: توثيق عدد أيام الغياب لكل طالب مع إدراج نوع العذر (مرضي، اضطراري).',
        'تقارير الانضباط: كشف شهري يوضح الطلاب الأكثر التزاماً والطلاب الأكثر غياباً.'
      ]
    },
    {
      id: 'staff-salaries',
      title: 'إدارة شؤون الموظفين والرواتب',
      icon: <ShieldCheck className="w-5 h-5 text-purple-500" />,
      category: 'الموارد البشرية',
      content: 'تنظيم بيانات المعلمين والموظفين، صرف الرواتب، وإدارة الاستقطاعات والمكافآت.',
      details: [
        'عقود الموظفين: توثيق الراتب الأساسي، تاريخ المباشرة، والمرحلة الدراسية المسندة (للمعلمين).',
        'نظام السلف والمكافآت: تسجيل السلف الشخصية وخصمها تقسيطاً من الراتب الشهري.',
        'مسير الرواتب (Payrolls): صرف الرواتب بضغطة زر مع احتساب الغيابات والاستقطاعات تلقائياً.',
        'الدوام الوظيفي: مراقبة حضور وانصراف الكادر التعليمي لضمان انسيابية الجدول الدراسي.',
        'تقارير الكادر: قوائم محدثة بكافة الموظفين وحالتهم المالية والمهنية.'
      ]
    },
    {
      id: 'whatsapp-bot',
      title: 'بوت الواتساب الذكي (Auto-Messaging)',
      icon: <MessageSquare className="w-5 h-5 text-green-500" />,
      category: 'التواصل الفعال',
      content: 'محرك مراسلة يربط إدارة المدرسة بأولياء الأمور لضمان تواصل لحظي وشفاف.',
      details: [
        'ربط الجهاز: مسح كود الـ QR لربط رقم واتساب المدرسة بالنظام (بدون الحاجة لبرمجة).',
        'رسائل الترحيب: إرسال رسالة آلية عند تسجيل الطالب الجديد تحتوي على معلومات القسط.',
        'تذكير الديون: إرسال مطالبات مالية مهذبة للمتأخرين مع ذكر المبلغ المتبقي.',
        'قوالب الرسائل (Templates): تخصيص نصوص الرسائل لتشمل (اسم الطالب، المبلغ، التاريخ).',
        'البث الجماعي (Broadcast): إرسال تعميمات مدرسية لكل أولياء الأمور فوريّاً.'
      ]
    },
    {
      id: 'advanced-reports',
      title: 'نظام التقارير المتقدم والسجل (Ledger)',
      icon: <PieChart className="w-5 h-5 text-teal-500" />,
      category: 'التحليل المالي',
      content: 'توليد تقارير مالية وتحليلية عميقة تساعد في مراجعة الأرباح والنمو السنوي للمؤسسة.',
      details: [
        'سجل المسطر (Manual Ledger): نظام تدوين ديون خارجي يدوي للأغراض التقليدية.',
        'كشف الأرباح والخسائر: تحليل تفصيلي للدخل الكلي ناقصاً (رواتب + مصروفات + استثمارات).',
        'المبلغ المسلم للمستثمر: واجهة خاصة لتسجيل المبالغ المسحوبة من قبل المالك أو الشركاء.',
        'الأرشيف السنوي: إمكانية ترحيل البيانات وحفظها في أرشيف للرجوع إليها في السنوات القادمة.',
        'تصدير PDF/Excel: كافة التقارير قابلة للتحميل للطباعة أو التخزين الخارجي.'
      ]
    },
    {
      id: 'id-designer',
      title: 'مصمم بطاقات الهوية الذكي (ID Cards)',
      icon: <FileText className="w-5 h-5 text-pink-500" />,
      category: 'الأدوات والإنتاج',
      content: 'أداة إنتاجية لطباعة هويات الطلاب والموظفين المهنية والمزودة بباركود الحضور.',
      details: [
        'التصميم التلقائي: يتم جلب بيانات وصورة الطالب فوراً ووضعها في قالب التصميم.',
        'توليد الباركود: دمج باركود الحضور أو الأقساط على الوجه الخلفي للهوية.',
        'الطباعة الجماعية: طباعة هويات شعبة كاملة أو مرحلة كاملة بضغطة زر واحدة.',
        'تخصيص الهوية: تغيير الخلفية، الألوان، وشعارات المدرسة بما يناسب المرحلة الدراسية.',
        'دعم الطابعات: متوافق مع طابعات الهويات البلاستيكية (PVC) والطابعات الورقية العادية.'
      ]
    },
    {
      id: 'security-backup',
      title: 'الأمن، النسخ الاحتياطي والخصوصية',
      icon: <Database className="w-5 h-5 text-orange-500" />,
      category: 'الأمن السيبراني',
      content: 'نظام حماية فائق لضمان عدم ضياع البيانات أو اختراق خصوصية المدرسة.',
      details: [
        'النسخ الاحتياطي (Backup): إمكانية تنزيل نسخة كاملة من النظام وحفظها على فلاش خارجي.',
        'الاستيراد السحابي والمحلي: استعادة النظام بالكامل في ثوانٍ من ملف النسخة الاحتياطية.',
        'صلاحيات المستخدمين: نظام أدوار صارم يمنع الموظفين من حذف البيانات الحساسة أو رؤية الأرباح.',
        'التشفير المحلي: تخزين كافة البيانات داخل جهازك فقط، لا أحد من الخارج يمكنه الوصول إليها.',
        'تصفير البيانات: ميزة آمنة لمسح كافة البيانات عند الرغبة في إعادة تهيئة النظام.'
      ]
    }
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.content.toLowerCase().includes(query) || 
      s.category.toLowerCase().includes(query) ||
      s.details.some(d => d.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">مركز المساعدة والتعليمات</h2>
              <p className="text-slate-500 font-bold">كل ما تحتاجه لإتقان العمل على النظام في مكان واحد</p>
            </div>
          </div>

          <div className="relative w-full md:w-96">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input 
              type="text"
              placeholder="ابحث عن ميزة أو شرح..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pr-12 pl-6 py-4 outline-none focus:ring-8 focus:ring-slate-100 font-bold text-slate-800 transition-all text-right shadow-inner"
            />
          </div>
        </div>

        {filteredSections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSections.map((section) => (
              <div 
                key={section.id} 
                className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-teal-200 transition-all duration-300 hover:shadow-xl group"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 group-hover:text-teal-700 transition-colors">{section.title}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                      {section.category}
                    </span>
                  </div>
                </div>
                
                <p className="text-slate-600 font-bold mb-6 text-sm leading-relaxed border-r-4 border-teal-500 pr-4">
                  {section.content}
                </p>
                
                <ul className="space-y-3">
                  {section.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-500 font-bold group-hover:text-slate-700 transition-colors">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="p-6 bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">عذراً، لم نجد نتائج لـ "{searchQuery}"</h3>
            <p className="text-slate-500 font-bold">جرب كلمات مختلفة مثل "طلاب"، "رواتب"، أو "واتساب"</p>
          </div>
        )}

        <div className="mt-12 p-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl text-white relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black mb-1">هل لا تزال تحتاج لمساعدة؟</h3>
                <p className="text-teal-50/80 font-bold text-sm">يتوفر فريق الدعم الفني لمساندتك دائماً في استخدام كافة الميزات.</p>
              </div>
            </div>
            <button className="bg-white text-teal-600 px-8 py-4 rounded-2xl font-black hover:bg-teal-50 transition-all shadow-lg active:scale-95 flex items-center gap-2">
              تواصل مع الدعم الفني
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

