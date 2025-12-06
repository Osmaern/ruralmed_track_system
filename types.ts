export enum ItemCategory {
  CRITICAL = 'Critical',
  ESSENTIAL = 'Essential',
  NON_ESSENTIAL = 'Non-Essential'
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minLevel: number;
  batchNumber: string;
  expiryDate: string; // ISO Date string
  category: ItemCategory;
  lastUpdated: string;
  isForSale?: boolean;
  price?: number;
}

export interface ConsumptionLog {
  id: string;
  itemId: string;
  itemName: string;
  quantityUsed: number;
  date: string;
  saleAmount?: number;
}

export interface Subscription {
  isActive: boolean;
  expiryDate: string;
  lastPaymentMethod: 'MoMo' | 'Cash' | null;
}

export interface User {
  id: string;
  name: string;
  role: 'Admin' | 'Staff';
}

export interface RegisteredUser {
  id: string;
  username: string;
  pin: string;
  role: 'Admin' | 'Staff';
  phone: string;
  email: string;
}

export interface GeminiInsight {
  summary: string;
  urgentActions: string[];
  restockSuggestions: string[];
}