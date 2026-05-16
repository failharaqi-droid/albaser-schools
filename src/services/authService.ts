import { Tab, User } from '../types';
import { localDb } from './localDb';

const AUTH_SESSION_KEY = 'school_accounting_session';

const ALL_TABS: Tab[] = ['dashboard', 'students', 'attendance', 'payments', 'add-student', 'attendance-reports', 'reports', 'unpaid', 'staff', 'expenses', 'ledger', 'idcards', 'backup', 'whatsapp', 'teachers', 'investor', 'accounts', 'userguide'];

const SUPER_ADMIN: User = {
  id: 'super-admin-failh',
  username: 'Failh',
  password: 'Ff71295343',
  role: 'admin',
  permissions: ALL_TABS,
  canModify: true,
  createdAt: '2024-01-01T00:00:00.000Z'
};

export const authService = {
  getCurrentUser(): User | null {
    const data = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!data) return null;
    const user = JSON.parse(data);
    
    // If it's the super admin, return the fixed object
    if (user.username === SUPER_ADMIN.username) {
      return SUPER_ADMIN;
    }
    return user;
  },

  getAllUsers(): User[] {
    const users = localDb.getAll('users');
    const mappedUsers = [...users];

    // Always include super admin in the list if it's not already there
    if (!mappedUsers.find((u: User) => u.username === SUPER_ADMIN.username)) {
      mappedUsers.unshift(SUPER_ADMIN);
    }
    
    return mappedUsers;
  },

  register(username: string, password: string, role?: 'admin' | 'staff', permissions?: Tab[], canModify?: boolean) {
    if (username === SUPER_ADMIN.username) {
      throw new Error('لا يمكن استخدام اسم مستخدم مدير النظام');
    }
    const users = this.getAllUsers();
    if (users.find((u: any) => u.username === username)) {
      throw new Error('اسم المستخدم موجود مسبقاً');
    }
    
    const userRole = role || 'staff';
    const userPermissions = permissions || ['dashboard', 'students', 'attendance'];
    const userCanModify = canModify !== undefined ? canModify : (userRole === 'admin');

    const newUser: User = { 
      id: Math.random().toString(36).substring(2, 15), 
      username, 
      password, 
      role: userRole,
      permissions: userPermissions,
      canModify: userCanModify,
      createdAt: new Date().toISOString() 
    };

    localDb.add('users', newUser);
    return newUser;
  },

  updateUser(id: string, updates: Partial<User>) {
    const users = this.getAllUsers();
    const userToUpdate = users.find(u => u.id === id);
    if (userToUpdate?.username === SUPER_ADMIN.username) {
       throw new Error('لا يمكن تعديل حساب مدير النظام الثابت');
    }

    localDb.update('users', id, updates);
    
    // Update session if it's the current user
    const currentUser = this.getCurrentUser();
    if (currentUser?.id === id) {
      const updatedUser = { ...userToUpdate, ...updates } as User;
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updatedUser));
    }
  },

  deleteUser(id: string) {
    const users = this.getAllUsers();
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.username === SUPER_ADMIN.username) {
       throw new Error('لا يمكن حذف حساب مدير النظام الثابت');
    }

    localDb.delete('users', id);
  },

  login(username: string, password: string) {
    if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(SUPER_ADMIN));
      return SUPER_ADMIN;
    }

    const users = this.getAllUsers();
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      return user;
    }
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  },

  logout() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    window.location.reload();
  }
};
