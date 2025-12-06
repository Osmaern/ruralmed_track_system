import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { isFirebaseInitialized } from '../services/firebase';
import { Subscription, User } from '../types';
import { ShieldCheck, Smartphone, RefreshCcw, LogOut, RefreshCw, CheckCircle, XCircle, KeyRound, Share2, Copy, Cloud, CloudOff } from 'lucide-react';

export const Settings: React.FC<{ 
  subscription: Subscription; 
  onUpdate: () => void;
  onReset: () => void;
  onSync: () => Promise<void>;
  onLogout: () => void;
  isSyncing: boolean;
  user?: User | null;
}> = ({ subscription, onUpdate, onReset, onSync, onLogout, isSyncing, user }) => {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [inputError, setInputError] = useState(false);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleManualRenew = async () => {
    if (!code.trim()) return;

    setVerifying(true);
    setInputError(false);

    // Simulate network/validation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (code === '2005') {
      const newSub: Subscription = {
        isActive: true,
        expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        lastPaymentMethod: 'MoMo'
      };
      StorageService.updateSubscription(newSub);
      onUpdate();
      showNotification("Subscription Activated for 30 Days!", 'success');
      setCode('');
    } else {
      setInputError(true);
      showNotification("Invalid Admin Code. Try '2005'", 'error');
    }
    setVerifying(false);
  };
  
  const handleSyncClick = async () => {
    await onSync();
    showNotification("Data synced with server successfully.", 'success');
  };

  const handleResetClick = () => {
    if (confirm("WARNING: This will delete all inventory and logs. Reset to demo data?")) {
      onReset();
    }
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'RuralMed Track',
      text: 'Manage clinic inventory efficiently with RuralMed.',
      url: window.location.origin + window.location.pathname // Uses current URL
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      // Fallback for desktop or unsupported browsers
      navigator.clipboard.writeText(shareData.url);
      showNotification("App Link copied to clipboard!", 'success');
    }
  };

  return (
    <div className="space-y-6 relative pb-10">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 z-50 animate-fade-in ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span className="text-sm font-bold">{notification.msg}</span>
        </div>
      )}

      {/* Share Section */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 p-5 rounded-xl shadow-md text-white">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Share2 size={20} />
            Share Application
          </h2>
        </div>
        <p className="text-teal-100 text-xs mb-4">
          Send this app to your workers so they can install it on their phones.
        </p>
        <button 
          onClick={handleShareApp}
          className="w-full bg-white text-teal-800 py-3 rounded-lg font-bold text-sm hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
        >
          {navigator.share ? <Share2 size={16} /> : <Copy size={16} />}
          {navigator.share ? 'Share Link via WhatsApp/SMS' : 'Copy Link to Clipboard'}
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Smartphone className="text-primary" size={20} />
          Subscription Status
        </h2>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Status</span>
            <span className={subscription.isActive ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
              {subscription.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Expires</span>
            <span className="font-medium text-gray-800">{new Date(subscription.expiryDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Manual Extension</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Enter Admin Code" 
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${inputError ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200 focus:ring-primary/50'}`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <button 
              onClick={handleManualRenew}
              disabled={verifying || !code}
              className={`px-4 rounded-lg font-bold text-white transition-all flex items-center gap-2 ${verifying ? 'bg-gray-400' : 'bg-primary hover:bg-secondary active:scale-95'}`}
            >
              {verifying ? <RefreshCw className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
              <span className="hidden sm:inline">Verify</span>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 pl-1">
            Use code <strong>2005</strong> to verify payment.
          </p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <RefreshCcw className="text-gray-600" size={20} />
          Data Management
        </h2>
        
        {/* Connection Status Badge */}
        <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${isFirebaseInitialized ? 'bg-green-50 border-green-200 text-green-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
          {isFirebaseInitialized ? <Cloud size={18} /> : <CloudOff size={18} />}
          <div>
            <p className="text-xs font-bold uppercase">{isFirebaseInitialized ? 'Cloud Connected' : 'Simulation Mode'}</p>
            <p className="text-[10px] opacity-80">{isFirebaseInitialized ? 'Syncing to live Firestore' : 'Data stored locally only'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 group"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-white rounded-lg border border-gray-200 text-primary ${isSyncing ? 'animate-spin' : ''}`}>
                <RefreshCw size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800">Sync Data</p>
                <p className="text-xs text-gray-500">Backup inventory to server</p>
              </div>
            </div>
          </button>

          <button 
            onClick={handleResetClick}
            className="w-full flex items-center justify-between p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors border border-red-100 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg border border-red-100 text-red-500">
                <RefreshCcw size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-red-700">Reset Demo Data</p>
                <p className="text-xs text-red-400">Clear all changes & reload</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors"
      >
        <LogOut size={20} />
        Logout {user?.name ? user.name : 'User'}
      </button>

      <div className="text-center text-xs text-gray-400 pt-4 pb-2">
        <p>RuralMed v1.2.0 (MVP)</p>
        <p>Built for Rural Clinics</p>
      </div>
    </div>
  );
};