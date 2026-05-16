import fs from 'fs';

const path = 'src/components/AttendanceManager.tsx';
let data = fs.readFileSync(path, 'utf8');
const lines = data.split('\n');

const startIndex = 1148;
const endIndex = 1240;

const newContent = `          {activeTab === 'staff' && (
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
                      <th className="px-6 py-4 text-xs font-black text-gray-500 max-w-[200px]">الكادر</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500">حالة الدوام اليومية</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500">ملاحظات</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500">استقطاع غياب</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 w-32 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStaff.map((member, idx) => {
                      const record = dailyRecords.find(r => r.entityId === member.id && r.type === 'staff');
                      const status = record?.status;
                      const dayOfWeek = new Date(selectedDate).getDay();
                      const isWorkingDay = (member.workingDays || [0,1,2,3,4,5]).includes(dayOfWeek);
                      
                      return (
                        <tr key={member.id} className={\`hover:bg-blue-50/20 transition-colors group \${!isWorkingDay ? 'bg-gray-50/50 grayscale-[0.2]' : ''}\`}>
                          <td className="px-6 py-4 text-center">
                            <span className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-black text-gray-400 mx-auto">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 overflow-hidden text-blue-600 flex items-center justify-center shrink-0">
                                {member.photo ? <img src={member.photo} alt={member.name} className="w-full h-full object-cover" /> : <UserCheck className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900 text-sm">{member.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-500 font-bold">{member.role}</span>
                                  {!isWorkingDay && <span className="text-[8px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-black">إجازة/عطلة</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2 items-center">
                              {[
                                { id: 'present', label: 'حاضر', color: 'emerald', icon: CheckCircle2 },
                                { id: 'absent', label: 'غائب', color: 'red', icon: XCircle },
                              ].map(option => {
                                const isActive = status === option.id;
                                const Icon = option.icon;
                                return (
                                  <button
                                    key={option.id}
                                    onClick={() => updateAttendance(member.id, 'staff', option.id as any)}
                                    className={\`flex items-center justify-center min-w-[80px] gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all \${
                                      isActive 
                                        ? \`bg-\${option.color}-600 text-white shadow-lg shadow-\${option.color}-200 scale-105\` 
                                        : \`bg-gray-50 text-gray-500 border border-gray-100 hover:bg-\${option.color}-50 hover:text-\${option.color}-600 focus:outline-none\`
                                    }\`}
                                  >
                                    <Icon className="w-4 h-4" />
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
                            {status === 'absent' && member.deductionAmount > 0 ? (
                               <span className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 inline-flex">
                                  {member.deductionAmount.toLocaleString()} د.ع
                               </span>
                            ) : (
                               <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingReason({ 
                                  id: member.id, 
                                  name: member.name, 
                                  reason: record?.reason || '' 
                                })}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0"
                                title="إضافة ملاحظة/عذر"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              {canModify && (
                                <button 
                                  onClick={() => setIsRegisteringFingerprint({ id: member.id, name: member.name, type: 'staff' })}
                                  className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors shrink-0"
                                  title="تسجيل جهاز البصمة"
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
              {filteredStaff.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                     <UserCheck className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-bold">لا يوجد كادر متطابق مع البحث</p>
                </div>
              )}
            </motion.div>
          )}`

lines.splice(startIndex, endIndex - startIndex, newContent);
fs.writeFileSync(path, lines.join('\n'));
