import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { QRCodeSVG } from 'qrcode.react';

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
            {settings.showGrade && <p className="text-[3px] font-bold text-gray-500 truncate">{type === 'student' ? item.grade : (item as any).role}</p>}
            {type === 'student' && (item as any).phone && <p className="text-[3px] font-bold text-gray-500 truncate" dir="ltr">{(item as any).phone}</p>}
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
  const [paperSize, setPaperSize] = useState<'A4' | 'A3'>('A4');
  const [cardsPerPage, setCardsPerPage] = useState<4 | 6 | 8 | 10 | 12>(8);
  const [viewMode, setViewMode] = useState<'design' | 'a4'>('design');
  
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

  const getPageStyle = () => {
    const pageWidth = paperSize === 'A4' ? '210mm' : '297mm';
    const pageHeight = paperSize === 'A4' ? '297mm' : '420mm';
    
    return `
      @page {
        size: ${paperSize};
        margin: 5mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-container {
          width: 100%;
        }
        .print-page {
          width: ${pageWidth};
          min-height: ${pageHeight};
          padding: 10mm;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 85.6mm);
          grid-auto-rows: 53.98mm;
          gap: 4mm 2mm;
          justify-content: center;
          align-content: start;
          page-break-after: always;
          background: white;
        }
        .print-card {
           width: 85.6mm;
           height: 53.98mm;
           border: 0.1mm solid #eee;
           border-radius: 2mm;
           overflow: hidden;
           position: relative;
           background: white;
           break-inside: avoid;
           box-sizing: border-box;
        }
      }
    `;
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ 
    contentRef: printRef,
    pageStyle: getPageStyle() 
  });

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

  const renderFrontCard = (item: any) => (
    <div className="relative h-full flex flex-col text-black bg-white overflow-hidden font-sans" style={{ fontFamily: cardSettings.fontFamily || 'Cairo' }}>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '8px 8px' }}></div>
        {cardSettings.cardLogo && (
          <div className="absolute top-1/2 right-0 -translate-y-1/2 -translate-x-1/4 opacity-[0.04]">
            <img src={cardSettings.cardLogo} className="w-48 h-48 object-contain" />
          </div>
        )}
      </div>
      
      <div 
        className="absolute inset-y-0 left-0 w-[41%] z-10" 
        style={{ 
          clipPath: 'polygon(0 0, 100% 0, 75% 100%, 0 100%)',
          background: `linear-gradient(135deg, ${cardSettings.primaryColor}, ${cardSettings.secondaryColor})`
        }} 
      />
      <div 
        className="absolute inset-y-0 left-[41%] w-[1.5mm] z-20" 
        style={{ 
          backgroundColor: cardSettings.accentColor,
          clipPath: 'polygon(0 0, 100% 0, 75% 100%, -25% 100%)'
        }} 
      />

      <div className="relative z-40 flex flex-col h-full p-0 text-right" dir="rtl" style={{ color: cardSettings.textColor || '#000' }}>
        <div className="flex items-center justify-between h-[15mm] px-3 bg-white/60 backdrop-blur-md border-b border-gray-100/30 z-50">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white p-1 rounded-md shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
              {cardSettings.cardLogo ? <img src={cardSettings.cardLogo} className="w-full h-full object-contain" /> : <Smartphone className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex flex-col pr-1">
              <p className="text-[7.5px] font-bold text-[#800000] mb-[1px] tracking-tight">مديرية تربية محافظة البصرة</p>
              <h4 className="font-black leading-none text-gray-900" style={{ fontSize: `${parseInt(cardSettings.headerFontSize.toString()) * 0.75}px` }}>{school.name}</h4>
            </div>
          </div>
          
          {cardSettings.showBarcodeOnFront && (
            <div className="bg-white p-[2px] rounded-lg shadow-sm shrink-0 border-2 border-gray-100 border-dashed z-50">
              <QRCodeSVG 
                value={item?.attendanceBarcode || item?.barcode || '0000'} 
                size={38} 
                level="M"
              />
            </div>
          )}
        </div>
        
        <div className="flex flex-1 relative">
          <div className="w-[59%] flex flex-col justify-center px-4 py-2 space-y-3">
            <div className="flex flex-col">
              <span className="text-[8.5px] font-black text-[#800000] mb-0.5">الاسم الرباعي</span>
              <span className="font-black leading-tight text-gray-800" style={{ fontSize: getDynamicFontSize(item?.name, cardSettings.fontSize + 1) }}>{item?.name}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-2 mt-1">
              {cardSettings.showGrade && (
                <div className="flex flex-col border-r-2 border-gray-100 pr-1.5">
                  <span className="text-[7.5px] font-black text-[#800000] mb-[1px]">الصف</span>
                  <span className="font-black text-[10.5px] text-gray-900 leading-none">{item?.grade || (item as any)?.role || '---'}</span>
                </div>
              )}
              <div className="flex flex-col border-r-2 border-gray-100 pr-1.5">
                <span className="text-[7.5px] font-black text-[#800000] mb-[1px]">العام الدراسي</span>
                <span className="font-black text-[10.5px] text-gray-900 leading-none">{school.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear()+1}`}</span>
              </div>
              
              {activeCategory === 'students' && (
                <div className="flex flex-col border-r-2 border-gray-100 pr-1.5">
                  <span className="text-[7.5px] font-black text-[#800000] mb-[1px]">التولد</span>
                  <span className="font-black text-[10.5px] text-gray-900 leading-none" dir="ltr">{item?.dob || '---'}</span>
                </div>
              )}

              {activeCategory === 'students' && item?.phone && (
                <div className="flex flex-col border-r-2 border-gray-100 pr-1.5">
                  <span className="text-[7.5px] font-black text-[#800000] mb-[1px]">هاتف ولي الأمر</span>
                  <span className="font-black text-[10.5px] text-gray-900 leading-none" dir="ltr">{item.phone}</span>
                </div>
              )}
            </div>

            {/* Dates removed from front */}
          </div>
          
          <div className="w-[41%] flex flex-col items-center justify-between py-2.5 px-2 z-50 relative">
            {cardSettings.showPhoto && (
              <div className="w-[20mm] h-[25mm] bg-white p-1 shadow-md border-2 overflow-hidden relative rounded-xl mt-0" style={{ borderColor: 'transparent' }}>
                <div className="absolute inset-0 border-2 rounded-xl z-10 pointer-events-none" style={{ borderColor: cardSettings.accentColor }}></div>
                {item?.photo ? <img src={item.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-50 flex items-center justify-center text-[8px] text-gray-300 font-bold uppercase">{activeCategory === 'staff' ? 'Staff' : 'Student'}</div>}
              </div>
            )}
            
            <div className="text-center mt-auto w-[25mm] bg-white rounded-lg py-1.5 px-1 shadow-sm border border-gray-100/50 relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: cardSettings.primaryColor }}></div>
              <p className="text-[6.5px] font-black text-[#800000] mb-0.5 uppercase tracking-wider">مدير المدرسة</p>
              <p className="font-black text-gray-800 truncate" style={{ fontSize: getDynamicFontSize(cardSettings.principalName, 9) }}>{cardSettings.principalName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackCard = (item: any) => (
    <div className="relative h-full flex flex-col text-black bg-white overflow-hidden font-sans border-0 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]" style={{ fontFamily: cardSettings.fontFamily || 'Cairo' }}>
      
      {/* Background with subtle dots and watermark */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }}></div>
        {cardSettings.cardLogo && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05] pointer-events-none">
            <img src={cardSettings.cardLogo} className="w-56 h-56 object-contain grayscale" />
          </div>
        )}
      </div>

      {/* Decorative swoop mirrored from front */}
      <div 
        className="absolute inset-y-0 right-0 w-[41%] z-10 opacity-[0.15]" 
        style={{ 
          clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)',
          background: `linear-gradient(225deg, ${cardSettings.primaryColor}, ${cardSettings.secondaryColor})`
        }} 
      />
      <div className="absolute bottom-0 inset-x-0 h-[1.5mm] z-20" style={{ backgroundColor: cardSettings.primaryColor }}></div>

      {/* Foreground Content */}
      <div className="relative z-40 flex flex-col h-full text-right" dir="rtl">
        {/* Header - Professionally aligned with Dates moved here */}
        <div className="flex items-center justify-between h-[15mm] px-4 bg-white/80 backdrop-blur-md border-b-2 border-[#800000]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white p-1 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
              {cardSettings.cardLogo ? <img src={cardSettings.cardLogo} className="w-full h-full object-contain" /> : <Smartphone className="w-5 h-5 text-[#800000]" />}
            </div>
            <div className="flex flex-col">
            </div>
          </div>
          
          <div className="flex items-center gap-2 pr-2">
            <div className="flex flex-col items-center bg-white border border-gray-100 rounded px-3 py-1.5 min-w-[28mm]">
              <span className="text-[9px] font-black text-[#800000] uppercase tracking-tighter opacity-80 mb-0.5">الإصدار</span>
              <span className="text-[14px] font-black text-gray-900 leading-none" dir="ltr">{cardSettings.issueDate}</span>
            </div>
            <div className="flex flex-col items-center bg-white border border-gray-100 rounded px-3 py-1.5 min-w-[28mm]">
              <span className="text-[9px] font-black text-[#800000] uppercase tracking-tighter opacity-80 mb-0.5">النفاذ</span>
              <span className="text-[14px] font-black text-gray-900 leading-none" dir="ltr">{cardSettings.expiryDate}</span>
            </div>
          </div>
        </div>

        {/* Content Area - Clean and Professional with requested instructions */}
        <div className="flex-1 px-8 py-3 flex flex-col justify-center gap-3">
           <div className="space-y-1.5">
              {[
                "1- احضار البطاقة يومياً للدخول والخروج وتسجيل الحضور",
                "2- دفع القسط السريع عن طريق البطاقة",
                "3- في حال فقدانها ابلاغ الادارة"
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: cardSettings.primaryColor }}></div>
                  <p className="text-[9px] font-black text-gray-800 leading-tight italic">{text}</p>
                </div>
              ))}
           </div>

           {cardSettings.showCustomText && cardSettings.customText && (
             <div className="mt-1 p-3 bg-gray-50/50 border-r-[3px] border-[#800000] rounded-sm">
                <p className="text-[9px] font-black text-[#800000] leading-relaxed">
                  {cardSettings.customText}
                </p>
             </div>
           )}
        </div>

        {/* Footer - Centered Barcode Section */}
        <div className="px-8 pb-5 mt-auto flex flex-col items-center">
          {cardSettings.showBarcode && (
             <div className="flex flex-col items-center bg-white border border-gray-100 px-6 py-2 rounded-xl shadow-sm mb-3">
                <div className="scale-x-[1.6] scale-y-[0.9] origin-center h-6 flex items-center overflow-hidden">
                  <Barcode value={item?.installmentBarcode || item?.barcode || '0000'} height={30} width={1} displayValue={false} margin={0} background="transparent" />
                </div>
                <p className="text-gray-900 font-mono text-[9px] font-bold tracking-[5px] mt-1.5 italic">
                  {item?.installmentBarcode || item?.barcode || '0000'}
                </p>
                <span className="text-[6px] font-black text-[#800000] mt-1 uppercase opacity-60">باركود الدفع السريع</span>
             </div>
          )}

          <div className="w-full border-t border-gray-100 pt-3 flex justify-between items-center text-[7.5px] font-black text-gray-400">
             <div className="flex gap-3">
                <span>البصرة - العراق</span>
                <span className="opacity-50">|</span>
                <span>© {new Date().getFullYear()}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="space-y-2">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-3">
        <div className="text-center xl:text-right">
          <h2 className="text-xl font-bold text-gray-900">إصدار هويات احترافية</h2>
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

          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as any)} className="bg-transparent font-black text-sm px-2 py-1 outline-none text-gray-700 cursor-pointer">
              <option value="A4">A4</option>
              <option value="A3">A3</option>
            </select>
            <div className="w-px bg-gray-300 mx-1"></div>
            <select value={cardsPerPage} onChange={(e) => setCardsPerPage(Number(e.target.value) as any)} className="bg-transparent font-black text-sm px-2 py-1 outline-none text-gray-700 cursor-pointer">
              <option value={4}>4 بالصفحة</option>
              <option value={6}>6 بالصفحة</option>
              <option value={8}>8 بالصفحة</option>
              <option value={10}>10 بالصفحة</option>
              <option value={12}>12 بالصفحة</option>
            </select>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="البحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-12 pl-6 py-2 outline-none font-bold text-lg"
                />
              </div>
              <button
                onClick={toggleAll}
                className="px-8 py-2 bg-blue-50 text-blue-600 rounded-2xl font-black hover:bg-blue-100 transition-all"
              >
                {selectedItemsList.length === currentItems.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {currentItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center gap-2 p-5 rounded-3xl border-2 transition-all text-right group ${
                    (activeCategory === 'students' ? selectedStudentIds : selectedStaffIds).includes(item.id)
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-50 bg-white hover:border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {(item as any).photo ? <img src={(item as any).photo} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-gray-400" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-black text-gray-900 text-lg truncate">{item.name}</p>
                    <p className="text-sm font-bold text-gray-500">{(item as any).grade || (item as any).role}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${(activeCategory === 'students' ? selectedStudentIds : selectedStaffIds).includes(item.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-transparent'}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-gray-900">معاينة التصميم</h3>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('design')} 
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'design' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                بطاقة واحدة
              </button>
              <button 
                onClick={() => setViewMode('a4')} 
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'a4' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                ترتيب A4
              </button>
            </div>
          </div>
          
          {selectedItemsList.length > 0 ? (
            <div className="space-y-2 sticky top-28">
              {viewMode === 'design' ? (
                <>
                  {/* Front Preview */}
                  <div className="perspective-1000 mb-[40px]">
                    <div 
                      className="w-[85.6mm] h-[53.98mm] mx-auto shadow-2xl overflow-hidden relative border border-gray-200 bg-white scale-[1.5] origin-top rounded-xl"
                    >
                      {renderFrontCard(selectedItemsList[0])}
                    </div>
                  </div>

                  {/* Back Preview */}
                  <div className="perspective-1000 mt-[70px] mb-[40px]">
                    <div 
                      className="w-[85.6mm] h-[53.98mm] mx-auto shadow-2xl overflow-hidden relative border border-gray-200 bg-white scale-[1.5] origin-top rounded-xl"
                    >
                      {renderBackCard(selectedItemsList[0])}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Layout Preview */}
                  <div className="bg-gray-200 p-5 rounded-2xl shadow-inner overflow-auto max-h-[800px] custom-scrollbar flex justify-center">
                  <div 
                    className="bg-white shadow-2xl p-[8mm] origin-top scale-[0.6] origin-top-center mb-[-120mm]" 
                    style={{ width: paperSize === 'A4' ? '210mm' : '297mm', minHeight: paperSize === 'A4' ? '297mm' : '420mm' }}
                    dir="rtl"
                  >
                    <div className="grid grid-cols-2 justify-center gap-x-[2mm] gap-y-[4mm] self-start" style={{ gridAutoRows: '53.98mm' }}>
                      {selectedItemsList.slice(0, cardsPerPage).map((item, idx) => (
                        <div key={idx} className="w-[85.6mm] h-[53.98mm] border-[0.1mm] border-gray-200 rounded-lg overflow-hidden relative break-inside-avoid bg-white">
                          {renderFrontCard(item)}
                        </div>
                    ))}
                    </div>
                  </div>
                </div>
                 <p className="text-center text-gray-500 mt-4 font-bold text-sm">عرض معاينة طباعة {paperSize} (أول {cardsPerPage} كروت)</p>
                </>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl h-[520px] flex flex-col items-center justify-center text-gray-400 p-4 text-center">
              <UserCheck className="w-6 h-6 mb-4 opacity-20" />
              <p className="font-black text-lg">حدد شخصاً لمعاينة الهوية</p>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="integrated-page">
          <div className="modal-content">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 font-black">
              <h2 className="text-lg">تخصيص الهوية</h2>
              <button onClick={() => setShowSettings(false)} className="p-3 hover:bg-gray-200 rounded-2xl"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">اسم المدير</label>
                  <input
                    type="text"
                    value={cardSettings.principalName}
                    onChange={(e) => setCardSettings(prev => ({ ...prev, principalName: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 min-h-[38px] font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">شعار المدرسة</label>
                  <div className="flex items-center gap-2">
                    {cardSettings.cardLogo && <img src={cardSettings.cardLogo} className="w-6 h-6 object-contain rounded-lg border" />}
                    <label className="flex-1 cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 min-h-[38px] rounded-2xl font-black text-center hover:bg-blue-100 transition-all">
                      تغيير الشعار
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-4">الألوان الأساسية</label>
                <div className="grid grid-cols-4 gap-2">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">تاريخ الإصدار</label>
                  <input
                    type="date"
                    value={cardSettings.issueDate}
                    onChange={(e) => setCardSettings(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 min-h-[38px] font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">تاريخ النفاذ</label>
                  <input
                    type="date"
                    value={cardSettings.expiryDate}
                    onChange={(e) => setCardSettings(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 min-h-[38px] font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">النص التعريفي (الخلف)</label>
                <textarea
                  value={cardSettings.customText}
                  onChange={(e) => setCardSettings(prev => ({ ...prev, customText: e.target.value }))}
                  placeholder="مثال: يرجى تسليم هذه الهوية في حال العثور عليها..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 min-h-[38px] font-bold outline-none focus:ring-4 focus:ring-blue-100 min-h-[100px]"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">حجم خط المدرسة</label>
                  <div className="flex items-center gap-2 text-left" dir="ltr">
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

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">حجم خط الاسم</label>
                  <div className="flex items-center gap-2 text-left" dir="ltr">
                    <input
                      type="range"
                      min="10"
                      max="24"
                      value={cardSettings.fontSize}
                      onChange={(e) => setCardSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold min-w-[40px] text-center">
                      {cardSettings.fontSize}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setCardSettings(p => ({ ...p, showDob: !p.showDob }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showDob ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>تاريخ التولد</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showGrade: !p.showGrade }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showGrade ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>الصف/الوظيفة</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showPhoto: !p.showPhoto }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showPhoto ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>صورة الشخص</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showBarcode: !p.showBarcode }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showBarcode ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>الباركود (خلف)</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showBarcodeOnFront: !p.showBarcodeOnFront }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showBarcodeOnFront ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>الباركود (وجه)</button>
                <button onClick={() => setCardSettings(p => ({ ...p, showCustomText: !p.showCustomText }))} className={`p-4 rounded-2xl border-2 font-black transition-all ${cardSettings.showCustomText ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>نص الخلف</button>
              </div>
            </div>
            <div className="p-5 bg-gray-50 border-t border-gray-100">
              <button onClick={saveSettings} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all">حفظ الإعدادات</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Content */}
      <div className="hidden">
        <div ref={printRef} className="print-container" dir="rtl">
          {/* Render All Fronts First */}
          {(printMode === 'both' || printMode === 'front') && itemChunks.map((chunk, chunkIdx) => (
            <div key={`fronts-page-${chunkIdx}`} className="print-page">
              {chunk.map(item => (
                <div key={`front-${item.id}`} className="print-card">
                  {renderFrontCard(item)}
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
                  <div key={`back-${item.id}`} className="print-card">
                    {renderBackCard(item)}
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
