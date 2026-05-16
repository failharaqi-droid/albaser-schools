import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School as SchoolIcon, 
  ArrowLeft, 
  ArrowRight, 
  LayoutDashboard, 
  CheckCircle2, 
  Upload, 
  Palette, 
  Smartphone,
  ShieldCheck,
  Zap,
  GraduationCap,
  Sparkles,
  Database,
  Search,
  BookOpen,
  Plus
} from 'lucide-react';
import { School } from '../types';

interface SetupWizardProps {
  onComplete: (school: Omit<School, 'id'>) => void;
  currentUserId: string;
}

export default function SetupWizard({ onComplete, currentUserId }: SetupWizardProps) {
  const [step, setStep] = React.useState(1);
  const [data, setData] = React.useState<Omit<School, 'id'>>({
    name: '',
    logo: '',
    address: '',
    phone: '',
    principalName: '',
    themeColor: '#7c3aed',
    autoAbsenceCheckEnabled: true,
    systemFontFamily: 'Amiri',
    systemFontSize: '150%',
    ownerId: currentUserId
  });

  const next = () => setStep(s => s + 1);
  const prev = () => setStep(s => s - 1);

  const colors = [
    { name: 'Violet', value: '#7c3aed' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Amber', value: '#d97706' },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setData({ ...data, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-cairo" dir="rtl">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[700px] relative z-10">
        {/* Progress bar */}
        <div className="bg-slate-50/50 backdrop-blur-md p-6 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-4">
             <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 rotate-3 group-hover:rotate-0 transition-transform">
                <GraduationCap className="w-8 h-8 text-indigo-600" />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-800 leading-none">معالج التثبيت الذكي</h2>
                <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Smart Installation Wizard</p>
             </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className={`h-2.5 rounded-full transition-all duration-700 ${step >= i ? 'w-10 bg-indigo-600' : 'w-2.5 bg-slate-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="text-center space-y-4">
                  <div className="inline-block p-4 bg-indigo-50 rounded-full mb-2">
                    <Sparkles className="w-10 h-10 text-indigo-600 animate-pulse" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">مرحباً بك في نظامك الجديد</h3>
                  <p className="text-slate-500 font-bold text-lg max-w-md mx-auto leading-relaxed">
                    يسعدنا مساعدتك في تجهيز بيئة إدارة المدرسة بأفضل المعايير المهنية.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-colors shadow-sm group">
                    <div className="p-3 bg-indigo-50 rounded-2xl w-fit mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <SchoolIcon className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-slate-800 mb-2">تعريف المؤسسة</h4>
                    <p className="text-sm text-slate-500 font-bold">يرجى إدخال الاسم الرسمي لمدرستك أو مركزك التعليمي.</p>
                    <input 
                      type="text"
                      placeholder="اسم مجمعك التعليمي..."
                      value={data.name}
                      onChange={e => setData({ ...data, name: e.target.value })}
                      className="w-full mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 ring-2 ring-transparent focus:ring-indigo-50"
                    />
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-colors shadow-sm group">
                    <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-slate-800 mb-2">تعريف المدير</h4>
                    <p className="text-sm text-slate-500 font-bold">اسم الشخص المسؤول عن إدارة النظام وصلاحيات الوصول.</p>
                    <input 
                      type="text"
                      placeholder="الاسم الكامل..."
                      value={data.principalName}
                      onChange={e => setData({ ...data, principalName: e.target.value })}
                      className="w-full mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 ring-2 ring-transparent focus:ring-indigo-50"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <h3 className="text-3xl font-black text-slate-900">الهوية البصرية الاحترافية</h3>
                  <p className="text-slate-500 font-bold">تخصيص الشعار والألوان الخاصة بمؤسستك</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-indigo-500" />
                      شعار المدرسة
                    </h4>
                    <div className="relative group aspect-square">
                       <div className="w-full h-full bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 transition-all hover:bg-white hover:border-indigo-400 group-hover:shadow-2xl group-hover:shadow-indigo-100">
                          {data.logo ? (
                            <img src={data.logo} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <>
                              <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4">
                                <Plus className="w-8 h-8 text-slate-300" />
                              </div>
                              <p className="text-sm font-black text-slate-400">انقر لرفع الشعار بصيغة PNG أو JPG</p>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Palette className="w-5 h-5 text-indigo-500" />
                      اللون الرئيسي للنظام
                    </h4>
                    <p className="text-sm text-slate-500 font-bold">اختر اللون الذي يمثل شخصية مؤسستك البصرية.</p>
                    <div className="grid grid-cols-3 gap-4">
                      {colors.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setData({ ...data, themeColor: color.value })}
                          className={`aspect-square rounded-3xl transition-all border-[6px] ${data.themeColor === color.value ? 'border-white ring-4 ring-indigo-500 scale-110 shadow-2xl' : 'border-transparent shadow-sm'}`}
                          style={{ backgroundColor: color.value }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <h3 className="text-3xl font-black text-slate-900">معلومات الاتصال والدوام</h3>
                  <p className="text-slate-500 font-bold">هذه البيانات ستظهر في الوصولات والتقارير المالية</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 block mr-2">عنوان المركز / المدرسة</label>
                    <input 
                      type="text"
                      placeholder="مثال: بغداد - الكرادة - ساحة كهرمانة"
                      value={data.address}
                      onChange={e => setData({ ...data, address: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700 block mr-2">رقم هاتف الإدارة</label>
                    <input 
                      type="tel"
                      placeholder="07XXXXXXXX"
                      value={data.phone}
                      onChange={e => setData({ ...data, phone: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[30px] flex items-center justify-center flex-shrink-0 animate-bounce-slow">
                      <Smartphone className="w-10 h-10" />
                    </div>
                    <div className="flex-1 text-right">
                      <h4 className="text-xl font-black mb-2">نظام الإشعارات الذكي (بوت واتساب)</h4>
                      <p className="text-indigo-100 font-bold leading-relaxed">
                        هل ترغب في أن يقوم النظام بإرسال رسائل تلقائية لأولياء الأمور عند غياب الطالب أو تسديد قسط؟
                      </p>
                    </div>
                    <button
                      onClick={() => setData({ ...data, autoAbsenceCheckEnabled: !data.autoAbsenceCheckEnabled })}
                      className={`w-20 h-10 rounded-full relative transition-all shadow-inner ${data.autoAbsenceCheckEnabled ? 'bg-emerald-400' : 'bg-white/30'}`}
                    >
                      <div className={`absolute top-1 w-8 h-8 bg-white rounded-full transition-all shadow-md flex items-center justify-center ${data.autoAbsenceCheckEnabled ? 'right-11' : 'right-1'}`}>
                        {data.autoAbsenceCheckEnabled ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Smartphone className="w-5 h-5 text-slate-400" />}
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-12 text-center"
              >
                <div className="space-y-4">
                  <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">النظام جاهز تماماً!</h3>
                  <p className="text-slate-500 font-bold text-lg leading-relaxed">
                    لقد قمت بإدخال كافة البيانات المطلوبة لبدء العمل. <br/> تم تهيئة قاعدة البيانات المحلية وتأمين خصوصيتك.
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: <Database className="w-5 h-5" />, label: 'قاعدة بيانات آمنة' },
                    { icon: <ShieldCheck className="w-5 h-5" />, label: 'خصوصية كاملة' },
                    { icon: <Search className="w-5 h-5" />, label: 'بحث ذكي مفعل' },
                    { icon: <BookOpen className="w-5 h-5" />, label: 'دليل المستخدم جاهز' },
                  ].map((item, id) => (
                    <div key={id} className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center gap-2 border border-slate-100">
                      <div className="text-indigo-600">{item.icon}</div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer controls */}
        <div className="p-8 border-t border-slate-100 flex gap-4 bg-white/80 backdrop-blur-md sticky bottom-0">
          {step > 1 && step < 4 && (
            <button
              onClick={prev}
              className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-6 h-6" />
              السابق
            </button>
          )}
          
          {step < 4 ? (
            <button
              onClick={next}
              disabled={(step === 1 && !data.name) || (step === 3 && !data.phone)}
              className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
            >
              <span>{step === 3 ? 'مراجعة الإعدادات' : 'التالي'}</span>
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => onComplete(data)}
              className="w-full bg-indigo-900 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl shadow-indigo-400 hover:bg-black transition-all flex items-center justify-center gap-3 animate-pulse-slow"
            >
              <Zap className="w-7 h-7 text-amber-400" />
              إطلاق النظام وبدء العمل
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-6 text-slate-400">
         <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">تشفير نهاية لنهاية</span>
         </div>
         <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
         <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">نسخة المؤسسات التعليمية v2.0</span>
         </div>
      </div>

      <style>{`
        .font-cairo { font-family: 'Cairo', sans-serif; }
        .animate-bounce-slow { animation: bounce 3s infinite; }
        .animate-pulse-slow { animation: pulse 4s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </div>
  );
}
