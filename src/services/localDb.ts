import { 
  School, Student, Payment, Staff, StaffPayment, StaffInvoice, 
  GeneralExpense, CardTemplate, ManualLedgerConfig, ManualLedgerEntry,
  AttendanceRecord, ParentNotification, WhatsAppSettings, WhatsAppTemplate, ExpenseCategory, InvestorPayment
} from '../types';

const STORAGE_KEY = 'school_accounting_db';

interface DB {
  schools: School[];
  students: Student[];
  payments: Payment[];
  staff: Staff[];
  staffPayments: StaffPayment[];
  staffInvoices: StaffInvoice[];
  expenses: GeneralExpense[];
  cardTemplates: CardTemplate[];
  manualLedgerConfigs: ManualLedgerConfig[];
  manualLedgerEntries: ManualLedgerEntry[];
  attendanceRecords: AttendanceRecord[];
  parentNotifications: ParentNotification[];
  whatsAppSettings: WhatsAppSettings[];
  whatsAppTemplates: WhatsAppTemplate[];
  expenseCategories: ExpenseCategory[];
  investorPayments: InvestorPayment[];
}

const initialDB: DB = {
  schools: [],
  students: [],
  payments: [],
  staff: [],
  staffPayments: [],
  staffInvoices: [],
  expenses: [],
  cardTemplates: [],
  manualLedgerConfigs: [],
  manualLedgerEntries: [],
  attendanceRecords: [],
  parentNotifications: [],
  whatsAppSettings: [],
  whatsAppTemplates: [],
  expenseCategories: [],
  investorPayments: []
};

export const localDb = {
  get(): DB {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return initialDB;
    try {
      const db = JSON.parse(data);
      // Ensure all keys exist (for backward compatibility)
      return { ...initialDB, ...db };
    } catch (e) {
      return initialDB;
    }
  },

  save(data: DB) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Dispatch custom event to notify listeners
    window.dispatchEvent(new Event('local-db-update'));
  },

  // Generic CRUD
  getAll<K extends keyof DB>(key: K): DB[K] {
    return this.get()[key];
  },

  add<K extends keyof DB>(key: K, item: any) {
    const db = this.get();
    const newItem = { ...item, id: Math.random().toString(36).substring(2, 15) };
    (db[key] as any[]).push(newItem);
    this.save(db);
    return newItem;
  },

  addMany<K extends keyof DB>(key: K, items: any[]) {
    const db = this.get();
    const newItems = items.map(item => ({ ...item, id: Math.random().toString(36).substring(2, 15) }));
    (db[key] as any[]).push(...newItems);
    this.save(db);
    return newItems;
  },

  update<K extends keyof DB>(key: K, id: string, updates: any) {
    const db = this.get();
    const index = (db[key] as any[]).findIndex((i: any) => i.id === id);
    if (index !== -1) {
      db[key][index] = { ...db[key][index], ...updates };
      this.save(db);
    }
  },

  delete<K extends keyof DB>(key: K, id: string) {
    const db = this.get();
    db[key] = (db[key] as any[]).filter((i: any) => i.id !== id) as any;
    this.save(db);
  },

  exportAll(): string {
    return JSON.stringify(this.get());
  },

  importAll(json: string) {
    try {
      const data = JSON.parse(json);
      // Basic validation
      if (data && typeof data === 'object' && 'schools' in data) {
        this.save(data);
      } else {
        throw new Error('Invalid backup file');
      }
    } catch (e) {
      throw new Error('Failed to parse backup file');
    }
  }
};
