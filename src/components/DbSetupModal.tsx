import React, { useState } from 'react';
import { Database, AlertCircle, Save } from 'lucide-react';

interface Props {
  onSuccess: () => void;
}

export default function DbSetupModal({ onSuccess }: Props) {
  const [dbData, setDbData] = useState({
    host: '',
    user: '',
    password: '',
    database: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/db/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to connect');
      }
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Database className="w-8 h-8 text-emerald-600" />
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-900 mb-2">ربط قاعدة البيانات سحابياً</h2>
        <p className="text-center text-slate-500 mb-8 font-medium">يرجى إدخال بيانات اتصال Hostinger MySQL للمتابعة (أول مرة فقط)</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">الرابط Server Host</label>
             <input required type="text" dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500" 
                value={dbData.host} onChange={e => setDbData({...dbData, host: e.target.value})} />
          </div>
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم Username</label>
             <input required type="text" dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500" 
                value={dbData.user} onChange={e => setDbData({...dbData, user: e.target.value})} />
          </div>
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور Password</label>
             <input type="password" dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500" 
                value={dbData.password} onChange={e => setDbData({...dbData, password: e.target.value})} />
          </div>
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">اسم قاعدة البيانات Database Name</label>
             <input required type="text" dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500" 
                value={dbData.database} onChange={e => setDbData({...dbData, database: e.target.value})} />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl flex items-center gap-3 text-sm font-bold">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button disabled={loading} type="submit" 
             className="w-full bg-emerald-600 text-white rounded-xl py-4 font-black text-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-all flex justify-center items-center gap-2 mt-4">
             {loading ? 'جاري الاتصال...' : (
               <>
                 <Save className="w-5 h-5" />
                 حفظ والاتصال
               </>
             )}
          </button>
        </form>
      </div>
    </div>
  );
}
