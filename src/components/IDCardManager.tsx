import { useState, useMemo, useRef, useEffect } from 'react';
import { School, Student, CardTemplate, Staff } from '../types';
import { localDb } from '../services/localDb';
import { 
  Printer, 
  Settings, 
  Smartphone, 
  User, 
  CheckCircle2, 
  Palette,
  UserCheck,
  Search,
  LayoutGrid,
  X,
  Plus
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';

function IDCardThumbnail({ item, settings, school, type }: { item: any, settings: any, school: School, type: 'student' | 'staff' }) {
  return (
    <div 
      className="w-full aspect-[86/54] rounded-xl shadow-sm overflow-hidden relative border-2 border-white pointer-events-none select-none bg-white font-sans"
      style={{ fontFamily: settings.fontFamily || 'Cairo' }}
    >
      {/* Curved Gradient Left Design */}
      <div 
        className="absolute inset-y-0 left-0 w-[35%] z-10" 
        style={{ 
          clipPath: 'ellipse(100% 100% at 0% 50%)',
          background: `linear-gradient(135deg, ${settings.primaryColor || '#ce1126'}, ${settings.secondaryColor || '#fff200'})`
        }} 
      />
      <div 
        className="absolute inset-y-0 left-0 w-[36%] z-0 opacity-20" 
        style={{ 
          clipPath: 'ellipse(100% 100% at 0% 50%)',
          backgroundColor: 'black'
        }} 
      />
      <div className="relative h-full flex flex-col p-1 text-black">
        <div className="flex justify-between items-start mb-0.5 h-4">
          <div className="w-4 h-4 bg-white rounded-full p-0.5 shadow-sm flex items-center justify-center border border-red-100">
            {settings.cardLogo ? <img src={settings.cardLogo} alt="Logo" className="w-full h-full object-contain" /> : (school.logo ? <img src={school.logo} alt="Logo" className="w-full h-full object-contain" /> : <Smartphone className="w-2 h-2 text-blue-600" />)}
          </div>
          <div className="flex-1 flex flex-col items-center">
            <h4 className="font-black text-[3px] leading-tight text-gray-900 truncate max-w-[40px] uppercase">{school.name}</h4>
          </div>
        </div>
        <div className="flex gap-1 flex-1" dir="rtl">
          <div className="flex-1 flex flex-col justify-center space-y-0.5 text-right pr-1">
            <p className="text-[5px] font-black leading-tight truncate">{item.name}</p>
            {settings.showGrade && <p className="text-[3px] font-bold text-gray-500 truncate">{type === 'student' ? item.grade : item.role}</p>}
          </div>
          <div className="w-1/3 flex flex-col items-center justify-center">
            {settings.showPhoto && (
              <div className="w-6 h-8 bg-white p-0.5 border border-white shadow-sm overflow-hidden relative">
                {item.photo ? <img src={item.photo} alt="Photo" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-gray-200" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface IDCardManagerProps {
  school: School;
  students: Student[];
  staff: Staff[];
}

export default function IDCardManager({ school, students, staff }: IDCardManagerProps) {
  const [activeCategory, setActiveCategory] = useState<'students' | 'staff'>('students');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [printMode, setPrintMode] = useState<'both' | 'front' | 'back'>('both');
  const [cardsPerPage, setCardsPerPage] = useState<6 | 8>(8);
  
  const [cardSettings, setCardSettings] = useState({
    principalName: school.principalName || '',
    issueDate: school.idCardIssueDate || '2026-03-28',
    expiryDate: school.idCardExpiryDate || '2027-03-28',
    primaryColor: school.idCardPrimaryColor || '#ce1126',
    secondaryColor: school.idCardSecondaryColor || '#fff200',
    textColor: school.idCardTextColor || '#000000',
    accentColor: '#000000',
    borderColor: school.idCardBorderColor || '#000000',
    showPhoneOnFront: !!school.showPhoneOnFront,
    showPhoneOnBack: !!school.showPhoneOnBack,
    showDob: !!school.showDobOnCard,
    showStudentId: !!school.showStudentIdOnCard,
    showParentName: !!school.showParentNameOnCard,
    customText: school.idCardCustomText || '',
    showCustomText: !!school.showCustomTextOnCard,
    fontSize: 16,
    headerFontSize: school.idCardHeaderFontSize || 16,
    fontFamily: school.idCardFontFamily || 'Cairo',
    showPhoto: !!school.showPhotoOnCard,
    showGrade: !!school.showGradeOnCard,
    showBarcode: !!school.showBarcodeOnCard,
    showBarcodeOnFront: !!school.showBarcodeOnFront,
    showInstallmentBarcode: !!school.installmentBarcodeEnabled,
    orientation: 'horizontal' as 'horizontal' | 'vertical',
    namePosition: 'right' as 'right' | 'center',
    cardLogo: school.logo || '',
    showSchoolNameOnBack: true,
  });

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.includes(searchTerm) || (s.grade && s.grade.includes(searchTerm))
    );
  }, [students, searchTerm]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => s.name.includes(searchTerm));
  }, [staff, searchTerm]);

  const currentItems = activeCategory === 'students' ? filteredStudents : filteredStaff;
  const selectedItemsList = activeCategory === 'students' 
    ? students.filter(s => selectedStudentIds.includes(s.id))
    : staff.filter(s => selectedStaffIds.includes(s.id));

  const toggleAll = () => {
    if (activeCategory === 'students') {
      if (selectedStudentIds.length === filteredStudents.length) setSelectedStudentIds([]);
      else setSelectedStudentIds(filteredStudents.map(s => s.id));
    } else {
      if (selectedStaffIds.length === filteredStaff.length) setSelectedStaffIds([]);
      else setSelectedStaffIds(filteredStaff.map(s => s.id));
    }
  };

  const toggleItem = (id: string) => {
    if (activeCategory === 'students') {
      setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
    } else {
      setSelectedStaffIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
    }
  };

  const itemChunks = useMemo(() => {
    const list = selectedItemsList;
    const sortedList = [...list].sort((a, b) => {
        if (activeCategory === 'students') {
            return (a as Student).grade.localeCompare((b as Student).grade);
        }
        return 0;
    });
    const chunks = [];
    for (let i = 0; i < sortedList.length; i += cardsPerPage) {
      chunks.push(sortedList.slice(i, i + cardsPerPage));
    }
    return chunks;
  }, [selectedItemsList, cardsPerPage, activeCategory]);

  const saveSettings = () => {
    localDb.update('schools', school.id, {
      ...school,
      principalName: cardSettings.principalName,
      idCardIssueDate: cardSettings.issueDate,
      idCardExpiryDate: cardSettings.expiryDate,
      idCardPrimaryColor: cardSettings.primaryColor,
      idCardSecondaryColor: cardSettings.secondaryColor,
      idCardTextColor: cardSettings.textColor,
      showPhotoOnCard: cardSettings.showPhoto,
      showGradeOnCard: cardSettings.showGrade,
      showBarcodeOnCard: cardSettings.showBarcode,
      showBarcodeOnFront: cardSettings.showBarcodeOnFront,
      idCardHeaderFontSize: cardSettings.headerFontSize,
      idCardBorderColor: cardSettings.borderColor,
      idCardCustomText: cardSettings.customText,
      showCustomTextOnCard: cardSettings.showCustomText,
      logo: cardSettings.cardLogo,
    });
    setShowSettings(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCardSettings(prev => ({ ...prev, cardLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getDynamicFontSize = (text: string, baseSize: number) => {
    if (!text) return `${baseSize}px`;
    const length = text.length;
    if (length > 25) return `${baseSize * 0.7}px`;
    if (length > 18) return `${baseSize * 0.85}px`;
    return `${baseSize}px`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="text-center xl:text-right">
          <h2 className="text-3xl font-bold text-gray-900">إصدار هويات احترافية</h2>
          <p className="text-gray-500 font-semibold mt-1">تصميم وطباعة هويات تعريفية أنيقة للكادر والطلاب</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button onClick={() => setActiveCategory('students')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeCategory === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>الطلاب</button>
            <button onClick={() => setActiveCategory('staff')} className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${activeCategory === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>الكادر</button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button onClick={() => setPrintMode('both')} className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${printMode === 'both' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>الوجه والظهر</button>
            <button onClick={() => setPrintMode('front')} className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${printMode === 'front' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>الوجه فقط</button>
            <button onClick={() => setPrintMode('back')} className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${printMode === 'back' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>الظهر فقط</button>
          </div>

          <button onClick={() => setShowSettings(true)} className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
            <Settings className="w-5 h-5" />
            تخصيص القالب
          </button>
          
          <button
            onClick={() => handlePrint()}
            disabled={selectedItemsList.length === 0}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            طباعة ({selectedItemsList.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="البحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-12 pl-6 py-4 outline-none font-bold text-lg"
                />
              </div>
              <button
                onClick={toggleAll}
                className="px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black hover:bg-blue-100 transition-all"
              >
                {selectedItemsList.length === currentItems.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {currentItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-right group ${
                    (activeCategory === 'students' ? selectedStudentIds : selectedStaffIds).includes(item.id)
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-50 bg-white hover:border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {(item as any).photo ? <img src={(item as any).photo} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-gray-400" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-black text-gray-900 text-lg truncate">{item.name}</p>
                    <p className="text-sm font-bold text-gray-500">{(item as any).grade || (item as any).role}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${(activeCategory === 'students' ? selectedStudentIds : selectedStaffIds).includes(item.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-transparent'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-gray-900">معاينة التصميم</h3>
          </div>
          
          {selectedItemsList.length > 0 ? (
            <div className="space-y-8 sticky top-28">
              {/* Front Preview */}
              <div className="perspective-1000">
                <div 
                  className="w-[500px] h-[320px] mx-auto rounded-[2.5rem] shadow-2xl overflow-hidden relative border-8 border-white bg-white"
                  style={{ fontFamily: cardSettings.fontFamily || 'Cairo' }}
                >
                  <div className="relative h-full flex flex-col text-black">
                    {/* Background Grid + Watermark */}
                    <div className="absolute inset-0 z-0">
                      <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }}></div>
                      <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.08] pointer-events-none">
                        {cardSettings.cardLogo ? <img src={cardSettings.cardLogo} alt="Watermark" className="w-56 h-56 object-contain" /> : (school.logo && <img src={school.logo} alt="Watermark" className="w-56 h-56 object-contain" />)}
                      </div>
                    </div>

                    {/* Curved Gradient Side Design */}
                    <div 
                      className="absolute inset-y-0 left-0 w-[42%] z-10 shadow-xl" 
                      style={{ 
                        clipPath: 'ellipse(100% 100% at 0% 50%)',
                        background: `linear-gradient(135deg, ${cardSettings.primaryColor}, ${cardSettings.secondaryColor})`
                      }} 
                    />
                    
                    {/* Decorative Divider Line */}
                    <div 
                      className="absolute inset-y-0 left-[38%] w-1.5 z-20" 
                      style={{ 
                        backgroundColor: cardSettings.accentColor,
                        clipPath: 'path("M 0 0 C 45 100 45 220 0 320 L 10 320 C 55 220 55 100 10 0 Z")'
                      }} 
                    />
                    <div 
                      className="absolute inset-y-0 left-[40%] w-0.5 z-20 opacity-30" 
                      style={{ 
                        backgroundColor: 'white',
                        clipPath: 'path("M 0 0 C 45 100 45 220 0 320 L 5 320 C 50 220 50 100 5 0 Z")'
                      }} 
                    />

                    {/* Content Layers */}
                    <div className="relative z-40 flex flex-col h-full p-4 text-right" dir="rtl" style={{ color: cardSettings.textColor }}>
                      <div className="flex justify-between items-start mb-2 border-b border-gray-900 pb-1">
                        <div className="w-16 h-16 bg-white p-1 flex items-center justify-center">
                          {cardSettings.cardLogo ? <img src={cardSettings.cardLogo} alt="Logo" className="w-full h-full object-contain" /> : <Smartphone className="w-8 h-8 text-blue-600" />}
                        </div>
                        <div className="flex-1 text-center pt-1 overflow-hidden">
                          <p className="text-[11px] font-semibold leading-tight" style={{ color: cardSettings.textColor }}>مديرية تربية محافظة البصرة</p>
                          <h4 className="font-bold leading-tight mt-0.5 truncate" style={{ color: cardSettings.textColor, fontSize: `${cardSettings.headerFontSize}px` }}>{school.name}</h4>
                        </div>
                        <div className="w-16"></div>
                      </div>

                      <div className="flex flex-1 mt-1">
                        {/* RIGHT: Information */}
                        <div className={`flex-1 flex flex-col justify-center space-y-2 ${cardSettings.namePosition === 'center' ? 'px-8 text-center' : 'pr-2 pl-2'} font-bold`}>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] min-w-[70px]">الاســــم :</span>
                              <span className="leading-tight" style={{ fontSize: getDynamicFontSize(selectedItemsList[0].name, 18) }}>{selectedItemsList[0].name}</span>
                            </div>
                            {cardSettings.showDob && (
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] min-w-[70px]">التــــولد :</span>
                                <span className="text-[16px]">{(selectedItemsList[0] as any).dob || '---'}</span>
                              </div>
                            )}
                            {cardSettings.showGrade && (
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] min-w-[70px]">{activeCategory === 'students' ? 'الصــــف :' : 'الوظيفة :'}</span>
                                <span className="text-[16px]">{(selectedItemsList[0] as any).grade || (selectedItemsList[0] as any).role}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-dashed border-gray-300 flex flex-col space-y-0.5 mt-1 text-[12px]">
                            <div className="flex items-center gap-3">
                              <span className="min-w-[70px]">تاريخ الاصدار:</span>
                              <span className="font-mono tracking-wider">{cardSettings.issueDate}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="min-w-[70px]">تاريخ النفاذ:</span>
                              <span className="font-mono tracking-wider">{cardSettings.expiryDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* LEFT: Photo & Principal */}
                        <div className="w-[32%] flex flex-col items-center justify-start pt-1">
                          {cardSettings.showPhoto && (
                            <div className="w-24 h-24 bg-white p-0.5 shadow-sm overflow-hidden relative mb-2 border" style={{ borderColor: cardSettings.accentColor }}>
                              {(selectedItemsList[0] as any).photo ? (
                                <img src={(selectedItemsList[0] as any).photo} alt="Photo" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50 uppercase text-[8px] font-bold">
                                  {activeCategory === 'staff' ? 'Staff' : 'Student'}
                                </div>
                              )}
                            </div>
                          )}
                          {cardSettings.showBarcodeOnFront && (
                            <div className="bg-white p-0.5 rounded shadow-sm scale-75 origin-top mb-1 border border-gray-100">
                              <Barcode 
                                value={(selectedItemsList[0] as any).attendanceBarcode || (selectedItemsList[0] as any).barcode || '0000'} 
                                height={25} 
                                width={1.5} 
                                displayValue={false} 
                                background="transparent" 
                              />
                            </div>
                          )}
                          <div className="text-center mt-auto pb-2">
                            <p className="text-[12px] font-bold mb-0.5">مدير المدرسة</p>
                            <p className="font-bold leading-none" style={{ fontSize: getDynamicFontSize(cardSettings.principalName, 14) }}>{cardSettings.principalName}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back Preview */}
              <div className="perspective-1000">
                <div 
                  className="w-[500px] h-[320px] mx-auto rounded-[2.5rem] shadow-2xl overflow-hidden relative border-8 border-white bg-white"
                  style={{ fontFamily: cardSettings.fontFamily || 'Cairo' }}
                >
                      <div className="absolute inset-0 flex flex-col font-bold">
                        {/* Top Red Stripe */}
                        <div className="h-1/3 flex items-center justify-center relative overflow-hidden bg-[#ce1126]">
                          <h3 
                            className="text-white z-10 px-4 text-center" 
                            style={{ 
                              textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                              fontFamily: 'Cairo',
                              fontSize: `${cardSettings.headerFontSize * 1.5}px`
                            }}
                          >
                            {school.name}
                          </h3>
                        </div>
                         {/* Middle White Stripe */}
                        <div className="h-1/3 bg-white flex items-center justify-center relative">
                          <div className="flex items-center justify-between w-full px-12 z-10">
                            <span className="text-[#007a3d] text-4xl font-bold">الله</span>
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-white rounded-full p-1 shadow-md flex items-center justify-center border border-gray-100 scale-125 mb-1">
                                {cardSettings.cardLogo ? <img src={cardSettings.cardLogo} alt="Logo" className="w-full h-full object-contain" /> : <Smartphone className="w-10 h-10 text-blue-600" />}
                              </div>
                              {cardSettings.showCustomText && cardSettings.customText && (
                                <div className="mt-4 px-3 py-1 border-2 rounded-lg text-[10px] text-center font-bold max-w-xs" style={{ borderColor: cardSettings.borderColor }}>
                                  {cardSettings.customText}
                                </div>
                              )}
                            </div>
                            <span className="text-[#007a3d] text-4xl font-bold">أكبر</span>
                          </div>
                        </div>
                        {/* Bottom Black Stripe */}
                        <div className="h-1/3 flex flex-col items-center justify-center p-2 bg-[#000000]">
                          {cardSettings.showBarcode && (
                            <div className="bg-white rounded p-1 w-2/3 flex justify-center opacity-90 hover:opacity-100 transition-opacity">
                              <Barcode 
                                value={(selectedItemsList[0] as any).installmentBarcode || (selectedItemsList[0] as any).barcode || '0000'} 
                                height={35} 
                                width={2} 
                                displayValue={false} 
                                background="transparent" 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[3rem] h-[520px] flex flex-col items-center justify-center text-gray-400 p-12 text-center">
              <UserCheck className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-black text-lg">حدد شخصاً لمعاينة الهوية</p>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 font-black">
              <h2 className="text-2xl">تخصيص الهوية</h2>
              <button onClick={() => setShowSettings(false)} className="p-3 hover:bg-gray-200 rounded-2xl"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">اسم المدير</label>
                  <input
                    type="text"
                    value={cardSettings.principalName}
                    onChange={(e) => setCardSettings(prev => ({ ...prev, principalName: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">شعار المدرسة</label>
                  <div className="flex items-center gap-4">
                    {cardSettings.cardLogo && <img src={cardSettings.cardLogo} className="w-12 h-12 object-contain rounded-lg border" />}
                    <label className="flex-1 cursor-pointer bg-blue-50 text-blue-600 px-6 py-4 rounded-2xl font-black text-center hover:bg-blue-100 transition-all">
                      تغيير الشعار
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-4">الألوان الأساسية</label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 block text-center">اللون الأساسي</span>
                    <input type="color" value={cardSettings.primaryColor} onChange={(e) => setCardSettings(prev => ({ ...prev, primaryColor: e.target.value }))} className="w-full h-12 rounded-xl cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 block text-center">اللون الثانوي</span>
                    <input type="color" value={cardSettings.secondaryColor} onChange={(e) => setCardSettings(prev => ({ ...prev, secondaryColor: e.target.value }))} className="w-full h-12 rounded-xl cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 block text-center">قلم الخط</span>
                    <input type="color" value={cardSettings.accentColor} onChange={(e) => setCardSettings(prev => ({ ...prev, accentColor: e.target.value }))} className="w-full h-12 rounded-xl cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 block text-center">لون النص</span>
                    <input type="color" value={cardSettings.textColor} onChange={(e) => setCardSettings(prev => ({ ...prev, textColor: e.target.value }))} className="w-full h-12 rounded-xl cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">تاريخ الإصدار</label>
                  <input
                    type="date"
                    value={cardSettings.issueDate}
                    onChange={(e) => setCardSettings(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={cardSettings.expiryDate}
                    onChange={(e) => setCardSettings(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">النص التعريفي (الخلف)</label>
                <textarea
                  value={cardSettings.customText}
                  onChange={(e) => setCardSettings(prev => ({ ...prev, customText: e.target.value }))}
                  placeholder="مثال: يرجى تسليم هذه الهوية في حال العثور عليها..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100 min-h-[100px]"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-black text-gray-400">لون إطار النص</span>
                  <input type="color" value={cardSettings.borderColor} onChange={(e) => setCardSettings(prev => ({ ...prev, borderColor: e.target.value }))} className="w-12 h-8 rounded cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">موضع الاسم والمعلومات</label>
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button 
                    onClick={() => setCardSettings(p => ({ ...p, namePosition: 'right' }))} 
                    className={`flex-1 py-3 rounded-xl font-black transition-all ${cardSettings.namePosition === 'right' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    يمين
                  </button>
                  <button 
                    onClick={() => setCardSettings(p => ({ ...p, namePosition: 'center' }))} 
                    className={`flex-1 py-3 rounded-xl font-black transition-all ${cardSettings.namePosition === 'center' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    وسط
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">حجم خط العنوان الرئيسي</label>
                <div className="flex items-center gap-4 text-left" dir="ltr">
                  <input
                    type="range"
                    min="10"
                    max="28"
                    value={cardSettings.headerFontSize}
                    onChange={(e) => setCardSettings(prev => ({ ...prev, headerFontSize: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold min-w-[40px] text-center">
                    {cardSettings.headerFontSize}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setCardSettings(p => ({ ...p, showDob: !p.showDob }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showDob ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>تاريخ التولد</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showGrade: !p.showGrade }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showGrade ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>الصف/الوظيفة</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showPhoto: !p.showPhoto }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showPhoto ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>صورة الشخص</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showBarcode: !p.showBarcode }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showBarcode ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>الباركود (خلف)</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showBarcodeOnFront: !p.showBarcodeOnFront }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showBarcodeOnFront ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>الباركود (وجه)</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showCustomText: !p.showCustomText }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showCustomText ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>نص الخلف</button>
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100">
              <button onClick={saveSettings} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all">حفظ الإعدادات</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Content */}
      <div className="hidden">
        <div ref={printRef} className="print-container" dir="rtl">
          <style>{`
            @media print {
              @page { size: A4; margin: 0; }
              .print-page { 
                width: 210mm; height: 297mm; padding: 10mm; 
                display: grid; grid-template-columns: repeat(2, 1fr); 
                gap: 5mm; page-break-after: always; direction: rtl;
                align-content: start;
              }
              .id-card-horizontal {
                width: 86mm; height: 54mm; border-radius: 4mm; 
                overflow: hidden; position: relative; border: 0.1mm solid #eee;
                background: white; -webkit-print-color-adjust: exact;
              }
            }
          `}</style>
          {/* Render All Fronts First */}
          {(printMode === 'both' || printMode === 'front') && itemChunks.map((chunk, chunkIdx) => (
            <div key={`fronts-page-${chunkIdx}`} className="print-page">
              {chunk.map(item => (
                <div key={`front-${item.id}`} className="id-card-horizontal">
                  <div className="relative h-full flex flex-col text-black bg-white overflow-hidden" style={{ fontFamily: cardSettings.fontFamily || 'Cairo' }}>
                    <div className="absolute inset-0 z-0">
                      <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '8px 8px' }}></div>
                      {cardSettings.cardLogo && (
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.08]">
                          <img src={cardSettings.cardLogo} className="w-40 h-40 object-contain" />
                        </div>
                      )}
                    </div>
                    <div 
                      className="absolute inset-y-0 left-0 w-[42%] z-10" 
                      style={{ 
                        clipPath: 'ellipse(100% 100% at 0% 50%)',
                        background: `linear-gradient(135deg, ${cardSettings.primaryColor}, ${cardSettings.secondaryColor})`
                      }} 
                    />
                    <div 
                      className="absolute inset-y-0 left-[38%] w-1 z-20" 
                      style={{ 
                        backgroundColor: cardSettings.accentColor,
                        clipPath: 'path("M 0 0 C 45 100 45 220 0 320 L 8 320 C 53 220 53 100 8 0 Z")'
                      }} 
                    />
                    
                    <div className="relative z-40 flex flex-col h-full p-4 text-right" dir="rtl" style={{ color: cardSettings.textColor }}>
                      <div className="flex justify-between items-start mb-2 border-b border-gray-900 pb-1">
                        <div className="w-14 h-14 bg-white p-0.5 flex items-center justify-center">
                          {cardSettings.cardLogo ? <img src={cardSettings.cardLogo} className="w-full h-full object-contain" /> : <Smartphone className="w-6 h-6 text-blue-600" />}
                        </div>
                        <div className="flex-1 text-center pt-1 overflow-hidden px-2">
                          <p className="text-[9px] font-semibold leading-tight">مديرية تربية محافظة البصرة</p>
                          <h4 className="font-bold mt-0.5 truncate" style={{ fontSize: `${cardSettings.headerFontSize * 0.85}px` }}>{school.name}</h4>
                        </div>
                        <div className="w-14"></div>
                      </div>
                      <div className="flex flex-1 mt-1">
                        <div className={`flex-1 flex flex-col justify-center space-y-1.5 ${cardSettings.namePosition === 'center' ? 'px-4 text-center' : 'pr-4 pl-1'} font-bold`}>
                           <div className="flex items-center gap-1.5 leading-tight">
                             <span className="text-[10px] min-w-[55px]">الاســــم :</span>
                             <span style={{ fontSize: getDynamicFontSize(item.name, 14) }}>{item.name}</span>
                           </div>
                           {cardSettings.showDob && (
                             <div className="flex items-center gap-1.5 leading-tight">
                               <span className="text-[10px] min-w-[55px]">التــــولد :</span>
                               <span className="text-[11px]">{(item as any).dob || '---'}</span>
                             </div>
                           )}
                           {cardSettings.showGrade && (
                             <div className="flex items-center gap-1.5 leading-tight">
                               <span className="text-[10px] min-w-[55px]">الصف:</span>
                               <span className="text-[11px]">{(item as any).grade || (item as any).role}</span>
                             </div>
                           )}
                           <div className="pt-2 border-t border-dashed border-gray-300 flex flex-col space-y-0.5 mt-1 text-[9px]">
                              <div className="flex items-center gap-2">
                               <span className="text-[10px] min-w-[55px]">تاريخ الاصدار:</span>
                               <span className="font-mono">{cardSettings.issueDate}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className="text-[10px] min-w-[55px]">تاريخ النفاذ:</span>
                                 <span className="font-mono">{cardSettings.expiryDate}</span>
                              </div>
                           </div>
                        </div>
                        <div className="w-[34%] flex flex-col items-center pt-1">
                          {cardSettings.showPhoto && (
                            <div className="w-20 h-20 bg-white p-0.5 shadow-sm overflow-hidden relative mb-2 border" style={{ borderColor: cardSettings.accentColor }}>
                              {(item as any).photo ? <img src={(item as any).photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-50" />}
                            </div>
                          )}
                          {cardSettings.showBarcodeOnFront && (
                            <div className="bg-white p-0.5 rounded shadow-sm scale-90 mb-1 border border-gray-100">
                              <Barcode 
                                value={(item as any).attendanceBarcode || (item as any).barcode || '0000'} 
                                height={20} 
                                width={1} 
                                displayValue={false} 
                                background="transparent" 
                              />
                            </div>
                          )}
                          <p className="text-[10px] font-bold mb-0.5 leading-none">مدير المدرسة</p>
                          <p className="font-bold leading-none truncate w-full text-center" style={{ fontSize: getDynamicFontSize(cardSettings.principalName, 10) }}>{cardSettings.principalName}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Render All Backs Second */}
          {(printMode === 'both' || printMode === 'back') && itemChunks.map((chunk, chunkIdx) => {
            // Swap every two items in the chunk for back-side alignment (Left <-> Right)
            const swappedChunk = [];
            for (let i = 0; i < chunk.length; i += 2) {
              if (i + 1 < chunk.length) {
                swappedChunk.push(chunk[i + 1]);
                swappedChunk.push(chunk[i]);
              } else {
                swappedChunk.push(chunk[i]);
              }
            }
            
            return (
              <div key={`backs-page-${chunkIdx}`} className="print-page">
                {swappedChunk.map(item => (
                  <div key={`back-${item.id}`} className="id-card-horizontal">
                    <div className="relative h-full flex flex-col overflow-hidden bg-white font-bold">
                      {/* Top Red Stripe */}
                      <div className="h-1/3 flex items-center justify-center bg-[#ce1126]">
                        <h4 
                          className="text-white text-center px-2"
                          style={{ 
                            textShadow: '0.5px 0.5px 0 #000, -0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000',
                            fontSize: `${cardSettings.headerFontSize * 0.75}px`
                          }}
                        >
                          {school.name}
                        </h4>
                      </div>
                       {/* Middle White Stripe */}
                      <div className="h-1/3 bg-white flex items-center justify-center relative">
                        <div className="flex items-center justify-between w-full px-8 z-10">
                          <span className="text-[#007a3d] text-[16px] font-bold">الله</span>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 bg-white rounded-full p-0.5 border border-gray-100 scale-110 mb-0.5">
                              {cardSettings.cardLogo ? <img src={cardSettings.cardLogo} className="w-full h-full object-contain" /> : <Smartphone className="w-4 h-4 text-blue-600" />}
                            </div>
                            {cardSettings.showCustomText && cardSettings.customText && (
                              <div className="mt-1 px-2 py-0.5 border-2 rounded text-[6px] text-center font-bold max-w-[60px] leading-tight" style={{ borderColor: cardSettings.borderColor }}>
                                {cardSettings.customText}
                              </div>
                            )}
                          </div>
                          <span className="text-[#007a3d] text-[16px] font-bold">أكبر</span>
                        </div>
                      </div>
                      {/* Bottom Black Stripe */}
                      <div className="h-1/3 flex items-center justify-center p-2 bg-[#000000]">
                        {cardSettings.showBarcode && (
                          <div className="bg-white rounded-sm p-0.5 w-full flex justify-center">
                            <Barcode value={(item as any).installmentBarcode || (item as any).barcode || '0000'} height={18} width={1} displayValue={false} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
