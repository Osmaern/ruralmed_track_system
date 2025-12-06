import { InventoryItem, ConsumptionLog, Subscription, ItemCategory, User, RegisteredUser } from '../types';
import { db, isFirebaseInitialized } from './firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

// Keys for LocalStorage
const STORAGE_KEYS = {
  INVENTORY: 'ruralmed_inventory',
  LOGS: 'ruralmed_logs',
  SUBSCRIPTION: 'ruralmed_sub',
  USER_SESSION: 'ruralmed_user_session',
  LAST_SYNC: 'ruralmed_last_sync',
  USERS: 'ruralmed_registered_users',
  OTP_REGISTRY: 'ruralmed_otp_registry'
};

// Helper to get fresh seed data (prevents mutation issues)
const getSeedInventory = (): InventoryItem[] => [
  {
    id: '1',
    name: 'Paracetamol 500mg',
    quantity: 450,
    minLevel: 100,
    batchNumber: 'BATCH-001',
    expiryDate: new Date(Date.now() + 86400000 * 365).toISOString(),
    category: ItemCategory.ESSENTIAL,
    lastUpdated: new Date().toISOString(),
    isForSale: true,
    price: 5.00
  },
  {
    id: '2',
    name: 'Amoxicillin 250mg',
    quantity: 20,
    minLevel: 50,
    batchNumber: 'BATCH-002',
    expiryDate: new Date(Date.now() + 86400000 * 180).toISOString(),
    category: ItemCategory.CRITICAL,
    lastUpdated: new Date().toISOString(),
    isForSale: true,
    price: 15.50
  },
  {
    id: '3',
    name: 'Oral Rehydration Salts',
    quantity: 15,
    minLevel: 30,
    batchNumber: 'BATCH-003',
    expiryDate: new Date(Date.now() - 86400000 * 5).toISOString(), // Expired
    category: ItemCategory.ESSENTIAL,
    lastUpdated: new Date().toISOString(),
    isForSale: false,
    price: 0
  },
  {
    id: '4',
    name: 'Surgical Gloves (Pair)',
    quantity: 200,
    minLevel: 50,
    batchNumber: 'BATCH-004',
    expiryDate: new Date(Date.now() + 86400000 * 700).toISOString(),
    category: ItemCategory.NON_ESSENTIAL,
    lastUpdated: new Date().toISOString(),
    isForSale: true,
    price: 2.00
  }
];

const getSeedSubscription = (): Subscription => ({
  isActive: true,
  expiryDate: new Date(Date.now() + 86400000 * 15).toISOString(), // 15 days left
  lastPaymentMethod: 'MoMo'
});

const getSeedUsers = (): RegisteredUser[] => [
  {
    id: 'admin-001',
    username: 'admin',
    pin: '8888',
    role: 'Admin',
    phone: '0550000000',
    email: 'admin@ruralmed.com'
  },
  {
    id: 'staff-001',
    username: 'staff',
    pin: '1111',
    role: 'Staff',
    phone: '0551111111',
    email: 'staff@ruralmed.com'
  }
];

interface OtpRecord {
  code: string;
  expiresAt: number;
}

// Helper to sanitize Firestore data (convert Timestamps to ISO strings)
const normalizeFirestoreData = (data: any): any => {
  const normalized = { ...data };
  for (const key in normalized) {
    if (normalized[key] && typeof normalized[key] === 'object' && 'seconds' in normalized[key]) {
      // It's a Firestore Timestamp, convert to ISO string
      normalized[key] = new Date(normalized[key].seconds * 1000).toISOString();
    }
  }
  return normalized;
};

export const StorageService = {
  // --- Inventory ---
  getInventory: (): InventoryItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return data ? JSON.parse(data) : getSeedInventory();
  },

  saveInventory: (items: InventoryItem[]) => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
  },

  addItem: (item: InventoryItem) => {
    const items = StorageService.getInventory();
    items.push(item);
    StorageService.saveInventory(items);
  },

  updateItem: (updatedItem: InventoryItem) => {
    const items = StorageService.getInventory();
    const index = items.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
      items[index] = updatedItem;
      StorageService.saveInventory(items);
    }
  },

  deleteItem: (id: string) => {
    const items = StorageService.getInventory();
    const filtered = items.filter(i => i.id !== id);
    StorageService.saveInventory(filtered);
  },

  // --- Logs ---
  getLogs: (): ConsumptionLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  },

  addLog: (log: ConsumptionLog) => {
    const logs = StorageService.getLogs();
    logs.push(log);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  },

  saveLogs: (logs: ConsumptionLog[]) => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  },

  // --- Subscription ---
  getSubscription: (): Subscription => {
    const data = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    return data ? JSON.parse(data) : getSeedSubscription();
  },

  updateSubscription: (sub: Subscription) => {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
  },
  
  // --- Auth & Users ---
  getRegisteredUsers: (): RegisteredUser[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (data) {
      return JSON.parse(data);
    }
    const seeds = getSeedUsers();
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seeds));
    return seeds;
  },

  saveRegisteredUsers: (users: RegisteredUser[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  registerUser: (user: RegisteredUser): boolean => {
    const users = StorageService.getRegisteredUsers();
    if (users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
      return false; // Username taken
    }
    users.push(user);
    StorageService.saveRegisteredUsers(users);
    return true;
  },

  findUserByContact: (contact: string): RegisteredUser | null => {
    const users = StorageService.getRegisteredUsers();
    return users.find(u => u.email === contact || u.phone === contact) || null;
  },

  resetUserPin: (userId: string, newPin: string) => {
    const users = StorageService.getRegisteredUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].pin = newPin;
      StorageService.saveRegisteredUsers(users);
    }
  },

  getUserSession: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    return data ? JSON.parse(data) : null;
  },

  saveUserSession: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(user));
  },

  login: (username: string, pin: string): User | null => {
    const users = StorageService.getRegisteredUsers();
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.pin === pin);
    
    if (found) {
      const sessionUser: User = { id: found.id, name: found.username, role: found.role };
      StorageService.saveUserSession(sessionUser);
      return sessionUser;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  },

  // --- OTP Management ---
  requestPasswordResetOtp: async (contact: string): Promise<boolean> => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
    const expiresAt = Date.now() + 5 * 60 * 1000; 
    
    const registryData = localStorage.getItem(STORAGE_KEYS.OTP_REGISTRY);
    const registry: Record<string, OtpRecord> = registryData ? JSON.parse(registryData) : {};
    
    registry[contact] = { code: otp, expiresAt };
    localStorage.setItem(STORAGE_KEYS.OTP_REGISTRY, JSON.stringify(registry));
    
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log(`%c 📨 SMS SENT TO ${contact}: [ ${otp} ] `, 'background: #22c55e; color: white; padding: 4px; font-weight: bold; border-radius: 4px;');
    return true;
  },

  verifyPasswordResetOtp: (contact: string, code: string): boolean => {
    const registryData = localStorage.getItem(STORAGE_KEYS.OTP_REGISTRY);
    if (!registryData) return false;

    const registry: Record<string, OtpRecord> = JSON.parse(registryData);
    const record = registry[contact];

    if (!record) return false;
    if (Date.now() > record.expiresAt) return false; 
    
    if (record.code === code) {
      delete registry[contact];
      localStorage.setItem(STORAGE_KEYS.OTP_REGISTRY, JSON.stringify(registry));
      return true;
    }

    return false;
  },

  // --- Reset for Demo ---
  resetData: () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(getSeedInventory()));
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(getSeedSubscription()));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(getSeedUsers()));
  },

  // --- CLOUD SYNC (FIREBASE) ---
  getLastSync: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },

  syncWithServer: async (): Promise<boolean> => {
    // If not configured, fall back to simulation
    if (!db || !isFirebaseInitialized) {
      console.warn("Firebase not configured. Using simulation.");
      await new Promise(resolve => setTimeout(resolve, 2000));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      return true;
    }

    try {
      // 1. PUSH: Upload Local Inventory to Firestore
      const localInventory = StorageService.getInventory();
      // We use a batch for atomicity (limit 500 ops per batch, assuming <500 items for MVP)
      const batch = writeBatch(db);
      
      localInventory.forEach(item => {
        const ref = doc(db, "inventory", item.id);
        batch.set(ref, item, { merge: true }); // Merge ensures we don't wipe future fields
      });

      // 2. PUSH: Upload Users
      const localUsers = StorageService.getRegisteredUsers();
      localUsers.forEach(u => {
        const ref = doc(db, "users", u.id);
        batch.set(ref, u, { merge: true });
      });

      // 3. PUSH: Upload Logs
      const localLogs = StorageService.getLogs();
      localLogs.forEach(log => {
        const ref = doc(db, "logs", log.id);
        batch.set(ref, log, { merge: true });
      });

      await batch.commit();

      // 4. PULL: Get latest Inventory from Firestore
      const invSnapshot = await getDocs(collection(db, "inventory"));
      const remoteInventory: InventoryItem[] = [];
      invSnapshot.forEach(doc => {
        const raw = doc.data();
        const normalized = normalizeFirestoreData(raw);
        remoteInventory.push(normalized as InventoryItem);
      });
      if (remoteInventory.length > 0) {
        StorageService.saveInventory(remoteInventory);
      }

      // 5. PULL: Get latest Users
      const userSnapshot = await getDocs(collection(db, "users"));
      const remoteUsers: RegisteredUser[] = [];
      userSnapshot.forEach(doc => {
        const raw = doc.data();
        const normalized = normalizeFirestoreData(raw);
        remoteUsers.push(normalized as RegisteredUser);
      });
      if (remoteUsers.length > 0) {
        StorageService.saveRegisteredUsers(remoteUsers);
      }

      // 6. PULL: Get latest Logs (CRITICAL for sharing sales data)
      const logSnapshot = await getDocs(collection(db, "logs"));
      const remoteLogs: ConsumptionLog[] = [];
      logSnapshot.forEach(doc => {
         const raw = doc.data();
         const normalized = normalizeFirestoreData(raw);
         remoteLogs.push(normalized as ConsumptionLog);
      });
      if (remoteLogs.length > 0) {
         StorageService.saveLogs(remoteLogs);
      }
      
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      return true;

    } catch (error) {
      console.error("Cloud Sync Failed:", error);
      throw error;
    }
  }
};