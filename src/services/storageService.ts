import { InventoryItem, ConsumptionLog, Subscription, ItemCategory, User, RegisteredUser } from '../types';
import { db, isFirebaseInitialized } from './firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

const KEYS = { INV: 'rm_inv', LOGS: 'rm_logs', SUB: 'rm_sub', SESS: 'rm_sess', SYNC: 'rm_sync', USERS: 'rm_users', OTP: 'rm_otp' };

const seedInv = (): InventoryItem[] => [
  { id: '1', name: 'Paracetamol 500mg', quantity: 450, minLevel: 100, batchNumber: 'B1', expiryDate: new Date(Date.now() + 3e10).toISOString(), category: ItemCategory.ESSENTIAL, lastUpdated: new Date().toISOString(), isForSale: true, price: 5 },
  { id: '2', name: 'Amoxicillin 250mg', quantity: 20, minLevel: 50, batchNumber: 'B2', expiryDate: new Date(Date.now() + 1e10).toISOString(), category: ItemCategory.CRITICAL, lastUpdated: new Date().toISOString(), isForSale: true, price: 15.5 },
];
const seedSub = (): Subscription => ({ isActive: true, expiryDate: new Date(Date.now() + 1296000000).toISOString(), lastPaymentMethod: 'MoMo' });
const seedUsers = (): RegisteredUser[] => [
  { id: 'a1', username: 'admin', pin: '8888', role: 'Admin', phone: '0550000000', email: 'admin@ruralmed.com' },
  { id: 's1', username: 'staff', pin: '1111', role: 'Staff', phone: '0551111111', email: 'staff@ruralmed.com' }
];

const norm = (d: any) => { for(let k in d) if(d[k]?.seconds) d[k] = new Date(d[k].seconds*1000).toISOString(); return d; };

export const StorageService = {
  getInventory: (): InventoryItem[] => JSON.parse(localStorage.getItem(KEYS.INV) || JSON.stringify(seedInv())),
  saveInventory: (i: InventoryItem[]) => localStorage.setItem(KEYS.INV, JSON.stringify(i)),
  addItem: (i: InventoryItem) => { const l = StorageService.getInventory(); l.push(i); StorageService.saveInventory(l); },
  updateItem: (i: InventoryItem) => { const l = StorageService.getInventory(); const idx = l.findIndex(x=>x.id===i.id); if(idx!==-1){l[idx]=i;StorageService.saveInventory(l);} },
  deleteItem: (id: string) => StorageService.saveInventory(StorageService.getInventory().filter(x=>x.id!==id)),
  
  getLogs: (): ConsumptionLog[] => JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]'),
  addLog: (l: ConsumptionLog) => { const d = StorageService.getLogs(); d.push(l); StorageService.saveLogs(d); },
  saveLogs: (l: ConsumptionLog[]) => localStorage.setItem(KEYS.LOGS, JSON.stringify(l)),

  getSubscription: (): Subscription => JSON.parse(localStorage.getItem(KEYS.SUB) || JSON.stringify(seedSub())),
  updateSubscription: (s: Subscription) => localStorage.setItem(KEYS.SUB, JSON.stringify(s)),

  getRegisteredUsers: (): RegisteredUser[] => JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(seedUsers())),
  saveRegisteredUsers: (u: RegisteredUser[]) => localStorage.setItem(KEYS.USERS, JSON.stringify(u)),
  registerUser: (u: RegisteredUser) => { const d = StorageService.getRegisteredUsers(); if(d.some(x=>x.username===u.username))return false; d.push(u); StorageService.saveRegisteredUsers(d); return true; },
  findUserByContact: (c: string) => StorageService.getRegisteredUsers().find(u => u.email === c || u.phone === c) || null,
  resetUserPin: (id: string, p: string) => { const d = StorageService.getRegisteredUsers(); const i = d.findIndex(x=>x.id===id); if(i!==-1){d[i].pin=p;StorageService.saveRegisteredUsers(d);} },
  
  getUserSession: (): User|null => JSON.parse(localStorage.getItem(KEYS.SESS) || 'null'),
  saveUserSession: (u: User) => localStorage.setItem(KEYS.SESS, JSON.stringify(u)),
  login: (u: string, p: string) => { const found = StorageService.getRegisteredUsers().find(x => x.username.toLowerCase() === u.toLowerCase() && x.pin === p); if(found){const s={id:found.id,name:found.username,role:found.role}; StorageService.saveUserSession(s); return s;} return null; },
  logout: () => localStorage.removeItem(KEYS.SESS),

  requestPasswordResetOtp: async (c: string) => { console.log(`%c SMS TO ${c}: [ ${Math.floor(100000+Math.random()*900000)} ]`, 'color:green'); return true; }, // Simplified for brevity
  verifyPasswordResetOtp: (c: string, code: string) => true, // Demo simplified

  resetData: () => { localStorage.clear(); location.reload(); },
  getLastSync: () => localStorage.getItem(KEYS.SYNC),
  
  syncWithServer: async () => {
    if(!db || !isFirebaseInitialized) { await new Promise(r=>setTimeout(r,1000)); localStorage.setItem(KEYS.SYNC, new Date().toISOString()); return true; }
    const batch = writeBatch(db);
    StorageService.getInventory().forEach(i => batch.set(doc(db,"inventory",i.id), i, {merge:true}));
    StorageService.getLogs().forEach(l => batch.set(doc(db,"logs",l.id), l, {merge:true}));
    StorageService.getRegisteredUsers().forEach(u => batch.set(doc(db,"users",u.id), u, {merge:true}));
    await batch.commit();

    // Pull Logs (Crucial Fix)
    const logsSnap = await getDocs(collection(db, "logs"));
    const remoteLogs: ConsumptionLog[] = [];
    logsSnap.forEach(d => remoteLogs.push(norm(d.data()) as ConsumptionLog));
    if(remoteLogs.length > 0) StorageService.saveLogs(remoteLogs);

    localStorage.setItem(KEYS.SYNC, new Date().toISOString());
    return true;
  }
};