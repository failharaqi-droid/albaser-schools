import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// Simple event-based bus for toast
export const toast = {
  show: (message: string, type: ToastType = 'info') => {
    window.dispatchEvent(new CustomEvent('app-toast', { 
      detail: { message, type, id: Math.random().toString(36).substring(2, 11) } 
    }));
  },
  success: (message: string) => toast.show(message, 'success'),
  error: (message: string) => toast.show(message, 'error'),
  info: (message: string) => toast.show(message, 'info'),
  warning: (message: string) => toast.show(message, 'warning'),
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const newToast = e.detail;
      setToasts(prev => [...prev, newToast]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="pointer-events-auto"
          >
            <div className={`
              min-w-[320px] max-w-md p-4 rounded-2xl shadow-2xl flex items-center gap-4 border text-right
              ${t.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-200/50' :
                t.type === 'error' ? 'bg-rose-600 text-white border-rose-500 shadow-rose-200/50' :
                t.type === 'warning' ? 'bg-amber-500 text-white border-amber-400 shadow-amber-200/50' :
                'bg-slate-900 text-white border-slate-700 shadow-slate-200/50'}
            `}>
              <div className="shrink-0 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {t.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-white" /> :
                 t.type === 'error' ? <AlertTriangle className="w-6 h-6 text-white" /> :
                 t.type === 'warning' ? <AlertTriangle className="w-6 h-6 text-white" /> :
                 <Info className="w-6 h-6 text-white" />}
              </div>
              
              <div className="flex-1">
                <p className="font-black text-lg leading-tight">{t.message}</p>
              </div>

              <button 
                onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 opacity-70" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
