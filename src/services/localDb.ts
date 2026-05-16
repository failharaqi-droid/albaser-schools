import { auth } from '../lib/firebase';
import { 
  School, Student, Payment, Staff, StaffPayment, StaffInvoice, User,
  GeneralExpense, CardTemplate, ManualLedgerConfig, ManualLedgerEntry,
  AttendanceRecord, ParentNotification, WhatsAppSettings, WhatsAppTemplate, ExpenseCategory, InvestorPayment,
  Holiday
} from '../types';

interface DB {
  users: User[];
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
  holidays: Holiday[];
}

const initialDB: DB = {
  users: [],
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
  investorPayments: [],
  holidays: []
};

let memoryDB: DB = { ...initialDB };

// Debounce sync logic to avoid spamming the DB on every character typed
let syncTimeout: any = null;

async function saveToRemote() {
  try {
    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoryDB)
    });
    if (!res.ok) {
        console.error("Failed to sync DB to server.");
    }
  } catch (error) {
    console.error("Error saving DB:", error);
  }
}

function scheduleSync() {
   if (syncTimeout) clearTimeout(syncTimeout);
   syncTimeout = setTimeout(saveToRemote, 1000);
}

export const localDb = {
  async init() {
    try {
      const res = await fetch('/api/db/sync');
      if (res.ok) {
        const { data } = await res.json();
        if (data) {
           memoryDB = { ...initialDB, ...data };
        }
      }
    } catch(e) {
      console.error(e);
    }
    window.dispatchEvent(new Event('local-db-update'));
  },

  get(): DB {
    return memoryDB;
  },

  save(data: DB) {
    memoryDB = data;
    scheduleSync();
    window.dispatchEvent(new Event('local-db-update'));
  },

  setupListeners(onRefresh: () => void) {
    window.addEventListener('local-db-update', onRefresh);
  },

  getAll<K extends keyof DB>(key: K): DB[K] {
    return memoryDB[key] || initialDB[key];
  },

  add<K extends keyof DB>(key: K, item: any) {
    const id = item.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newItem = { ...item, id };
    
    memoryDB[key] = [...(memoryDB[key] as any), newItem] as any;
    scheduleSync();
    window.dispatchEvent(new Event('local-db-update'));
    
    return newItem;
  },

  addMany<K extends keyof DB>(key: K, items: any[]) {
    const newItems = items.map(item => ({
      id: item.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...item
    }));
    
    memoryDB[key] = [...(memoryDB[key] as any), ...newItems] as any;
    scheduleSync();
    window.dispatchEvent(new Event('local-db-update'));
    
    return newItems;
  },

  update<K extends keyof DB>(key: K, id: string, updates: any) {
    const collectionArr = [...(memoryDB[key] as any[])];
    const index = collectionArr.findIndex((i: any) => i.id === id);
    if (index !== -1) {
      const updatedItem = { ...collectionArr[index], ...updates };
      collectionArr[index] = updatedItem;
      memoryDB[key] = collectionArr as any;
      scheduleSync();
      window.dispatchEvent(new Event('local-db-update'));
    }
  },

  delete<K extends keyof DB>(key: K, id: string) {
    memoryDB[key] = (memoryDB[key] as any[]).filter((i: any) => i.id !== id) as any;
    scheduleSync();
    window.dispatchEvent(new Event('local-db-update'));
  },

  batch<K extends keyof DB>(key: K, operations: Array<{ type: 'add' | 'update' | 'delete', id?: string, data?: any }>) {
    let collectionArr = [...(memoryDB[key] as any[])];
    
    operations.forEach(op => {
      if (op.type === 'add') {
        const id = op.data.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newItem = { ...op.data, id };
        collectionArr.push(newItem);
      } else if (op.type === 'update' && op.id) {
        const idx = collectionArr.findIndex((i: any) => i.id === op.id);
        if (idx !== -1) {
          collectionArr[idx] = { ...collectionArr[idx], ...op.data };
        }
      } else if (op.type === 'delete' && op.id) {
        collectionArr = collectionArr.filter((i: any) => i.id !== op.id);
      }
    });

    memoryDB[key] = collectionArr as any;
    scheduleSync();
    window.dispatchEvent(new Event('local-db-update'));
  },

  exportAll(): string {
    return JSON.stringify(memoryDB);
  },

  importAll(json: string) {
    try {
      const data = JSON.parse(json);
      if (data && typeof data === 'object' && 'schools' in data) {
        memoryDB = { ...initialDB, ...data };
        scheduleSync();
        window.dispatchEvent(new Event('local-db-update'));
      }
    } catch (e) {}
  }
};

