const fs = require('fs');

const path = 'src/components/StudentManager.tsx';
let data = fs.readFileSync(path, 'utf8');
const lines = data.split('\n');

const startIndex = 1352; // because arrays are 0-indexed, this is line 1353
const endIndex = 1713; // line 1714 is the footer

const newContent = `              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-6 lg:p-10">
                <div className="max-w-5xl mx-auto">
                  {profileTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Financial Status Quick View */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                            الملخص المالي
                          </h3>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase text-right">إجمالي الرسوم المطلوبة</p>
                            <p className="text-3xl font-black text-slate-900 text-right" dir="rtl">{formatCurrency(selectedStudentForProfile.totalAmount)}</p>
                          </div>
                          <div className="h-4 bg-slate-50 rounded-full overflow-hidden flex shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: \`\${(studentProfileData?.paidAmount || 0) / (selectedStudentForProfile.totalAmount || 1) * 100}%\` }}
                              className="bg-emerald-500 h-full shadow-lg shadow-emerald-100"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50 text-right">
                              <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">المدفوع</p>
                              <p className="text-lg font-black text-emerald-700">{formatCurrency(studentProfileData?.paidAmount || 0)}</p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100/50 text-right">
                              <p className="text-[9px] font-black text-rose-600 uppercase mb-1">المتبقي</p>
                              <p className="text-lg font-black text-rose-700">{formatCurrency(studentProfileData?.remainingAmount || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Stats Quick View */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-indigo-500" />
                            ملخص الالتزام والحضور
                          </h3>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center text-center">
                                <span className="text-3xl font-black text-indigo-600 mb-1">{studentProfileData?.attendanceRate}%</span>
                                <span className="text-[10px] font-black text-indigo-400">نسبة الالتزام</span>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                               <div className="bg-slate-50 rounded-2xl flex flex-col items-center justify-center p-2">
                                  <span className="text-xl font-black text-slate-700">{studentProfileData?.presentCount}</span>
                                  <span className="text-[9px] font-bold text-slate-400">حضور</span>
                               </div>
                               <div className="bg-rose-50 rounded-2xl flex flex-col items-center justify-center p-2">
                                  <span className="text-xl font-black text-rose-600">{studentProfileData?.absentCount}</span>
                                  <span className="text-[9px] font-bold text-rose-400">غياب</span>
                               </div>
                               <div className="bg-amber-50 rounded-2xl flex flex-col items-center justify-center p-2">
                                  <span className="text-xl font-black text-amber-600">{studentProfileData?.lateCount}</span>
                                  <span className="text-[9px] font-bold text-amber-400">تأخير</span>
                               </div>
                               <div className="bg-blue-50 rounded-2xl flex flex-col items-center justify-center p-2">
                                  <span className="text-xl font-black text-blue-600">{studentProfileData?.excusedCount}</span>
                                  <span className="text-[9px] font-bold text-blue-400">عذر</span>
                               </div>
                             </div>
                          </div>
                      
                          {/* Alert if needed */}
                          {(() => {
                            const absences = studentProfileData?.absentCount || 0;
                            if (absences >= 6) {
                              const config = absences >= 12 ? { color: 'rose', text: 'إنذار نهائي بالفصل' } 
                                           : absences >= 10 ? { color: 'orange', text: 'استدعاء ولي أمر' } 
                                           : { color: 'amber', text: 'تنبيه غياب متكرر' };
                              return (
                                <div className={\`p-4 rounded-2xl bg-\${config.color}-50 border border-\${config.color}-200 flex items-center justify-between\`}>
                                   <div className={\`flex items-center gap-3 text-\${config.color}-700 font-black text-sm\`}>
                                     <AlertTriangle className="w-5 h-5" />
                                     {config.text}
                                   </div>
                                   <button 
                                     onClick={() => sendAbsenceAlert(selectedStudentForProfile, absences)}
                                     className={\`px-3 py-1.5 rounded-lg bg-\${config.color}-100 text-\${config.color}-700 text-[10px] font-black hover:bg-\${config.color}-200 transition-colors\`}
                                   >
                                     إرسال إشعار
                                   </button>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Comprehensive Status */}
                      <div className="md:col-span-2 mt-4 space-y-6">
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-sky-500" />
                            تقرير المتابعة الشامل
                        </h3>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                           <div className="flex-1 space-y-4 w-full">
                               <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-sm">
                                  هذا التقرير يجمع لك أحدث المستجدات حول حالة الطالب من الناحية المالية وحضوره خلال العام الدراسي الحالي.
                               </p>
                               <button
                                 onClick={() => sendStatusReport(selectedStudentForProfile)}
                                 className="w-full sm:w-auto px-8 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl font-black text-sm flex items-center justify-center gap-3 transition-colors"
                               >
                                 <MessageSquare className="w-4 h-4" />
                                 إرسال تقرير شامل لولي الأمر عبر الواتساب
                               </button>
                           </div>
                           <div className="w-full md:w-64 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <h4 className="text-[10px] font-black text-slate-400 mb-2">آخر نشاط مسجل</h4>
                             <div className="space-y-3">
                                {studentProfileData?.lastPayment && (
                                  <div className="flex justify-between items-center text-xs">
                                     <span className="text-slate-500 font-bold">آخر دفعة</span>
                                     <span className="font-black text-emerald-600">{formatCurrency(studentProfileData.lastPayment.amount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center text-xs">
                                   <span className="text-slate-500 font-bold">أيام الغياب</span>
                                   <span className="font-black text-rose-600">{studentProfileData?.absentCount} أيام</span>
                                </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {profileTab === 'finance' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-900">سجل الدفعات المالية</h3>
                          <button 
                            onClick={() => {
                              const stId = selectedStudentForProfile.id;
                              setSelectedStudentForProfile(null);
                              onPay(stId);
                            }}
                            className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                          >
                            إضافة دفعة جديدة
                          </button>
                       </div>
                       
                       <div className="space-y-4">
                         {studentProfileData?.studentPayments.length ? (
                           studentProfileData.studentPayments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                             <div key={p.id} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between group hover:border-emerald-300 transition-all gap-4">
                               <div className="flex items-center gap-5">
                                 <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                                   <DollarSign className="w-6 h-6" />
                                 </div>
                                 <div className="text-right">
                                   <p className="text-base font-black text-slate-900">دفعة نقدية مسجلة</p>
                                   <p className="text-[11px] text-slate-500 font-bold mt-1 flex items-center gap-2">
                                     <Calendar className="w-3.5 h-3.5" />
                                     {format(new Date(p.date), 'EEEE, dd MMMM yyyy', { locale: ar })}
                                   </p>
                                 </div>
                               </div>
                               <div className="text-left w-full sm:w-auto flex justify-between sm:block border-t sm:border-0 border-slate-100 pt-4 sm:pt-0">
                                 <p className="text-2xl font-black text-emerald-600 tracking-tighter" dir="rtl">{formatCurrency(p.amount)}</p>
                                 <p className="text-[10px] font-bold text-emerald-500/70 sm:mt-1 text-left flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    تحقق موثق
                                 </p>
                               </div>
                             </div>
                           ))
                         ) : (
                           <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                             <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
                               <DollarSign className="w-10 h-10 text-slate-300" />
                             </div>
                             <p className="text-xl font-black text-slate-800">لا توجد مدفوعات مسجلة</p>
                             <p className="text-sm font-medium text-slate-400 mt-2">قم بتسجيل أول دفعة لهذا الطالب ليتم تتبعها هنا.</p>
                           </div>
                         )}
                       </div>
                    </div>
                  )}

                  {profileTab === 'attendance' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-900">تاريخ الحضور والغياب</h3>
                          
                          <div className="flex gap-2">
                             <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> حاضر ({studentProfileData?.presentCount})
                             </div>
                             <div className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-black md:flex items-center gap-2 hidden">
                                <XCircle className="w-4 h-4" /> غائب ({studentProfileData?.absentCount})
                             </div>
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                         {studentProfileData?.studentAttendance.length ? (
                           studentProfileData.studentAttendance.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => {
                             const statusMeta = r.status === 'present' ? { bg: 'bg-emerald-50 text-emerald-600', icon: CheckCircle, label: 'حضور' } : 
                                                r.status === 'late' ? { bg: 'bg-amber-50 text-amber-600', icon: Clock, label: 'تأخير' } : 
                                                r.status === 'absent' ? { bg: 'bg-rose-50 text-rose-600', icon: XCircle, label: 'غياب' } :
                                                r.status === 'excused' ? { bg: 'bg-blue-50 text-blue-600', icon: Info, label: 'عذر رسمي' } :
                                                r.status === 'dismissed' ? { bg: 'bg-slate-100 text-slate-600', icon: LogOut, label: 'مغادرة' } :
                                                r.status === 'violation' ? { bg: 'bg-orange-50 text-orange-600', icon: AlertCircle, label: 'مخالفة' } :
                                                { bg: 'bg-slate-50 text-slate-600', icon: AlertCircle, label: 'أخرى' };

                             return (
                               <div key={r.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between group hover:border-slate-300 transition-all gap-4">
                                 <div className="flex items-center gap-5 text-right flex-1">
                                   <div className={\`p-4 rounded-2xl \${statusMeta.bg}\`}>
                                     <statusMeta.icon className="w-6 h-6" />
                                   </div>
                                   <div className="space-y-1">
                                     <div className="flex flex-wrap items-center gap-2">
                                       <p className="text-base font-black text-slate-900">{statusMeta.label}</p>
                                       {r.reason && (
                                         <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                           سبب: {r.reason}
                                         </span>
                                       )}
                                       {r.scanTime && (
                                         <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                           <Clock className="w-3 h-3" />
                                           {format(new Date(r.scanTime), 'hh:mm a')}
                                         </span>
                                       )}
                                     </div>
                                     <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {format(new Date(r.date), 'EEEE, dd MMMM yyyy', { locale: ar })}
                                     </p>
                                   </div>
                                 </div>
                                 
                                 {canModify && (
                                   <div className="flex justify-end pt-2 sm:pt-0">
                                     <button 
                                       onClick={() => {
                                         setEditingAttendance(r);
                                         setAttendanceFormData({
                                           status: r.status,
                                           reason: r.reason || ''
                                         });
                                       }}
                                       className="px-4 py-2 bg-slate-50 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-black transition-colors"
                                     >
                                       تعديل الحالة
                                     </button>
                                   </div>
                                 )}
                               </div>
                             );
                           })
                         ) : (
                           <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                             <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
                               <History className="w-10 h-10 text-slate-300" />
                             </div>
                             <p className="text-xl font-black text-slate-800">لا توجد سجلات حضور</p>
                             <p className="text-sm font-medium text-slate-400 mt-2">يتم تسجيل الحضور إما تلقائياً عبر الباركود أو يدوياً.</p>
                           </div>
                         )}
                       </div>
                    </div>
                  )}
                </div>
              </div>\n`;

lines.splice(startIndex, endIndex - startIndex, newContent);

fs.writeFileSync(path, lines.join('\n'));
