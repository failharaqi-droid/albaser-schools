import fs from 'fs';

const path = 'src/components/AttendanceManager.tsx';
let data = fs.readFileSync(path, 'utf8');
const lines = data.split('\n');

const startIndex = 978;
const endIndex = 1146;

const newContent = `          {activeTab === 'students' && (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 }
              }}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 w-16 text-center">#</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 max-w-[200px]">الطالب</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500">حالة الحضور اليومية</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500">ملاحظات</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 w-32 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.map((student, idx) => {
                      const record = dailyRecords.find(r => r.entityId === student.id && r.type === 'student');
                      const status = record?.status;
                      
                      return (
                        <tr key={student.id} className="hover:bg-blue-50/20 transition-colors group">
                          <td className="px-6 py-4 text-center">
                            <span className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-black text-gray-400 mx-auto">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden text-gray-400 flex items-center justify-center shrink-0">
                                {student.photo ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" /> : <Users className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900 text-sm">{student.name}</h4>
                                <span className="text-[10px] text-gray-500 font-bold">{student.grade}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {[
                                { id: 'present', label: 'حاضر', color: 'emerald', icon: CheckCircle2 },
                                { id: 'absent', label: 'غائب', color: 'red', icon: XCircle },
                                { id: 'late', label: 'متأخر', color: 'yellow', icon: Clock },
                                { id: 'excused', label: 'مجاز', color: 'gray', icon: Info },
                                { id: 'violation', label: 'مخالف', color: 'indigo', icon: AlertCircle },
                              ].map(option => {
                                const isActive = status === option.id;
                                const Icon = option.icon;
                                return (
                                  <button
                                    key={option.id}
                                    onClick={() => updateAttendance(student.id, 'student', option.id as any)}
                                    className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all \${
                                      isActive 
                                        ? \`bg-\${option.color}-600 text-white shadow-md shadow-\${option.color}-200 scale-105\` 
                                        : \`bg-gray-50 text-gray-500 border border-gray-100 hover:bg-\${option.color}-50 hover:text-\${option.color}-600 hover:border-\${option.color}-200\`
                                    }\`}
                                  >
                                    {isActive ? <Icon className="w-3.5 h-3.5" /> : null}
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-[150px]">
                            {record?.reason ? (
                              <div className="truncate text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg inline-block border border-gray-100" title={record.reason}>
                                {record.reason}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold px-2">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingReason({ 
                                  id: student.id, 
                                  name: student.name, 
                                  reason: record?.reason || '' 
                                })}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="إضافة ملاحظة"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  let type: 'warning' | 'summons' | 'expulsion' | 'absence' | 'violation' = 
                                    (status === 'violation' || status === 'dismissed') ? 'violation' : 'absence';
                                  setShowNotificationModal({ student, type });
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="إشعار يومي"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  const count = attendanceRecords.filter(r => r.entityId === student.id && r.status === 'absent').length;
                                  let type: 'warning' | 'summons' | 'expulsion' = 'warning';
                                  if (count >= 12) type = 'expulsion';
                                  else if (count >= 10) type = 'summons';
                                  setShowNotificationModal({ student, type });
                                }}
                                className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="إنذارات متقدمة"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                              {canModify && (
                                <button 
                                  onClick={() => setIsRegisteringFingerprint({ id: student.id, name: student.name, type: 'student' })}
                                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="تسجيل بصمة"
                                >
                                  <Fingerprint className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredStudents.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                     <Users className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-bold">لا يوجد طلاب متطابقين مع البحث</p>
                </div>
              )}
            </motion.div>
          )}`

lines.splice(startIndex, endIndex - startIndex, newContent);
fs.writeFileSync(path, lines.join('\n'));
