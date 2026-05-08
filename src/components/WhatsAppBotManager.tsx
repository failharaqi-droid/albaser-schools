import { useState, useMemo } from 'react';
import { School, WhatsAppSettings, Student, ParentNotification, WhatsAppTemplate } from '../types';
import { localDb } from '../services/localDb';
import { WhatsAppService } from '../services/WhatsAppService';
import { 
  MessageSquare, 
  Settings, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Bot, 
  History,
  Save,
  Zap,
  Info,
  Clock,
  Layout,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';

interface WhatsAppBotManagerProps {
  school: School;
  students: Student[];
  notifications: ParentNotification[];
  settings: WhatsAppSettings[];
  templates: WhatsAppTemplate[];
  canModify?: boolean;
}

export default function WhatsAppBotManager({ school, students, notifications, settings, templates, canModify = true }: WhatsAppBotManagerProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'history' | 'test' | 'broadcast' | 'templates'>('settings');

  const [broadcastData, setBroadcastData] = useState({
    target: 'all' as 'all' | 'grade' | 'specific',
    grade: '',
    message: '',
    selectedStudentIds: [] as string[]
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string } | null>(null);

  const [templateName, setTemplateName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const schoolTemplates = useMemo(() => 
    templates.filter(t => t.schoolId === school.id),
    [templates, school.id]
  );

  const GRADES = [
    "الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي",
    "الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط",
    "الرابع الإعدادي", "الخامس الإعدادي", "السادس الإعدادي"
  ];

  const currentSettings = useMemo(() => {
    const s = settings.find(s => s.schoolId === school.id);
    if (!s) {
      return {
        schoolId: school.id,
        isEnabled: false,
        useGateway: false,
        apiMethod: 'GET',
        apiUrl: '',
        apiToken: '',
        apiSecret: '',
        apiBody: '',
        adminPhone: '',
        attendancePresentTemplate: '✨ *إشعار حضور مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنود إعلامكم بدخول الطالب للمدرسة بسلام.\n\n- الصف: {grade}\n- الوقت: {time}\n- التاريخ: {date}\n\nنتمنى لابننا يوماً دراسياً ممتعاً.',
        attendanceAbsentTemplate: '⚠️ *تنبيه غياب - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنحيطكم علماً بأن الطالب متغيب عن المدرسة لهذا اليوم {date}.\n\nيرجى تزويد الإدارة بعذر الغياب عبر الواتساب أو مراجعة المدرسة.\nشكراً لتعاونكم.',
        paymentTemplate: '✅ *وصل استلام إلكتروني - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nتم استلام مبلغ الدفعة بنجاح.\n\n- المبلغ المسدد: {amount}\n- الرصيد المتبقي: {remain}\n- التاريخ: {date}\n\nشكراً لالتزامكم بالسداد.',
        violationTemplate: '📝 *تنبيه إداري - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nتم تسجيل ملحوظة/مخالفة بحق الطالب.\n\n- السبب: {reason}\n- التاريخ: {date}\n\nيرجى مراجعة إدارة شؤون الطلاب للمتابعة.',
        welcomeTemplate: '🎓 *أهلاً بكم في مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب المحترم:\nنرحب بانضمام ابننا *{name}* إلى أسرتنا التعليمية.\n\n📜 *حكمة اليوم:*\n"العلم يرفع بيتاً لا عماد له.. والجهل يهدم بيت العز والكرم"\n\n📋 *معلومات الطالب:*\n- الصف: {grade}\n- المبلغ الكلي: {total}\n- الرقم الأكاديمي: {barcode}\n\n📝 *تعليمات وقوانين المدرسة:*\n1. الالتزام بالزي الموحد.\n2. الحضور والمغادرة في المواعيد المحددة.\n3. المحافظة على نظافة وممتلكات المدرسة.\n4. يمنع جلب الهواتف الذكية.\n\nنتمنى لابننا عاماً دراسياً حافلاً بالنجاح والتفوق.',
        summaryTemplate: '📊 *تقرير يومي إجمالي - مدرسة {school_name}*\nبتاريخ: {date}\n\n*الطلاب الغائبين:*\n{absent_list}\n\n*الطلاب المخالفين:*\n{violation_list}',
        reminderTemplate: '*💰 تذكير بسداد القسط - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنود تذكيركم بموقف الحساب الخاص بالطالب:\n\n- القسط الكلي: {total}\n- إجمالي الواصل: {paid_total}\n- المبلغ المتبقي: {remain}\n\nيرجى مراجعة قسم الحسابات لتسوية المتبقي لضمان استمرار الخدمات التعليمية.\nشكراً لتفهمكم.',
        absenceWarning6Template: '⚠️ *تنبيه تجاوز الغياب (6 أيام) - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنود إعلامكم بأن الطالب قد تجاوز 6 أيام من الغياب.\nيرجى الانتباه لضمان عدم تأثر المستوى الدراسي.\n\nنتمنى لابننا التوفيق.',
        absenceSummons10Template: '🚨 *استدعاء ولي أمر (10 أيام غياب) - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنحيطكم علماً بأن الطالب قد تجاوز 10 أيام غياب.\n*يرجى مراجعة إدارة المدرسة غداً فوراً* لمناقشة وضع الطالب الدراسي.\n\nحضوركم ضروري جداً.',
        absenceExpulsion12Template: '🚫 *إنذار نهائي بالفصل (12 يوم غياب) - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنبلغكم رسمياً بأن الطالب قد تجاوز 12 يوماً من الغياب.\nهذا يعتبر *إنذاراً نهائياً بالفصل* من المدرسة حسب اللوائح المتبعة.\n\nيرجى مراجعة الإدارة فوراً.',
        statusReportTemplate: '📊 *تقرير حالة الطالب - مدرسة {school_name}*\n\nحضرة ولي امر الطالب: {parent}\nابننا العزيز: {name}\nالصف: {grade}\nالمبلغ الكلي: {total}\nالواصل: {paid}\nالمتبقي: {remain}\nاخر دفعة: {last_payment}\nتاريخ اخر دفعة: {last_payment_date}\n\nالغيابات بالعدد: {absences}\nالتنبيهات عدد: {alerts}\nالاستدعاءات عدد: {summons}\nالانذارات عدد: {warnings}\n\nنتمنى لابننا كل التوفيق والنجاح.',
        messageDelay: 2
      } as Partial<WhatsAppSettings>;
    }
    return s;
  }, [settings, school.id]);

  const [formData, setFormData] = useState({
    isEnabled: currentSettings.isEnabled || false,
    useGateway: currentSettings.useGateway || false,
    apiMethod: currentSettings.apiMethod || 'GET',
    apiUrl: currentSettings.apiUrl || '',
    apiToken: currentSettings.apiToken || '',
    apiSecret: currentSettings.apiSecret || '',
    apiBody: currentSettings.apiBody || '',
    adminPhone: currentSettings.adminPhone || '',
    attendancePresentTemplate: currentSettings.attendancePresentTemplate || '✨ *إشعار حضور مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنود إعلامكم بدخول الطالب للمدرسة بسلام.\n\n- الصف: {grade}\n- الوقت: {time}\n- التاريخ: {date}',
    attendanceAbsentTemplate: currentSettings.attendanceAbsentTemplate || '⚠️ *تنبيه غياب - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنحيطكم علماً بأن الطالب متغيب عن المدرسة لهذا اليوم {date}.',
    paymentTemplate: currentSettings.paymentTemplate || '✅ *وصل استلام إلكتروني - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nتم استلام مبلغ الدفعة بنجاح.\n\n- المبلغ المسدد: {amount}\n- الرصيد المتبقي: {remain}',
    violationTemplate: currentSettings.violationTemplate || '📝 *تنبيه إداري - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nتم تسجيل ملحوظة/مخالفة بحق الطالب.\n\n- السبب: {reason}',
    welcomeTemplate: currentSettings.welcomeTemplate || '🎓 *أهلاً بكم في مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب المحترم:\nنرحب بانضمام ابننا *{name}* إلى أسرتنا التعليمية.\n\n📜 *حكمة اليوم:*\n"العلم يرفع بيتاً لا عماد له.. والجهل يهدم بيت العز والكرم"\n\n📋 *معلومات الطالب:*\n- الصف: {grade}\n- المبلغ الكلي: {total}\n- الرقم الأكاديمي: {barcode}\n\nنتمنى لابننا عاماً دراسياً حافلاً بالنجاح والتفوق.',
    summaryTemplate: currentSettings.summaryTemplate || '📊 *تقرير يومي إجمالي - مدرسة {school_name}*\nبتاريخ: {date}\n\n*الطلاب الغائبين:*\n{absent_list}',
    reminderTemplate: currentSettings.reminderTemplate || '*💰 تذكير بسداد القسط - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنود تذكيركم بموقف الحساب الخاص بالطالب:\n\n- القسط الكلي: {total}\n- إجمالي الواصل: {paid_total}\n- المبلغ المتبقي: {remain}',
    absenceWarning6Template: currentSettings.absenceWarning6Template || '⚠️ *تنبيه تجاوز الغياب (6 أيام) - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنود إعلامكم بأن الطالب قد تجاوز 6 أيام من الغياب.\nيرجى الانتباه لضمان عدم تأثر المستوى الدراسي.',
    absenceSummons10Template: currentSettings.absenceSummons10Template || '🚨 *استدعاء ولي أمر (10 أيام غياب) - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنحيطكم علماً بأن الطالب قد تجاوز 10 أيام غياب.\n*يرجى مراجعة إدارة المدرسة غداً فوراً*.',
    absenceExpulsion12Template: currentSettings.absenceExpulsion12Template || '🚫 *إنذار نهائي بالفصل (12 يوم غياب) - مدرسة {school_name}*\n\nعزيزي ولي أمر الطالب: {name}\nنبلغكم رسمياً بأن الطالب قد تجاوز 12 يوماً من الغياب.\nهذا يعتبر *إنذاراً نهائياً بالفصل*.',
    statusReportTemplate: currentSettings.statusReportTemplate || '📊 *تقرير حالة الطالب - مدرسة {school_name}*\n\nحضرة ولي امر الطالب: {parent}\nابننا العزيز: {name}\nالصف: {grade}\nالمبلغ الكلي: {total}\nالواصل: {paid}\nالمتبقي: {remain}\nاخر دفعة: {last_payment}\nتاريخ اخر دفعة: {last_payment_date}\n\nالغيابات بالعدد: {absences}\nالتنبيهات عدد: {alerts}\nالاستدعاءات عدد: {summons}\nالانذارات عدد: {warnings}',
    messageDelay: currentSettings.messageDelay || 2
  });

  const applyPreset = (type: 'get' | 'post_json' | 'ultramsg' | 'greenapi' | 'meta' | 'wasenderapi') => {
    switch (type) {
      case 'wasenderapi':
        setFormData(prev => ({
          ...prev,
          apiMethod: 'POST',
          apiUrl: 'https://wasenderapi.com/api/send',
          apiBody: '{"appkey": "{appkey}", "authkey": "{authkey}", "to": "{phone}", "message": "{message}"}'
        }));
        break;
      case 'get':
        setFormData(prev => ({
          ...prev,
          apiMethod: 'GET',
          apiUrl: 'https://api.example.com/send?phone={phone}&msg={message}&token={token}',
          apiBody: ''
        }));
        break;
      case 'post_json':
        setFormData(prev => ({
          ...prev,
          apiMethod: 'POST',
          apiUrl: 'https://api.example.com/send',
          apiBody: '{"to": "{phone}", "body": "{message}"}'
        }));
        break;
      case 'ultramsg':
        setFormData(prev => ({
          ...prev,
          apiMethod: 'POST',
          apiUrl: 'https://api.ultramsg.com/INSTANCE_ID/messages/chat',
          apiBody: 'token=YOUR_TOKEN&to={phone}&body={message}'
        }));
        break;
      case 'greenapi':
        setFormData(prev => ({
          ...prev,
          apiMethod: 'POST',
          apiUrl: 'https://api.green-api.com/waInstance{secret}/sendMessage/{token}',
          apiBody: '{"chatId": "{phone}@c.us", "message": "{message}"}',
          apiToken: '',
          apiSecret: ''
        }));
        break;
      case 'meta':
        setFormData(prev => ({
          ...prev,
          apiMethod: 'POST',
          apiUrl: 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages',
          apiBody: '{"messaging_product": "whatsapp", "to": "{phone}", "type": "text", "text": {"body": "{message}"}}'
        }));
        break;
    }
  };

  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('رسالة اختبار من نظام الإدارة المدرسية الذكي');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSettings.id) {
      localDb.update('whatsAppSettings', currentSettings.id, formData);
    } else {
      localDb.add('whatsAppSettings', { ...formData, schoolId: school.id });
    }
    alert('تم حفظ الإعدادات بنجاح');
  };

  const saveAsCustomTemplate = () => {
    if (!templateName.trim()) {
      alert('يرجى إدخال اسم للقالب');
      return;
    }

    localDb.add('whatsAppTemplates', {
      schoolId: school.id,
      name: templateName,
      attendancePresentTemplate: formData.attendancePresentTemplate,
      attendanceAbsentTemplate: formData.attendanceAbsentTemplate,
      paymentTemplate: formData.paymentTemplate,
      violationTemplate: formData.violationTemplate,
      welcomeTemplate: formData.welcomeTemplate,
      summaryTemplate: formData.summaryTemplate,
      reminderTemplate: formData.reminderTemplate,
      absenceWarning6Template: formData.absenceWarning6Template,
      absenceSummons10Template: formData.absenceSummons10Template,
      absenceExpulsion12Template: formData.absenceExpulsion12Template,
      statusReportTemplate: formData.statusReportTemplate,
      createdAt: new Date().toISOString()
    });

    setTemplateName('');
    setShowSaveModal(false);
    alert('تم حفظ القالب بنجاح');
  };

  const loadTemplate = (template: WhatsAppTemplate) => {
    setFormData(prev => ({
      ...prev,
      attendancePresentTemplate: template.attendancePresentTemplate,
      attendanceAbsentTemplate: template.attendanceAbsentTemplate,
      paymentTemplate: template.paymentTemplate,
      violationTemplate: template.violationTemplate,
      welcomeTemplate: template.welcomeTemplate || prev.welcomeTemplate,
      summaryTemplate: template.summaryTemplate || prev.summaryTemplate,
      reminderTemplate: template.reminderTemplate || prev.reminderTemplate,
      absenceWarning6Template: template.absenceWarning6Template || prev.absenceWarning6Template,
      absenceSummons10Template: template.absenceSummons10Template || prev.absenceSummons10Template,
      absenceExpulsion12Template: template.absenceExpulsion12Template || prev.absenceExpulsion12Template,
      statusReportTemplate: template.statusReportTemplate || prev.statusReportTemplate,
    }));
    setActiveTab('settings');
    alert(`تم تحميل القالب: ${template.name}`);
  };

  const deleteTemplate = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      localDb.delete('whatsAppTemplates', id);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone) {
      setTestResult({ success: false, message: 'يرجى إدخال رقم الهاتف' });
      return;
    }

    if (formData.useGateway && !formData.apiUrl) {
      setTestResult({ success: false, message: 'يرجى إدخال عنوان API' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      if (formData.useGateway) {
        const success = await WhatsAppService.executeApiCall(
          { ...formData, id: 'test', schoolId: school.id } as WhatsAppSettings,
          testPhone,
          testMessage
        );
        
        if (success) {
          setTestResult({ success: true, message: 'تم إرسال طلب API بنجاح. يرجى التحقق من لوحة التحكم الخاصة بمزود الخدمة.' });
        } else {
          setTestResult({ success: false, message: 'فشل إرسال الطلب. يرجى التحقق من الرابط والإعدادات.' });
        }
      } else {
        const manualUrl = WhatsAppService.getManualUrl(testPhone, testMessage);
        window.open(manualUrl, '_blank');
        setTestResult({ success: true, message: 'تم فتح رابط الواتساب المباشر بنجاح.' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: 'فشل الإرسال: ' + error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const notificationHistory = useMemo(() => {
    return notifications
      .filter(n => {
        const student = students.find(s => s.id === n.studentId);
        return student && student.schoolId === school.id;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notifications, students, school.id]);

  return (
    <div className="space-y-8 font-cairo" dir="rtl">
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-xl shadow-emerald-100">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">بوت الواتساب الذكي</h2>
            <p className="text-gray-500 font-bold">إرسال إشعارات الحضور والغياب والمدفوعات آلياً</p>
          </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-xl font-black transition-all flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Settings className="w-4 h-4" />
            الإعدادات
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-xl font-black transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <History className="w-4 h-4" />
            السجل
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-6 py-2 rounded-xl font-black transition-all flex items-center gap-2 ${
              activeTab === 'test' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Zap className="w-4 h-4" />
            اختبار
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-2 rounded-xl font-black transition-all flex items-center gap-2 ${
              activeTab === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Layout className="w-4 h-4" />
            القوالب المحفوظة
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-6 py-2 rounded-xl font-black transition-all flex items-center gap-2 ${
              activeTab === 'broadcast' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Send className="w-4 h-4" />
            بث رسالة
          </button>
        </div>
      </div>

      {activeTab === 'settings' && (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <Settings className="text-blue-600 w-5 h-5" />
                إعدادات الربط
              </h3>
              
              <div className="space-y-5">
                <label className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded-lg border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="font-black text-blue-900 text-sm">تفعيل البوت</p>
                    <p className="text-blue-600 text-[10px] font-bold italic">سيقوم النظام بإرسال الرسائل بناءً على الخيار أدناه</p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">طريقة الإرسال</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, useGateway: false }))}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${!formData.useGateway ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      رابط مباشر (يدوي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, useGateway: true }))}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${formData.useGateway ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      بوابة API (تلقائي)
                    </button>
                  </div>
                </div>

                {formData.useGateway ? (
                  <>
                    <div className="space-y-4">
                      <label className="block text-sm font-black text-gray-700">إعدادات سريعة (Presets)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button type="button" onClick={() => applyPreset('wasenderapi')} className="bg-indigo-600 text-white p-3 rounded-2xl border border-indigo-700 hover:bg-indigo-700 transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-indigo-100">
                          <span className="text-xs font-black">WASenderApi</span>
                          <span className="text-[8px] opacity-80">أفضل خيار للمبرمجين</span>
                        </button>
                        <button type="button" onClick={() => applyPreset('greenapi')} className="bg-blue-600 text-white p-3 rounded-2xl border border-blue-700 hover:bg-blue-700 transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-100">
                          <span className="text-xs font-black">Green-API</span>
                          <span className="text-[8px] opacity-80">سرعة وموثوقية عالية</span>
                        </button>
                        <button type="button" onClick={() => applyPreset('post_json')} className="text-[10px] font-black bg-gray-100 p-3 rounded-2xl border border-gray-200 hover:bg-gray-200 text-gray-700">JSON (Manual)</button>
                        <button type="button" onClick={() => applyPreset('get')} className="text-[10px] font-black bg-gray-100 p-3 rounded-2xl border border-gray-200 hover:bg-gray-200 text-gray-700">Simple GET</button>
                        <button type="button" onClick={() => applyPreset('ultramsg')} className="text-[10px] font-black bg-emerald-50 text-emerald-700 p-3 rounded-2xl border border-emerald-100 hover:bg-emerald-100">UltraMsg</button>
                        <button type="button" onClick={() => applyPreset('meta')} className="text-[10px] font-black bg-blue-50 text-blue-700 p-3 rounded-2xl border border-blue-100 hover:bg-blue-100">Meta Cloud</button>
                      </div>
                    </div>

                    {/* Green-API Guide */}
                    {formData.apiUrl.includes('green-api.com') && (
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                        <h4 className="text-blue-900 font-black text-xs flex items-center gap-2">
                          <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">!</span>
                          دليل ربط Green-API:
                        </h4>
                        <ul className="text-[11px] text-blue-800 space-y-2 font-bold leading-relaxed">
                          <li className="flex gap-2">
                            <span className="text-blue-600">1.</span>
                            <span>ادخل إلى <a href="https://green-api.com" target="_blank" className="underline font-black">green-api.com</a> وسجل حساباً.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-600">2.</span>
                            <span>انسخ <b>idInstance</b> وضعه في حقل "المفتاح السري" (أو استبدل {'{secret}'} في الرابط).</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-600">3.</span>
                            <span>انسخ <b>apiTokenInstance</b> وضعه في حقل "رمز الوصول" (أو استبدل {'{token}'} في الرابط).</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-600">4.</span>
                            <span>تأكد من اختيار <b>POST</b> ورابط الإرسال الصحيح كما تم ضبطه تلقائياً.</span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {/* WASenderApi Guide */}
                    {formData.apiUrl.includes('wasenderapi.com') && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                        <h4 className="text-indigo-900 font-black text-xs flex items-center gap-2">
                          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px]">!</span>
                          دليل ربط WASenderApi:
                        </h4>
                        <ul className="text-[11px] text-indigo-800 space-y-2 font-bold leading-relaxed">
                          <li className="flex gap-2">
                            <span className="text-indigo-600">1.</span>
                            <span>ادخل إلى لوحة تحكم <a href="https://wasenderapi.com" target="_blank" className="underline font-black">wasenderapi.com</a></span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-indigo-600">2.</span>
                            <span>انتقل إلى <b>Devices</b> واضغط على <b>Add Device</b> ثم امسح الكود بهاتفك.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-indigo-600">3.</span>
                            <span>انسخ الـ <b>AuthKey</b> (من الصفحة الرئيسية) وضعه في "رمز الوصول".</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-indigo-600">4.</span>
                            <span>انسخ الـ <b>Appkey</b> (من قائمة الأجهزة) وضعه في "المفتاح السري".</span>
                          </li>
                          <div className="mt-2 p-2 bg-indigo-100/50 rounded-xl border border-indigo-200 text-[10px] text-indigo-700 italic">
                            💡 ملاحظة: عند الضغط على زر WASenderApi أعلاه، سيتم ضبط رابط الـ API ونموذج البيانات تلقائياً.
                          </div>
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">رمز الوصول (Token/AuthKey)</label>
                        <input
                          type="text"
                          value={formData.apiToken}
                          onChange={(e) => setFormData(prev => ({ ...prev, apiToken: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                          placeholder="AuthKey أو Token"
                        />
                        <p className="mt-1 text-[10px] text-blue-600 font-bold px-2 italic">استخدم: {'{token}'} أو {'{authkey}'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">المفتاح السري (Secret/AppKey)</label>
                        <input
                          type="text"
                          value={formData.apiSecret}
                          onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                          placeholder="AppKey أو Secret"
                        />
                        <p className="mt-1 text-[10px] text-indigo-600 font-bold px-2 italic">استخدم: {'{secret}'} أو {'{appkey}'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">نوع الطلب (HTTP Method)</label>
                        <select
                          value={formData.apiMethod}
                          onChange={(e) => setFormData(prev => ({ ...prev, apiMethod: e.target.value as 'GET' | 'POST' }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-2">رابط الـ API</label>
                        <input
                          type="text"
                          value={formData.apiUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                          placeholder="https://api.example.com/send"
                        />
                      </div>
                    </div>

                    {formData.apiMethod === 'POST' && (
                       <div>
                       <label className="block text-sm font-black text-gray-700 mb-2">محتوى الطلب (JSON Body)</label>
                       <textarea
                         value={formData.apiBody}
                         onChange={(e) => setFormData(prev => ({ ...prev, apiBody: e.target.value }))}
                         className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100"
                         rows={4}
                         placeholder='{"phone": "{phone}", "message": "{message}"}'
                       />
                       <p className="mt-2 text-[10px] text-gray-400 font-bold px-2 italic">استخدم {'{phone}'} و {'{message}'}</p>
                     </div>
                    )}
                  </>
                ) : (
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex gap-4">
                    <Info className="text-emerald-600 w-12 h-12 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-emerald-900 font-black text-sm">وضع الرابط المباشر</p>
                      <p className="text-emerald-700 text-xs font-bold leading-relaxed">
                        في هذا الوضع، سيقوم النظام بفتح تطبيق الواتساب مباشرة على جهازك لإرسال الرسالة. لا يتطلب هذا الوضع أي اشتراكات وهو مجاني تماماً.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">رقم مدير المدرسة / المجموعة</label>
                  <input
                    type="text"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminPhone: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                    placeholder="9647700000000"
                  />
                  <p className="mt-2 text-[10px] text-gray-400 font-bold px-2 italic">الرقم الذي ستصله التقارير الإجمالية</p>
                </div>
                
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">فترة التأخير بين الرسائل (بالثواني)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.messageDelay}
                      onChange={(e) => setFormData(prev => ({ ...prev, messageDelay: parseInt(e.target.value) || 2 }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                    />
                    <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                  <p className="mt-2 text-[10px] text-amber-600 font-bold px-2 italic">يُنصح بوضع 3-5 ثوانٍ لتجنب حظر الرقم من قبل واتساب</p>
                </div>

                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-black text-sm">
                    <Zap className="w-4 h-4" />
                    نصيحة لـ Green-API
                  </div>
                  <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                    عند استخدام Green-API، استبدل <span className="font-black italic">YOUR_ID</span> في الرابط بـ <span className="font-black">idInstance</span> الخاص بك، وضع <span className="font-black">apiTokenInstance</span> في خانة الرمز (Access Token).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <MessageSquare className="text-emerald-600 w-5 h-5" />
                  قوالب الرسائل التلقائية
                </h3>
                <div className="bg-gray-50 px-4 py-2 rounded-xl flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-black text-gray-500">متغيرات: {'{name}'}, {'{grade}'}, {'{school_name}'}, {'{date}'}, {'{time}'}, {'{amount}'}, {'{remain}'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">رسالة تسجيل الحضور</label>
                  <textarea
                    value={formData.attendancePresentTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, attendancePresentTemplate: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">رسالة تسجيل الغياب</label>
                  <textarea
                    value={formData.attendanceAbsentTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, attendanceAbsentTemplate: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-red-100 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">رسالة وصل الدفع</label>
                  <textarea
                    value={formData.paymentTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentTemplate: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">رسالة المخالفة أو الطرد</label>
                  <textarea
                    value={formData.violationTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, violationTemplate: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-amber-100 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">رسالة الترحيب والشروط</label>
                  <textarea
                    value={formData.welcomeTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, welcomeTemplate: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-purple-100 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">رسالة تذكير بالدفع (المتأخرين)</label>
                  <textarea
                    value={formData.reminderTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, reminderTemplate: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-red-100 min-h-[120px]"
                  />
                  <p className="mt-2 text-[10px] text-gray-400 font-bold px-2 italic">استخدم المتغيرات: {'{total}'} (المبلغ الكلي), {'{last_amount}'} (آخر قسط), {'{last_date}'} (تاريخه), {'{remain}'} (المتبقي)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">تنبيه غياب 6 أيام</label>
                  <textarea
                    value={formData.absenceWarning6Template}
                    onChange={(e) => setFormData(prev => ({ ...prev, absenceWarning6Template: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-amber-100 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">استدعاء ولي أمر (10 أيام)</label>
                  <textarea
                    value={formData.absenceSummons10Template}
                    onChange={(e) => setFormData(prev => ({ ...prev, absenceSummons10Template: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-orange-100 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-600 px-2">إنذار فصل (12 يوم)</label>
                  <textarea
                    value={formData.absenceExpulsion12Template}
                    onChange={(e) => setFormData(prev => ({ ...prev, absenceExpulsion12Template: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-rose-100 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-black text-indigo-600 px-2">قالب تقرير حالة الطالب الفردي</label>
                  <textarea
                    value={formData.statusReportTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, statusReportTemplate: e.target.value }))}
                    rows={6}
                    className="w-full bg-indigo-50/30 border border-indigo-100 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 min-h-[150px]"
                  />
                  <p className="mt-2 text-[10px] text-gray-400 font-bold px-2 italic">
                    متغيرات إضافية: {'{parent}'}, {'{paid}'}, {'{last_payment}'}, {'{last_payment_date}'}, {'{absences}'}, {'{alerts}'}, {'{summons}'}, {'{warnings}'}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-black text-gray-600 px-2">قالب التقرير الإجمالي (الغياب والمخالفات)</label>
                  <textarea
                    value={formData.summaryTemplate}
                    onChange={(e) => setFormData(prev => ({ ...prev, summaryTemplate: e.target.value }))}
                    rows={6}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 min-h-[150px]"
                  />
                  <p className="mt-2 text-[10px] text-gray-400 font-bold px-2 italic">
                    استخدم: <span className="text-blue-600">{'{absent_list}'}</span> و <span className="text-red-600">{'{violation_list}'}</span>
                  </p>
                </div>
              </div>

              {canModify && (
                <div className="mt-8 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(true)}
                    className="bg-gray-100 text-gray-700 px-8 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-gray-200 transition-all text-lg"
                  >
                    <Save className="w-6 h-6" />
                    حفظ كقالب جديد
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all text-lg"
                  >
                    <Save className="w-6 h-6" />
                    حفظ الإعدادات الحالية
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black flex items-center gap-3">
              <Layout className="text-blue-600 w-6 h-6" />
              مكتبة القوالب المخصصة
            </h3>
            <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black">
              {schoolTemplates.length} قوالب محفوظة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schoolTemplates.map((template) => (
              <div key={template.id} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 hover:border-blue-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm">
                    <MessageSquare className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex gap-2">
                    {canModify && (
                      <button 
                        onClick={() => deleteTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <h4 className="text-lg font-black text-gray-900 mb-2">{template.name}</h4>
                <p className="text-xs text-gray-400 font-bold mb-6">
                  {format(new Date(template.createdAt), 'yyyy-MM-dd HH:mm')}
                </p>

                <button
                  onClick={() => loadTemplate(template)}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  استخدام هذا القالب
                </button>
              </div>
            ))}

            <button
              onClick={() => {
                setActiveTab('settings');
                setShowSaveModal(true);
              }}
              className="border-4 border-dashed border-gray-100 p-8 rounded-[32px] flex flex-col items-center justify-center gap-4 text-gray-300 hover:border-blue-100 hover:text-blue-300 transition-all"
            >
              <Plus className="w-12 h-12" />
              <span className="font-black text-lg">إضافة قالب جديد</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black">سجل التنبيهات المرسلة</h3>
            <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-black">
              إجمالي: {notificationHistory.length}
            </span>
          </div>

          <div className="overflow-hidden border border-gray-50 rounded-2xl">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-black text-gray-500">ت</th>
                  <th className="p-4 text-sm font-black text-gray-800">الطالب</th>
                  <th className="p-4 text-sm font-black text-gray-800">نوع الرسالة</th>
                  <th className="p-4 text-sm font-black text-gray-800">المحتوى</th>
                  <th className="p-4 text-sm font-black text-gray-800">التاريخ</th>
                  <th className="p-4 text-sm font-black text-gray-800 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {notificationHistory.length > 0 ? (
                  notificationHistory.map((n, i) => {
                    const student = students.find(s => s.id === n.studentId);
                    return (
                      <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm font-bold text-gray-400">{i + 1}</td>
                        <td className="p-4">
                          <p className="font-black text-gray-900">{student?.name || 'طالب مجهول'}</p>
                          <p className="text-[10px] text-gray-500 font-bold">{student ? WhatsAppService.formatPhone(student.phone) : (n.studentId ? n.studentId : 'N/A')}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                            n.type === 'attendance' ? 'bg-emerald-50 text-emerald-600' :
                            n.type === 'absence' ? 'bg-red-50 text-red-600' :
                            n.type === 'payment' ? 'bg-blue-50 text-blue-600' :
                            n.type === 'reminder' ? 'bg-amber-100 text-amber-700' :
                            n.type === 'welcome' ? 'bg-purple-50 text-purple-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {n.type === 'attendance' ? 'حضور' :
                             n.type === 'absence' ? 'غياب' :
                             n.type === 'payment' ? 'دفعة مالية' :
                             n.type === 'reminder' ? 'تذكير قسط' :
                             n.type === 'violation' ? 'مخالفة' : 
                             n.type === 'welcome' ? 'ترحيب' : 'أخرى'}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-600 max-w-xs truncate">{n.content}</td>
                        <td className="p-4 text-xs font-black text-gray-500">{format(new Date(n.date), 'yyyy-MM-dd HH:mm')}</td>
                        <td className="p-4">
                          <div className="flex justify-center">
                            {n.status === 'sent' ? (
                              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-[10px] font-black">تم الإرسال</span>
                              </div>
                            ) : n.status === 'failed' ? (
                              <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                <XCircle className="w-4 h-4" />
                                <span className="text-[10px] font-black">فشل</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black">قيد الانتظار</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <History className="w-16 h-16" />
                        <p className="text-xl font-black">لا يوجد سجل تنبيهات حتى الآن</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl space-y-8">
            <div className="text-center">
              <div className="bg-blue-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Zap className="text-blue-600 w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black text-gray-900">اختبار اتصال البوت</h3>
              <p className="text-gray-500 font-bold mt-2">تأكد من صحة إعدادات الـ API عبر إرسال رسالة تجريبية</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">رقم الهاتف المختبر</label>
                <div className="relative">
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                    placeholder="مثال: 9647700000000"
                  />
                  <Send className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">نص الرسالة</label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {testResult && (
                <div className={`p-6 rounded-2xl border flex gap-4 ${
                  testResult.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                  )}
                  <p className={`font-black text-sm ${testResult.success ? 'text-emerald-900' : 'text-red-900'}`}>
                    {testResult.message}
                  </p>
                </div>
              )}

              <button
                onClick={sendTestMessage}
                disabled={isTesting}
                className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {isTesting ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    إرسال رسالة الاختبار
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl space-y-8">
            <div className="flex items-center gap-6">
              <div className="bg-blue-600 p-5 rounded-3xl text-white shadow-xl shadow-blue-100">
                <Send className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-900">بث إشعارات عامة</h3>
                <p className="text-gray-500 font-bold">أرسل تنبيهات أو أخبار لآباء الطلاب المحددين آلياً</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6 text-right">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-3">تحديد الجمهور المستهدف</label>
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                    {(['all', 'grade', 'specific'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBroadcastData(prev => ({ ...prev, target: t }))}
                        className={`py-3 rounded-xl text-xs font-black transition-all ${broadcastData.target === t ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                      >
                        {t === 'all' ? 'الكل' : t === 'grade' ? 'حسب الصف' : 'طلاب محددون'}
                      </button>
                    ))}
                  </div>
                </div>

                {broadcastData.target === 'grade' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-black text-gray-700 mb-2">اختر الصف</label>
                    <select
                      value={broadcastData.grade}
                      onChange={(e) => setBroadcastData(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold"
                    >
                      <option value="">اختر صفاً...</option>
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                )}

                {broadcastData.target === 'specific' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-black text-gray-700 mb-2">اختر الطلاب</label>
                    <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-2xl p-4 bg-gray-50 space-y-2">
                      {students.map(s => (
                        <label key={s.id} className="flex items-center gap-3 hover:bg-white p-2 rounded-xl transition-all cursor-pointer">
                          <input
                            type="checkbox"
                            checked={broadcastData.selectedStudentIds.includes(s.id)}
                            onChange={(e) => {
                              const ids = e.target.checked 
                                ? [...broadcastData.selectedStudentIds, s.id]
                                : broadcastData.selectedStudentIds.filter(id => id !== s.id);
                              setBroadcastData(prev => ({ ...prev, selectedStudentIds: ids }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-xs font-bold text-gray-700">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">محتوى الرسالة</label>
                  <textarea
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData(prev => ({ ...prev, message: e.target.value }))}
                    rows={6}
                    placeholder="اكتب رسالتك هنا... يمكنك استخدام {name} لاسم الطالب"
                    className="w-full bg-gray-50 border border-gray-200 rounded-3xl px-6 py-5 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 p-8 rounded-[32px] border border-blue-100/50 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-blue-900 font-black">
                    <Info className="w-5 h-5" />
                    تحليل البث
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                      <span className="text-xs font-bold text-gray-500">عدد المستهدفين:</span>
                      <span className="font-black text-blue-600">
                        {broadcastData.target === 'all' ? students.length :
                         broadcastData.target === 'grade' ? students.filter(s => s.grade === broadcastData.grade).length :
                         broadcastData.selectedStudentIds.length}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                      <span className="text-xs font-bold text-gray-500">وضع الإرسال الحالي:</span>
                      <span className={`text-xs font-black ${formData.useGateway ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {formData.useGateway ? 'بوابة API (تلقائي)' : 'رابط مباشر (يدوي)'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-600/70 font-bold leading-relaxed pr-2">
                    * سيتم إرسال الرسالة بشكل فردي لكل ولي أمر لضمان الخصوصية والوصول.
                    في الوضع اليدوي، ستحتاج لفتح الرابط لكل مستلم.
                  </p>
                </div>

                <div className="space-y-4">
                  {broadcastResult && (
                    <div className={`p-4 rounded-2xl border flex gap-3 animate-in fade-in slide-in-from-top-4 ${
                      broadcastResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-red-50 border-red-100 text-red-900'
                    }`}>
                      {broadcastResult.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      <p className="text-xs font-black">{broadcastResult.message}</p>
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      if (!broadcastData.message) {
                        setBroadcastResult({ success: false, message: 'يرجى كتابة نص الرسالة' });
                        return;
                      }

                      let targetIds: string[] = [];
                      if (broadcastData.target === 'all') targetIds = students.map(s => s.id);
                      else if (broadcastData.target === 'grade') targetIds = students.filter(s => s.grade === broadcastData.grade).map(s => s.id);
                      else targetIds = broadcastData.selectedStudentIds;

                      if (targetIds.length === 0) {
                        setBroadcastResult({ success: false, message: 'لم يتم اختيار أي مستهدفين' });
                        return;
                      }

                      setIsBroadcasting(true);
                      setBroadcastResult(null);

                      try {
                        const result = await WhatsAppService.broadcastMessage(school.id, targetIds, broadcastData.message);
                        if (result.success) {
                          setBroadcastResult({ 
                            success: true, 
                            message: `تمت عملية البث بنجاح. ناجح: ${result.successCount}, فشل: ${result.failedCount}` 
                          });
                          if (result.mode === 'manual' && result.firstManualUrl) {
                            window.open(result.firstManualUrl, '_blank');
                          }
                        } else {
                          setBroadcastResult({ success: false, message: result.message || 'حدث خطأ غير متوقع' });
                        }
                      } catch (error: any) {
                        setBroadcastResult({ success: false, message: 'خطأ في عملية البث: ' + error.message });
                      } finally {
                        setIsBroadcasting(false);
                      }
                    }}
                    disabled={isBroadcasting}
                    className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
                  >
                    {isBroadcasting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        جاري البث...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        بدء البث الموحد
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setShowSaveModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 relative z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-gray-900 mb-2">حفظ القالب الحالي</h3>
            <p className="text-gray-500 font-bold text-sm mb-8">أعطِ هذا القالب اسماً لسهولة العودة إليه لاحقاً</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-2">اسم القالب</label>
                <input
                  autoFocus
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  placeholder="مثال: قوالب الامتحانات"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={saveAsCustomTemplate}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100"
                >
                  تأكيد الحفظ
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-8 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
