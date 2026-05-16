import { useEffect, useState, useRef } from 'react';
import { ParentNotification, School, Student, AttendanceRecord, Holiday } from '../types';
import { localDb } from '../services/localDb';
import { WhatsAppService } from '../services/WhatsAppService';
import { Bot, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, parse } from 'date-fns';

export default function BackgroundBot() {
  const processingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const processAutoAbsences = async () => {
    const schools = localDb.getAll('schools') as School[];
    const holidays = localDb.getAll('holidays') as Holiday[];
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // 5 = Friday, 6 = Saturday
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      return; // Skip on weekends entirely
    }

    for (const school of schools) {
      if (!school.autoAbsenceCheckEnabled || !school.shiftEndTime) continue;
      if (school.lastAbsenceCheckDate === today) continue;
      
      const isHoliday = holidays.some(h => h.schoolId === school.id && h.date === today);
      if (isHoliday) continue;

      const shiftEnd = parse(school.shiftEndTime, 'HH:mm', new Date());

      if (isAfter(now, shiftEnd)) {
        console.log(`Processing absences for ${school.name}...`);
        
        const schoolStudents = (localDb.getAll('students') as Student[]).filter(s => s.schoolId === school.id);
        const attendance = (localDb.getAll('attendanceRecords') as AttendanceRecord[]).filter(r => r.date === today);
        const presentIds = new Set(attendance.filter(r => (r.status === 'present' || r.status === 'late' || r.status === 'excused')).map(r => r.entityId));

        const newRecords: any[] = [];
        const newNotifications: any[] = [];
        const settings = WhatsAppService.getSettings(school.id);
        const useGateway = settings?.isEnabled && settings?.useGateway;

        for (const student of schoolStudents) {
          if (!presentIds.has(student.id)) {
            const alreadyMarked = attendance.find(r => r.entityId === student.id && r.status === 'absent');
            if (!alreadyMarked) {
              newRecords.push({
                entityId: student.id,
                type: 'student',
                status: 'absent',
                date: today,
                createdAt: new Date().toISOString()
              });

              if (settings?.isEnabled && settings?.attendanceAbsentTemplate && student.phone) {
                const message = WhatsAppService.formatMessage(settings.attendanceAbsentTemplate, student);
                newNotifications.push({
                  studentId: student.id,
                  type: 'absence',
                  content: message,
                  date: new Date().toISOString(),
                  status: useGateway ? 'pending' : 'manual'
                });
              }
            }
          }
        }

        if (newRecords.length > 0) {
          localDb.addMany('attendanceRecords', newRecords);
        }
        if (newNotifications.length > 0) {
          localDb.addMany('parentNotifications', newNotifications);
        }

        localDb.update('schools', school.id, { lastAbsenceCheckDate: today });
      }
    }
  };

  useEffect(() => {
    const checkQueue = async () => {
      if (processingRef.current) return;
      
      await processAutoAbsences();

      const allNotifs = localDb.getAll('parentNotifications') as ParentNotification[];
      const pending = allNotifs.filter(n => n.status === 'pending');
      setPendingCount(pending.length);

      if (pending.length > 0) {
        processingRef.current = true;
        setIsProcessing(true);
        const next = pending[0];
        
        const student = (localDb.getAll('students') as Student[]).find(s => s.id === next.studentId);
        const settings = student ? WhatsAppService.getSettings(student.schoolId) : null;
        const delaySeconds = settings?.messageDelay || 2;
        
        await new Promise(r => setTimeout(r, delaySeconds * 1000));
        
        await WhatsAppService.processNotification(next.id);
        setLastSent(next.id);
        
        setIsProcessing(false);
        processingRef.current = false;
        
        setTimeout(() => setLastSent(null), 3000);
      }
    };

    const interval = setInterval(checkQueue, 5000);
    window.addEventListener('local-db-update', checkQueue);
    
    checkQueue();

    return () => {
      clearInterval(interval);
      window.removeEventListener('local-db-update', checkQueue);
    };
  }, [isProcessing]);

  if (pendingCount === 0 && !lastSent) return null;

  return (
    <div className="fixed bottom-8 left-8 z-[100] pointer-events-none">
      <AnimatePresence>
        {(pendingCount > 0 || lastSent) && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white/90 backdrop-blur-xl border border-gray-100 shadow-2xl p-4 rounded-2xl flex items-center gap-2 min-w-[280px]"
          >
            <div className={`p-3 rounded-2xl relative ${isProcessing ? 'bg-blue-600 text-white animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Bot className="w-6 h-6" />}
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {pendingCount}
                </span>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-gray-900">
                  {isProcessing ? 'جاري الإرسال التلقائي...' : 'المساعد الذكي نشط'}
                </p>
                <div className="flex gap-0.5">
                   <div className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
                   <div className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce delay-300"></div>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-bold">
                {isProcessing ? 'يتم الآن معالجة إشعارات الواتساب' : 'تم إرسال كافة التنبيهات المعلقة'}
              </p>
            </div>

            {lastSent && !isProcessing && (
              <div className="text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 rounded-2xl -z-10 animate-pulse"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
