import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { isFirebaseInitialized } from '../services/firebase';
import { Subscription, User } from '../types';
import { ShieldCheck, Smartphone, RefreshCcw, LogOut, RefreshCw, Share2, Copy, Cloud, CloudOff } from 'lucide-react';

export const Settings: React.FC<{ 
  subscription: Subscription; 
  onUpdate: () => void;
  onReset: () => void;
  onSync: () => Promise<void>;
  onLogout: () => void;
  isSyncing: boolean;
  user: User | null;
}> = ({ subscription, onUpdate, onReset, onSync, onLogout, isSyncing, user }) => {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleManualRenew = async () => {
    if (!code.trim()) return;
    setVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (code === '2005') {
      const newSub: Subscription = {
        isActive: true,
        expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        lastPaymentMethod: 'MoMo'
      };
      StorageService.updateSubscription(newSub);
      onUpdate();
      showNotification("Subscription Activated!", 'success');
      setCode('');
    } else {
      showNotification("Invalid Code", 'error');
    }
    setVerifying(false);
  };
  
  const handleShareApp = async () => {
    const shareData = {
      title: 'RuralMed Track',
      text: 'Manage clinic inventory efficiently.',
      url: window.location.href
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      navigator.clipboard.writeText(shareData.url);
      showNotification("Link copied!", 'success');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {notification && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-xl z-50 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {notification.msg}
        </div>
      )}

      <div className="bg-teal-700 text-white p-5 rounded-xl shadow-md">
        <h2 className="text-lg font-bold flex items-center gap-2"><Share2 size={20} /> Share App</h2>
        <button onClick={handleShareApp} className="w-full bg-white text-teal-800 py-3 rounded-lg font-bold mt-2 flex justify-center gap-2">
           <Copy size={16} /> Share / Copy Link
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex gap-2"><Smartphone className="text-primary"/> Subscription</h2>
        <div className="bg-gray-50 p-3 rounded mb-3 flex justify-between">
           <span>Status</span>
           <span className={subscription.isActive ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{subscription.isActive ? 'Active' : 'Expired'}</span>
        </div>
        <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Admin Code (2005)" 
              className="flex-1 p-2 border rounded"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={handleManualRenew} disabled={verifying} className="bg-primary text-white px-4 rounded font-bold">
              {verifying ? '...' : <ShieldCheck/>}
            </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex gap-2"><RefreshCcw/> Data</h2>
        
        <div className={`mb-3 p-2 rounded flex gap-2 items-center text-xs font-bold ${isFirebaseInitialized ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
           {isFirebaseInitialized ? <Cloud size={14} /> : <CloudOff size={14} />}
           {isFirebaseInitialized ? 'Cloud Connected' : 'Local Mode'}
        </div>

        <button onClick={onSync} disabled={isSyncing} className="w-full mb-3 p-3 bg-gray-50 rounded border flex items-center justify-center gap-2 font-bold">
            <RefreshCw className={isSyncing?'animate-spin':''} /> Sync Data
        </button>

        <button onClick={() => confirm("Reset all data?") && onReset()} className="w-full p-3 bg-red-50 text-red-600 rounded border border-red-100 font-bold flex items-center justify-center gap-2">
            <RefreshCcw size={16} /> Reset Demo Data
        </button>
      </div>

      <button onClick={onLogout} className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
        <LogOut size={20} /> Logout {user?.name}
      </button>
    </div>
  );
};