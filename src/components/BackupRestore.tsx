import { useState, useEffect } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2, FileJson, Save, Loader2, Clock } from 'lucide-react';
import { localDb } from '../services/localDb';
import { toast } from './Toast';

export default function BackupRestore() {
  const [confirmingImportFile, setConfirmingImportFile] = useState<File | null>(null);
  const [autoBackupActive, setAutoBackupActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    let backupTimeout: any = null;
    let isWriting = false;
    let pendingWrite = false;

    const processBackupQueue = async () => {
      const handle = (window as any).autoBackupHandle;
      if (!handle) {
        setAutoBackupActive(false);
        setSaveStatus('idle');
        return;
      }
      
      if (isWriting) {
        pendingWrite = true;
        return;
      }
      
      isWriting = true;
      pendingWrite = false;
      setSaveStatus('saving');
      
      try {
        const writable = await handle.createWritable();
        // Use Blob for memory-saving and large data handling
        const dataStr = localDb.exportAll();
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        await writable.write(blob);
        await writable.close();
        
        setLastSaved(new Date());
        setSaveStatus('idle');
      } catch (error) {
        console.error("Auto backup failed", error);
        setSaveStatus('error');
        setAutoBackupActive(false);
        (window as any).autoBackupHandle = null;
      } finally {
        isWriting = false;
        if (pendingWrite) {
          backupTimeout = setTimeout(processBackupQueue, 2000);
        }
      }
    };

    const handleUpdate = () => {
      if ((window as any).autoBackupHandle) {
        if (backupTimeout) clearTimeout(backupTimeout);
        setSaveStatus('saving'); // Show saving intent immediately
        backupTimeout = setTimeout(processBackupQueue, 3000); // 3 seconds debounce for heavy data
      }
    };
    
    // Check initial state if handle exists
    if ((window as any).autoBackupHandle) {
      setAutoBackupActive(true);
    }
    
    window.addEventListener('local-db-update', handleUpdate);
    return () => {
      window.removeEventListener('local-db-update', handleUpdate);
      if (backupTimeout) clearTimeout(backupTimeout);
    };
  }, []);

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
      toast.success('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (error) {
      toast.error('فشل تصدير النسخة الاحتياطية');
    }
  };

  const enableAutoBackup = async () => {
    try {
      if (!('showSaveFilePicker' in window)) {
        toast.error('متصفحك لا يدعم هذه الميزة، يرجى استخدام جوجل كروم');
        return;
      }
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `school_auto_backup_${new Date().toISOString().split('T')[0]}.json`,
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
      });
      (window as any).autoBackupHandle = handle;
      
      setSaveStatus('saving');
      
      // Perform initial backup using fast Blob stream
      const writable = await handle.createWritable();
      const dbData = localDb.exportAll();
      const blob = new Blob([dbData], { type: 'application/json' });
      await writable.write(blob);
      await writable.close();
      
      setAutoBackupActive(true);
      setLastSaved(new Date());
      setSaveStatus('idle');
      
      toast.success('تم تفعيل الحفظ التلقائي الاحترافي! النظام الآن مهيأ لحفظ البيانات الضخمة في الخلفية');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error('حدث خطأ أثناء تفعيل الحفظ التلقائي');
        setSaveStatus('error');
      }
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmingImportFile(file);
    e.target.value = '';
  };
  
  const executeImport = () => {
    if (!confirmingImportFile) return;
    
    setConfirmingImportFile(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        localDb.importAll(content);
        toast.success('تم استعادة البيانات بنجاح. سيتم تحديث النظام.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        toast.error('فشل استعادة البيانات. تأكد من صحة الملف.');
      }
    };
    reader.readAsText(confirmingImportFile);
  };

  return (
    <div className="max-w-5xl mx-auto w-full /space-y-2">
      <div className="bg-white p-4 rounded-[40px] border border-gray-100 shadow-sm text-center">
        <div className="theme-bg-soft w-10 h-10 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <FileJson className="w-6 h-6 theme-text" />
        </div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight text-gray-900 mb-4">النسخ الاحتياطي والاستعادة</h2>
        <p className="text-gray-500 font-bold max-w-md mx-auto mb-12">
          نظراً لأن النظام يعمل محلياً بالكامل، يرجى التأكد من أخذ نسخة احتياطية دورية لحماية بياناتك من الضياع في حال مسح بيانات المتصفح.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <button
            onClick={handleExport}
            className="group relative bg-white border-2 p-5 rounded-3xl transition-all overflow-hidden theme-border hover:theme-bg-soft"
          >
            <div className="relative z-10 flex flex-col items-center">
              <Download className="w-6 h-6 theme-text mb-4 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-black theme-text">تصدير نسخة احتياطية</span>
              <span className="text-xs opacity-50 mt-2 font-bold theme-text">تنزيل لمرة واحدة</span>
            </div>
          </button>

          <button
            onClick={enableAutoBackup}
            className={`group relative border-2 p-5 rounded-3xl transition-all overflow-hidden ${
              autoBackupActive 
                ? 'bg-emerald-50 border-emerald-200 shadow-inner' 
                : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
            }`}
          >
            <div className={`relative z-10 flex flex-col items-center ${autoBackupActive ? 'text-emerald-700' : 'text-indigo-700'}`}>
              <Save className={`w-6 h-6 mb-4 ${autoBackupActive && saveStatus !== 'saving' ? `animate-pulse` : 'group-hover:scale-110 transition-transform'}`} />
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">الحفظ التلقائي الذكي</span>
                {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
              </div>
              <span className="text-xs mt-2 font-bold opacity-80 pb-2">
                {autoBackupActive 
                  ? saveStatus === 'saving' 
                    ? 'جاري مزامنة البيانات الضخمة...' 
                    : 'النظام مزامن ومحمي في الخلفية - يرجى عدم إغلاق النافذة' 
                  : 'مزامنة تلقائية للملف مع قدرة استيعاب هائلة'}
              </span>
              {lastSaved && autoBackupActive && (
                <div className="mt-2 flex items-center justify-center gap-1 text-[10px] bg-emerald-100/50 px-2 py-1 rounded-md text-emerald-600 font-bold border border-emerald-100/30">
                  <Clock className="w-3 h-3" />
                  آخر حفظ: {lastSaved.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}
            </div>
          </button>

          <label className="group relative border-2 p-5 rounded-3xl transition-all cursor-pointer overflow-hidden theme-bg theme-border hover:opacity-90">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <div className="relative z-10 flex flex-col items-center">
              <Upload className="w-6 h-6 text-white mb-4 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-black text-white">استعادة نسخة احتياطية</span>
              <span className="text-xs text-white/70 mt-2 font-bold">تحميل البيانات من ملف سابق</span>
            </div>
          </label>
        </div>

        <div className="mt-12 p-4 bg-orange-50 rounded-3xl border border-orange-100 flex items-start gap-2 text-right">
          <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-1" />
          <div>
            <h4 className="font-black text-orange-900 mb-1">تنبيه هام</h4>
            <p className="text-sm text-orange-700 font-bold leading-relaxed">
              عند استعادة نسخة احتياطية، سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات الموجودة في الملف. يرجى التأكد من اختيار الملف الصحيح.
            </p>
          </div>
        </div>
      </div>
      
      {confirmingImportFile && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-right">
            <div className="p-8 text-center space-y-6">
              <div className="w-24 h-24 bg-orange-50 rounded-full mx-auto flex items-center justify-center text-orange-500 mb-6">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">تأكيد استعادة البيانات</h3>
              <p className="text-lg text-slate-500 font-bold leading-relaxed">
                هل أنت متأكد من استعادة النسخة الاحتياطية <span className="text-orange-600">"{confirmingImportFile.name}"</span>؟
                <br />
                <span className="text-sm font-medium">سيتم فقدان جميع البيانات الحالية واستبدالها بهذه النسخة.</span>
              </p>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={executeImport}
                  className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-6 h-6" />
                  نعم، استعادة البيانات
                </button>
                <button 
                  onClick={() => setConfirmingImportFile(null)}
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
