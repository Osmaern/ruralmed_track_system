import React from 'react';
import { LayoutDashboard, Package, TrendingUp, Settings, Wifi, WifiOff, RefreshCw, UserCircle, Receipt } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  isOnline: boolean;
  isSyncing?: boolean;
  user: User | null;
}

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex flex-col items-center justify-center w-full py-2 text-[10px] sm:text-xs font-medium transition-colors ${active ? 'text-primary bg-teal-50 border-t-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
  >
    {icon}
    <span className="mt-1">{label}</span>
  </Link>
);

export const Layout: React.FC<LayoutProps> = ({ children, isOnline, isSyncing, user }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-gray-50 pt-safe">
      <header className="bg-white shadow-sm px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white p-1.5 rounded-lg"><Package size={20} /></div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">RuralMed</h1>
            {user && <div className="flex items-center gap-1 text-xs text-gray-500"><UserCircle size={10} /><span>{user.name} ({user.role})</span></div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && <div className="flex items-center gap-1 text-xs text-primary bg-teal-50 px-2 py-1 rounded-full animate-pulse"><RefreshCw size={12} className="animate-spin" /><span>Syncing...</span></div>}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pb-24 max-w-4xl mx-auto w-full">{children}</main>
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-20 flex justify-between items-stretch h-16 pb-safe">
        <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Home" active={location.pathname === '/'} />
        <NavItem to="/inventory" icon={<Package size={20} />} label="Stock" active={location.pathname === '/inventory'} />
        <NavItem to="/sales" icon={<Receipt size={20} />} label="Sales" active={location.pathname === '/sales'} />
        <NavItem to="/analytics" icon={<TrendingUp size={20} />} label="Stats" active={location.pathname === '/analytics'} />
        <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" active={location.pathname === '/settings'} />
      </nav>
    </div>
  );
};