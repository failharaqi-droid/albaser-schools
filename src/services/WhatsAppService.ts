import { WhatsAppSettings, Student, ParentNotification } from '../types';
import { localDb } from '../services/localDb';
import { format } from 'date-fns';

export const WhatsAppService = {
  getSettings(schoolId: string) {
    return localDb.getAll('whatsAppSettings').find(s => s.schoolId === schoolId);
  },

  formatMessage(template: string, student: Student, data: { [key: string]: string | number } = {}) {
    const schools = localDb.getAll('schools') as any[];
    const school = schools.find(s => s.id === student.schoolId);
    const settings = this.getSettings(student.schoolId);

    let message = template
      .replace(/{name}/g, student.name)
      .replace(/{parent}/g, student.parentName || 'ولي الأمر')
      .replace(/{school_name}/g, school?.name || 'مدرستنا')
      .replace(/{grade}/g, student.grade)
      .replace(/{barcode}/g, student.barcode)
      .replace(/{date}/g, format(new Date(), 'yyyy-MM-dd'))
      .replace(/{time}/g, format(new Date(), 'HH:mm'))
      .replace(/{academic_year}/g, school?.academicYear || 'غير محدد')
      .replace(/{general_channel}/g, settings?.generalChannelLink || 'غير متوفر')
      .replace(/{grade_channel}/g, settings?.gradeChannelLinks?.[student.grade] || 'غير متوفر');

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{${key}}`, 'g');
        message = message.replace(regex, value.toString());
      }
    });

    // Special handling for financial data if not provided in 'data' but available in 'student'
    if (template.includes('{total}') && data.total === undefined) {
      message = message.replace(/{total}/g, student.totalAmount.toString());
    }

    return message;
  },

  formatPhone(phone: string) {
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Handle leading 00 instead of +
    if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.substring(2);
    }
    
    // If it already starts with Iraqi country code
    if (cleanPhone.startsWith('964')) {
      // Sometimes people enter 96407... which is wrong
      if (cleanPhone.startsWith('9640')) {
        return `964${cleanPhone.substring(4)}`;
      }
      return cleanPhone;
    }

    // If it starts with local 0 (e.g. 0770...)
    if (cleanPhone.startsWith('0')) {
      return `964${cleanPhone.substring(1)}`;
    }
    
    // If it starts with 7 without country code or 0 (e.g. 770...)
    if (cleanPhone.startsWith('7')) {
      return `964${cleanPhone}`;
    }
    
    return cleanPhone;
  },

  getManualUrl(phone: string, message: string) {
    const formattedPhone = this.formatPhone(phone);
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  },

  async executeApiCall(settings: WhatsAppSettings, phone: string, message: string) {
    const formattedPhone = this.formatPhone(phone);
    const url = settings.apiUrl
      .replace(/{phone}/g, formattedPhone)
      .replace(/{message}/g, encodeURIComponent(message))
      .replace(/{token}/g, settings.apiToken || '')
      .replace(/{authkey}/g, settings.apiToken || '')
      .replace(/{secret}/g, settings.apiSecret || '')
      .replace(/{appkey}/g, settings.apiSecret || '')
      .replace(/{id}/g, settings.apiToken || '');

    const method = settings.apiMethod || 'GET';
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json'
      }
    };

    if (method === 'POST') {
      let body = settings.apiBody || '{"chatId": "{phone}@c.us", "message": "{message}"}';
      body = body
        .replace(/{phone}/g, formattedPhone)
        .replace(/{message}/g, message.replace(/"/g, '\\"').replace(/\n/g, '\\n'))
        .replace(/{token}/g, settings.apiToken || '')
        .replace(/{authkey}/g, settings.apiToken || '')
        .replace(/{secret}/g, settings.apiSecret || '')
        .replace(/{appkey}/g, settings.apiSecret || '')
        .replace(/{id}/g, settings.apiToken || '');
      
      fetchOptions.body = body;
      
      // Auto-detect Content-Type for the body
      if (body.trim().startsWith('{')) {
        (fetchOptions.headers as any)['Content-Type'] = 'application/json';
      } else {
        (fetchOptions.headers as any)['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    try {
      // In a real browser environment, CORS will block most direct calls to these APIs
      // This is a known limitation of front-end only apps. 
      // The user should ideally use a proxy or the provider should allow CORS.
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        console.warn('WhatsApp API Response Not OK:', response.status, response.statusText);
      }
      return true; // We return true if the fetch itself succeeded, as response status varies between APIs
    } catch (error) {
      console.error('WhatsApp API Execution Error:', error);
      return false;
    }
  },

  async sendNotification(
    schoolId: string,
    studentId: string,
    type: 'attendance' | 'absence' | 'payment' | 'violation' | 'welcome' | 'reminder' | 'warning' | 'summons' | 'expulsion' | 'status',
    data: { [key: string]: string | number } = {},
    customMessage?: string,
    queueOnly: boolean = false
  ) {
    const settings = this.getSettings(schoolId);
    if (!settings || !settings.isEnabled) return null;

    const student = (localDb.getAll('students') as Student[]).find(s => s.id === studentId);
    if (!student || !student.phone) return null;

    let message = '';
    if (customMessage) {
      message = this.formatMessage(customMessage, student, data);
    } else {
      let template = '';
      switch (type) {
        case 'attendance': template = settings.attendancePresentTemplate; break;
        case 'absence': template = settings.attendanceAbsentTemplate; break;
        case 'warning': template = settings.absenceWarning6Template || settings.attendanceAbsentTemplate; break;
        case 'summons': template = settings.absenceSummons10Template || settings.attendanceAbsentTemplate; break;
        case 'expulsion': template = settings.absenceExpulsion12Template || settings.attendanceAbsentTemplate; break;
        case 'payment': template = settings.paymentTemplate; break;
        case 'violation': template = settings.violationTemplate; break;
        case 'welcome': template = settings.welcomeTemplate || ''; break;
        case 'reminder': template = settings.reminderTemplate || ''; break;
        case 'status': template = settings.statusReportTemplate || ''; break;
      }
      if (!template) return null;
      message = this.formatMessage(template, student, data);
    }

    const notifRecord = localDb.add('parentNotifications', {
      studentId,
      type,
      content: message,
      date: new Date().toISOString(),
      status: settings.useGateway ? 'pending' : 'manual'
    } as ParentNotification);

    if (settings.useGateway && settings.apiUrl) {
      if (queueOnly) {
        return { success: true, mode: 'queued', id: notifRecord.id };
      }
      // Even if not queueOnly, it's safer to let the background worker handle it if multiple notifications are triggered
      // But for single ones, we can execute immediately if requested.
      // However, to ensure delay consistency, we might prefer queuing always.
      // For now, let's stick to the current logic for single notifications but definitely fix broadcast.
      const success = await this.executeApiCall(settings, student.phone, message);
      if (success) {
        localDb.update('parentNotifications', notifRecord.id, { status: 'sent' });
        return { success: true, mode: 'gateway' };
      } else {
        localDb.update('parentNotifications', notifRecord.id, { status: 'failed' });
        return { success: false, mode: 'gateway' };
      }
    } else {
      const manualUrl = this.getManualUrl(student.phone, message);
      return { success: true, mode: 'manual', url: manualUrl };
    }
  },

  async sendSummary(
    schoolId: string,
    absentNames: string[],
    violationNames: string[]
  ) {
    const settings = this.getSettings(schoolId);
    if (!settings || !settings.isEnabled || !settings.summaryTemplate) return null;

    const schools = localDb.getAll('schools') as any[];
    const school = schools.find(s => s.id === schoolId);

    const message = settings.summaryTemplate
      .replace(/{school_name}/g, school?.name || 'مدرستنا')
      .replace(/{academic_year}/g, school?.academicYear || 'غير محدد')
      .replace(/{date}/g, format(new Date(), 'yyyy-MM-dd'))
      .replace(/{absent_list}/g, absentNames.length > 0 ? absentNames.join('\n') : 'لا يوجد غياب')
      .replace(/{violation_list}/g, violationNames.length > 0 ? violationNames.join('\n') : 'لا يوجد مخالفات');

    if (settings.useGateway && settings.apiUrl && settings.adminPhone) {
      const success = await this.executeApiCall(settings, settings.adminPhone, message);
      return { success, mode: 'gateway' };
    } else {
      const phone = settings.adminPhone || '';
      const manualUrl = this.getManualUrl(phone, message);
      return { success: true, mode: 'manual', url: manualUrl };
    }
  },

  async broadcastMessage(
    schoolId: string,
    studentIds: string[],
    customMessage: string
  ) {
    const settings = this.getSettings(schoolId);
    if (!settings || !settings.isEnabled) return { success: false, message: 'البوت غير مفعل' };

    const students = localDb.getAll('students') as Student[];
    const targetStudents = students.filter(s => studentIds.includes(s.id) && s.phone);

    if (targetStudents.length === 0) return { success: false, message: 'لا يوجد طلاب محددين لديهم أرقام هواتف' };

    let successCount = 0;
    let failedCount = 0;

    for (const student of targetStudents) {
      const message = this.formatMessage(customMessage, student);
      
      localDb.add('parentNotifications', {
        studentId: student.id,
        type: 'warning',
        content: message,
        date: new Date().toISOString(),
        status: settings.useGateway ? 'pending' : 'manual'
      } as ParentNotification);

      successCount++;
    }

    return { 
      success: true, 
      successCount, 
      failedCount: 0, 
      mode: settings.useGateway ? 'gateway' : 'manual',
      firstManualUrl: !settings.useGateway && targetStudents.length > 0 
        ? this.getManualUrl(targetStudents[0].phone!, customMessage.replace('{name}', targetStudents[0].name)) 
        : null
    };
  },

  async processNotification(notificationId: string) {
    const notification = (localDb.getAll('parentNotifications') as ParentNotification[]).find(n => n.id === notificationId);
    if (!notification || notification.status !== 'pending') return false;

    const student = (localDb.getAll('students') as Student[]).find(s => s.id === notification.studentId);
    if (!student || !student.phone) {
      localDb.update('parentNotifications', notificationId, { status: 'failed' });
      return false;
    }

    const settings = this.getSettings(student.schoolId);
    if (!settings || !settings.isEnabled || !settings.useGateway) return false;

    const success = await this.executeApiCall(settings, student.phone, notification.content);
    localDb.update('parentNotifications', notificationId, { status: success ? 'sent' : 'failed' });
    return success;
  }
};
