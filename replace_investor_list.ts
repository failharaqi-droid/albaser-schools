import fs from 'fs';

let data = fs.readFileSync('src/components/InvestorManager.tsx', 'utf8');

const oldTableStr = `              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-4 text-right text-sm font-black text-gray-500">التاريخ</th>
                      <th className="px-6 py-4 text-right text-sm font-black text-gray-500">المبلغ</th>
                      <th className="px-6 py-4 text-right text-sm font-black text-gray-500">المستلم</th>
                      <th className="px-6 py-4 text-right text-sm font-black text-gray-500">البيان</th>
                      <th className="px-6 py-4 text-center text-sm font-black text-gray-500">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900">{format(new Date(p.date), 'yyyy/MM/dd')}</span>
                            <span className="text-xs text-gray-400">{format(new Date(p.date), 'HH:mm')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-blue-600">{formatCurrency(p.amount)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-700">{p.recipientName}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                          {p.notes || \`دفعة شهر \${p.month}\`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => printReceipt(p)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canModify && (
                              <button 
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                                    localDb.delete('investorPayments', p.id);
                                  }
                                }}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold italic">
                          لم يتم العثور على مبالغ مسلمة لهذا الشهر
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>`;

const newTableStr = `              <div className="space-y-4">
                {filteredPayments.map((p, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={p.id} 
                    className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between group hover:border-blue-300 transition-all gap-4 overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-5 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-110 transition-transform shadow-inner shadow-blue-100/50">
                        <CreditCard className="w-7 h-7 text-blue-600" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-black text-gray-900 text-lg">{formatCurrency(p.amount)}</h4>
                        <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-gray-500">
                           <span className="flex items-center gap-1.5 py-1 px-2.5 bg-gray-50 rounded-lg border border-gray-100">
                             <User className="w-3.5 h-3.5" />
                             {p.recipientName}
                           </span>
                           <span className="flex items-center gap-1.5 py-1 px-2.5 bg-gray-50 rounded-lg border border-gray-100">
                             <Calendar className="w-3.5 h-3.5" />
                             {format(new Date(p.date), 'yyyy/MM/dd')}
                           </span>
                           <span className="flex items-center gap-1.5 py-1 px-2.5 bg-gray-50 rounded-lg border border-gray-100">
                             <Clock className="w-3.5 h-3.5" />
                             {format(new Date(p.date), 'HH:mm')}
                           </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end border-t border-gray-100 md:border-0 pt-4 md:pt-0">
                       <p className="text-xs font-bold text-gray-400 bg-gray-50/80 px-4 py-2.5 rounded-xl max-w-[200px] md:max-w-[150px] lg:max-w-[200px] truncate border border-gray-100" title={p.notes || \`دفعة شهر \${p.month}\`}>
                         {p.notes || \`دفعة شهر \${p.month}\`}
                       </p>
                       <div className="flex items-center gap-2">
                         <button 
                           onClick={() => printReceipt(p)}
                           className="flex justify-center items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 font-black text-xs rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-blue-200"
                         >
                           <Printer className="w-4 h-4" />
                           طباعة
                         </button>
                         {canModify && (
                           <button 
                             onClick={() => {
                               if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                                 localDb.delete('investorPayments', p.id);
                               }
                             }}
                             className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-red-200"
                             title="حذف السجل"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                    </div>
                  </motion.div>
                ))}
                
                {filteredPayments.length === 0 && (
                   <div className="text-center py-24 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                     <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                       <CreditCard className="w-10 h-10 text-gray-300" />
                     </div>
                     <p className="text-2xl font-black text-gray-800">لا توجد مبالغ مسلمة</p>
                     <p className="text-sm font-bold text-gray-400 mt-2">لم يتم تسجيل أي دفعات نقدية للمستثمر في هذا الشهر</p>
                   </div>
                )}
              </div>`;

if (data.includes(oldTableStr)) {
  data = data.replace(oldTableStr, newTableStr);
  fs.writeFileSync('src/components/InvestorManager.tsx', data);
  console.log('Replaced successfully');
} else {
  console.log('String not found');
}
