import { Tab, User } from '../types';

const AUTH_USERS_KEY = 'school_accounting_users';
const AUTH_SESSION_KEY = 'school_accounting_session';

const ALL_TABS: Tab[] = ['dashboard', 'students', 'attendance', 'payments', 'reports', 'unpaid', 'staff', 'expenses', 'ledger', 'idcards', 'backup', 'whatsapp', 'teachers', 'investor', 'accounts'];

export const authService = {
  getCurrentUser(): User | null {
    const data = localStorage.getItem(AUTH_SESSION_KEY);
    if (!data) return null;
    const user = JSON.parse(data);
    // Migration for old users
    if (!user.permissions) {
      user.permissions = user.role === 'admin' ? ALL_TABS : ['dashboard', 'students', 'attendance'];
    }
    if (user.canModify === undefined) {
      user.canModify = user.role === 'admin';
    }
    return user;
  },

  getAllUsers(): User[] {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    return users.map((user: any) => ({
      ...user,
      permissions: user.permissions || (user.role === 'admin' ? ALL_TABS : ['dashboard', 'students', 'attendance']),
      canModify: user.canModify !== undefined ? user.canModify : (user.role === 'admin')
    }));
  },

  register(username: string, password: string, role?: 'admin' | 'staff', permissions?: Tab[], canModify?: boolean) {
    const users = this.getAllUsers();
    if (users.find((u: any) => u.username === username)) {
      throw new Error('اسم المستخدم موجود مسبقاً');
    }
    
    const isFirstUser = users.length === 0;
    const userRole = role || (isFirstUser ? 'admin' : 'staff');
    const userPermissions = permissions || (isFirstUser ? ALL_TABS : ['dashboard', 'students', 'attendance']);
    const userCanModify = canModify !== undefined ? canModify : isFirstUser;

    const newUser: User = { 
      id: Math.random().toString(36).substring(2, 15), 
      username, 
      password, 
      role: userRole,
      permissions: userPermissions,
      canModify: userCanModify,
      createdAt: new Date().toISOString() 
    };

    users.push(newUser);
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    
    // Only set as current session if it's the very first user (registration)
    // If an admin is creating an account, we don't want to switch sessions
    const currentSession = localStorage.getItem(AUTH_SESSION_KEY);
    if (!currentSession || isFirstUser) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(newUser));
    }
    
    return newUser;
  },

  updateUser(id: string, updates: Partial<User>) {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
      
      // Update session if it's the current user
      const currentUser = this.getCurrentUser();
      if (currentUser?.id === id) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(users[index]));
      }
    }
  },

  deleteUser(id: string) {
    const users = this.getAllUsers();
    const filtered = users.filter(u => u.id !== id);
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(filtered));
  },

  login(username: string, password: string) {
    const users = this.getAllUsers();
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      return user;
    }
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  },

  logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.location.reload();
  }
};
