import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { SalesLog } from './pages/SalesLog';
import { Login } from './pages/Login';
import { StorageService } from './services/storageService';
import { Subscription, User } from './types';
import { Lock } from 'lucide-react';

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription>(StorageService.getSubscription());
  const [user, setUser] = useState<User | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const savedUser = StorageService.getUserSession();
    if (savedUser) setUser(savedUser);

    const handleOnline = () => { setIsOnline(true); performAutoSync(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) performAutoSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performAutoSync = async () => {
    setIsSyncing(true);
    try { await StorageService.syncWithServer(); } 
    catch (e) { console.error("Sync failed", e); } 
    finally { setIsSyncing(false); }
  };

  const handleManualSync = async () => {
    if (!navigator.onLine) return alert("Cannot sync while offline.");
    setIsSyncing(true);
    try { await StorageService.syncWithServer(); } 
    finally { setIsSyncing(false); }
  };

  const handleReset = () => {
    const currentUser = user;
    StorageService.resetData();
    if (currentUser) StorageService.saveUserSession(currentUser);
    setResetKey(prev => prev + 1);
    setSubscription(StorageService.getSubscription());
    window.location.hash = '/';
  };

  const handleLogout = () => {
    StorageService.logout();
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  const isExpired = new Date(subscription.expiryDate) < new Date() && subscription.isActive;

  if (isExpired) {
     return (
       <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-fade-in">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Expired</h1>
            <p className="text-gray-500 mb-6">License expired. Pay via MoMo to unlock.</p>
            <Settings 
              subscription={subscription} 
              onUpdate={() => setSubscription(StorageService.getSubscription())} 
              onReset={handleReset} 
              onSync={handleManualSync}
              isSyncing={isSyncing}
              onLogout={handleLogout}
              user={user}
            />
         </div>
       </div>
     )
  }

  return (
    <HashRouter>
      <Layout key={resetKey} isOnline={isOnline} isSyncing={isSyncing} user={user}>
        <Routes>
          <Route path="/" element={<Dashboard subscription={subscription} />} />
          <Route path="/inventory" element={<Inventory user={user} />} />
          <Route path="/sales" element={<SalesLog />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={
            <Settings 
              subscription={subscription} 
              onUpdate={() => setSubscription(StorageService.getSubscription())} 
              onReset={handleReset} 
              onSync={handleManualSync}
              isSyncing={isSyncing}
              onLogout={handleLogout}
              user={user}
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}