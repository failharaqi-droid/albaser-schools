import { useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2, FileJson } from 'lucide-react';
import { localDb } from '../services/localDb';

export default function BackupRestore() {
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleExport = () => {
    try {
      const data = localDb.exportAll();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school_accounting_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'تم تصدير النسخة الاحتياطية بنجاح' });
    } catch (error) {
      setStatus({ type: 'error', message: 'فشل تصدير النسخة الاحتياطية' });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('تحذير: سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في الملف. هل تريد الاستمرار؟')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        localDb.importAll(content);
        setStatus({ type: 'success', message: 'تم استعادة البيانات بنجاح. سيتم تحديث النظام.' });
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        setStatus({ type: 'error', message: 'فشل استعادة البيانات. تأكد من صحة الملف.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm text-center">
        <div className="theme-bg-soft w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <FileJson className="w-12 h-12 theme-text" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4">النسخ الاحتياطي والاستعادة</h2>
        <p className="text-gray-500 font-bold max-w-md mx-auto mb-12">
          نظراً لأن النظام يعمل محلياً بالكامل، يرجى التأكد من أخذ نسخة احتياطية دورية لحماية بياناتك من الضياع في حال مسح بيانات المتصفح.
        </p>

        {status && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 justify-center font-bold ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={handleExport}
            className="group relative bg-white border-2 p-8 rounded-3xl transition-all overflow-hidden theme-border hover:theme-bg-soft"
          >
            <div className="relative z-10 flex flex-col items-center">
              <Download className="w-10 h-10 theme-text mb-4 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-black theme-text">تصدير نسخة احتياطية</span>
              <span className="text-xs opacity-50 mt-2 font-bold theme-text">حفظ البيانات في ملف خارجي</span>
            </div>
          </button>

          <label className="group relative border-2 p-8 rounded-3xl transition-all cursor-pointer overflow-hidden theme-bg theme-border hover:opacity-90">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <div className="relative z-10 flex flex-col items-center">
              <Upload className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-black text-white">استعادة نسخة احتياطية</span>
              <span className="text-xs text-white/70 mt-2 font-bold">تحميل البيانات من ملف سابق</span>
            </div>
          </label>
        </div>

        <div className="mt-12 p-6 bg-orange-50 rounded-3xl border border-orange-100 flex items-start gap-4 text-right">
          <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-1" />
          <div>
            <h4 className="font-black text-orange-900 mb-1">تنبيه هام</h4>
            <p className="text-sm text-orange-700 font-bold leading-relaxed">
              عند استعادة نسخة احتياطية، سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات الموجودة في الملف. يرجى التأكد من اختيار الملف الصحيح.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
