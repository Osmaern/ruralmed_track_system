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
  
  // Key to force re-render of Layout and Pages on reset
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    // Check for logged in user
    const savedUser = StorageService.getUserSession();
    if (savedUser) {
      setUser(savedUser);
    }

    // Network listeners for "Offline-First" indicator
    const handleOnline = () => {
      setIsOnline(true);
      performAutoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for subscription validity
    const now = new Date();
    const expiry = new Date(subscription.expiryDate);
    if (now > expiry && subscription.isActive) {
      const expiredSub = { ...subscription, isActive: false };
      setSubscription(expiredSub);
      StorageService.updateSubscription(expiredSub);
    }
    
    // Attempt initial sync if online
    if (navigator.onLine) {
       performAutoSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performAutoSync = async () => {
    setIsSyncing(true);
    try {
      await StorageService.syncWithServer();
      console.log("Auto-sync completed");
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      alert("Cannot sync while offline. Please check your connection.");
      return;
    }
    setIsSyncing(true);
    try {
      await StorageService.syncWithServer();
    } catch (e) {
      console.error("Manual sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshSub = () => {
    setSubscription(StorageService.getSubscription());
  };

  const handleReset = () => {
    const currentUser = user;
    
    // Perform Reset
    StorageService.resetData();
    
    // Restore Session so user isn't logged out unexpectedly
    if (currentUser) {
      StorageService.saveUserSession(currentUser);
    }
    
    // Force UI Refresh
    setResetKey(prev => prev + 1);
    setSubscription(StorageService.getSubscription());
    window.location.hash = '/';
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    StorageService.logout();
    setUser(null);
  };

  // 1. Auth Gate
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 2. Subscription Gate
  const isExpired = new Date(subscription.expiryDate) < new Date();

  if (isExpired) {
     return (
       <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-fade-in">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Expired</h1>
            <p className="text-gray-500 mb-6">Your 30-day RuralMed license has expired. Please contact administration or pay via Mobile Money to restore access.</p>
            
            <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <p className="text-sm font-bold text-gray-700">Payment Instructions:</p>
              <p className="text-xs text-gray-500 mt-1">MoMo Pay: 055-633-5851</p>
            </div>

            <Settings 
              subscription={subscription} 
              onUpdate={refreshSub} 
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
              onUpdate={refreshSub} 
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