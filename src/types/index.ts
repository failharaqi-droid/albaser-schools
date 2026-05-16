export type Tab = 'dashboard' | 'students' | 'attendance' | 'payments' | 'add-student' | 'attendance-reports' | 'reports' | 'unpaid' | 'staff' | 'expenses' | 'ledger' | 'idcards' | 'backup' | 'whatsapp' | 'teachers' | 'investor' | 'accounts' | 'userguide' | 'manual-ledger';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'staff';
  permissions: Tab[]; // List of allowed tabs
  canModify: boolean; // Permission to add/edit/delete
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  ownerId: string;
  logo?: string;
  address?: string;
  phone?: string;
  receiptNote?: string;
  principalName?: string;
  idCardIssueDate?: string;
  idCardExpiryDate?: string;
  idCardPrimaryColor?: string;
  idCardSecondaryColor?: string;
  idCardTextColor?: string;
  showPhoneOnFront?: boolean;
  showPhoneOnBack?: boolean;
  showDobOnCard?: boolean;
  showStudentIdOnCard?: boolean;
  showParentNameOnCard?: boolean;
  idCardCustomText?: string;
  showCustomTextOnCard?: boolean;
  idCardFontFamily?: string;
  idCardHeaderFontSize?: number;
  showPhotoOnCard?: boolean;
  showGradeOnCard?: boolean;
  showBarcodeOnCard?: boolean;
  showBarcodeOnFront?: boolean;
  attendanceBarcodeEnabled?: boolean;
  installmentBarcodeEnabled?: boolean;
  shiftStartTime?: string; // HH:mm format
  shiftEndTime?: string; // HH:mm format
  autoAbsenceCheckEnabled?: boolean;
  lastAbsenceCheckDate?: string; // YYYY-MM-DD
  themeColor?: string;
  autoPrintReceipt?: boolean;
  idCardBorderColor?: string;
  zainCashNumber?: string;
  quickPaymentLink?: string;
  receiptHeaderColor?: string;
  receiptTextColor?: string;
  receiptFontSize?: 'small' | 'medium' | 'large';
  showPreviousPayments?: boolean;
  authEnabled?: boolean;
  academicYear?: string;
  systemFontFamily?: string;
  systemFontSize?: string;
}

export interface CardTemplate {
  id: string;
  schoolId: string;
  name: string;
  principalName: string;
  issueDate: string;
  expiryDate: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  showPhoneOnFront: boolean;
  showPhoneOnBack: boolean;
  showDob: boolean;
  showStudentId: boolean;
  showParentName: boolean;
  customText: string;
  showCustomText: boolean;
  fontSize: number;
  headerFontSize?: number;
  fontFamily: string;
  showPhoto: boolean;
  showGrade: boolean;
  showBarcode: boolean;
  showBarcodeOnFront?: boolean;
  orientation: 'horizontal' | 'vertical';
  showAttendanceBarcode?: boolean;
  showInstallmentBarcode: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  schoolId: string;
  name: string;
  parentName?: string;
  address?: string;
  totalAmount: number;
  grade: string;
  phone: string;
  barcode: string;
  dob?: string;
  photo?: string;
  attendanceBarcode?: string;
  installmentBarcode?: string;
  fingerprintId?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank' | 'zain_cash' | 'other';
  note?: string;
}

export interface Staff {
  id: string;
  schoolId: string;
  name: string;
  salary: number;
  role: string;
  phone: string;
  attendanceBarcode: string;
  fingerprintId?: string;
  workingDays: number[]; // 0 for Sunday, 1 for Monday, etc. (using JS getDay() format)
  deductionAmount: number; // Deduction per day of absence
  dob?: string;
  photo?: string;
}

export interface Holiday {
  id: string;
  schoolId: string;
  date: string; // YYYY-MM-DD
  reason?: string;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'dismissed' | 'violation';

export interface AttendanceRecord {
  id: string;
  entityId: string; // studentId or staffId
  date: string; // ISO string (just the date part YYYY-MM-DD usually)
  status: AttendanceStatus;
  type: 'student' | 'staff';
  scanTime?: string; // Full ISO for when it was scanned
  reason?: string; // Reason for absence or lateness
  messageSent?: boolean; // True if an automated message was sent
  createdAt: string; 
}

export interface WhatsAppTemplate {
  id: string;
  schoolId: string;
  name: string;
  attendancePresentTemplate: string;
  attendanceAbsentTemplate: string;
  paymentTemplate: string;
  violationTemplate: string;
  welcomeTemplate?: string;
  summaryTemplate?: string;
  reminderTemplate?: string;
  absenceWarning6Template: string;
  absenceSummons10Template: string;
  absenceExpulsion12Template: string;
  statusReportTemplate?: string;
  createdAt: string;
}

export interface WhatsAppSettings {
  id: string;
  schoolId: string;
  isEnabled: boolean;
  useGateway: boolean;
  apiUrl: string;
  apiMethod: 'GET' | 'POST';
  apiToken: string;
  apiSecret?: string; // Additional secret for providers like WASenderApi (appkey)
  apiBody?: string; // Body template for POST
  adminPhone?: string; // Group or Admin phone to receive summaries
  attendancePresentTemplate: string;
  attendanceAbsentTemplate: string;
  paymentTemplate: string;
  violationTemplate: string;
  welcomeTemplate?: string;
  summaryTemplate?: string;
  reminderTemplate?: string;
  statusReportTemplate?: string;
  absenceWarning6Template: string;
  absenceSummons10Template: string;
  absenceExpulsion12Template: string;
  messageDelay?: number; // Delay in seconds between messages
  generalChannelLink?: string; // General school channel link
  gradeChannelLinks?: Record<string, string>; // Grade-specific channel links
}

export interface ParentNotification {
  id: string;
  studentId: string;
  type: 'attendance' | 'absence' | 'payment' | 'violation' | 'summons' | 'warning' | 'expulsion' | 'welcome' | 'reminder' | 'status';
  content: string;
  date: string;
  status: 'sent' | 'failed' | 'pending';
}

export interface StaffPayment {
  id: string;
  staffId: string;
  month: string; // YYYY-MM
  amount: number;
  date: string;
  status: 'paid' | 'pending';
}

export interface StaffInvoice {
  id: string;
  staffId: string;
  amount: number;
  date: string;
  description: string;
}

export interface GeneralExpense {
  id: string;
  schoolId: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

export interface ExpenseCategory {
  id: string;
  schoolId: string;
  name: string;
}

export interface ManualLedgerField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date';
  width?: string;
}

export interface ManualLedgerEntry {
  id: string;
  schoolId: string;
  grade?: string;
  data: { [fieldId: string]: any };
  createdAt: string;
}

export interface ManualLedgerConfig {
  id: string;
  schoolId: string;
  fields: ManualLedgerField[];
}

export interface InvestorPayment {
  id: string;
  schoolId: string;
  amount: number;
  date: string;
  month: string;
  notes: string;
  recipientName: string;
  academicYear: string;
  createdAt: string;
}
