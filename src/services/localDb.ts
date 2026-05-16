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

const STORAGE_KEY = 'smart_school_local_db';
let memoryDB: DB = { ...initialDB };

// IndexedDB Helper
const DB_NAME = 'SmartSchoolDB';
const STORE_NAME = 'Storage';

async function getDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, val: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(val, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Debounce save logic
let saveTimeout: any = null;

async function saveToIndexedDB() {
  try {
    const dataStr = JSON.stringify(memoryDB);
    await idbSet(STORAGE_KEY, dataStr);
  } catch (error) {
    console.error("Error saving DB to IndexedDB:", error);
  }
}

function scheduleSave() {
   if (saveTimeout) clearTimeout(saveTimeout);
   saveTimeout = setTimeout(saveToIndexedDB, 500);
}

export const localDb = {
  async init() {
    try {
      // Migrate from localStorage to IndexedDB if needed
      let dataStr = null;
      try {
         dataStr = await idbGet(STORAGE_KEY);
      } catch(e) {}
      
      if (!dataStr) {
         // Fallback to localstorage for migration
         dataStr = localStorage.getItem(STORAGE_KEY);
      }

      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data) {
           memoryDB = { ...initialDB, ...data };
        }
      }
    } catch(e) {
      console.error('Failed to parse local DB', e);
    }
    
    // Seed default admin if no users exist
    if (!memoryDB.users || memoryDB.users.length === 0) {
      memoryDB.users = [{
        id: 'user_master_admin',
        username: 'Failh',
        email: 'admin@admin.com',
        password: 'Ff71295343',
        role: 'admin',
        permissions: ['all'],
        canModify: true,
        createdAt: new Date().toISOString()
      }];
      scheduleSave();
    }
    
    window.dispatchEvent(new Event('local-db-update'));
  },

  get(): DB {
    return memoryDB;
  },

  save(data: DB) {
    memoryDB = data;
    scheduleSave();
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
    scheduleSave();
    window.dispatchEvent(new Event('local-db-update'));
    
    return newItem;
  },

  addMany<K extends keyof DB>(key: K, items: any[]) {
    const newItems = items.map(item => ({
      id: item.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...item
    }));
    
    memoryDB[key] = [...(memoryDB[key] as any), ...newItems] as any;
    scheduleSave();
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
      scheduleSave();
      window.dispatchEvent(new Event('local-db-update'));
    }
  },

  delete<K extends keyof DB>(key: K, id: string) {
    memoryDB[key] = (memoryDB[key] as any[]).filter((i: any) => i.id !== id) as any;
    scheduleSave();
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
    scheduleSave();
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
        scheduleSave();
        window.dispatchEvent(new Event('local-db-update'));
      }
    } catch (e) {}
  }
};


