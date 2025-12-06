import React, { useEffect, useState } from 'react';
import { InventoryItem, GeminiInsight, Subscription } from '../types';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { AlertTriangle, AlertCircle, TrendingDown, Sparkles, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardProps {
  subscription: Subscription;
}

export const Dashboard: React.FC<DashboardProps> = ({ subscription }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [insight, setInsight] = useState<GeminiInsight | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    setItems(StorageService.getInventory());
  }, []);

  const lowStockCount = items.filter(i => i.quantity <= i.minLevel).length;
  const expiredCount = items.filter(i => new Date(i.expiryDate) < new Date()).length;
  const criticalLowCount = items.filter(i => i.category === 'Critical' && i.quantity <= i.minLevel).length;

  const handleRefreshAnalysis = async () => {
    setLoadingAi(true);
    
    // CRITICAL: Fetch the latest inventory state immediately before analysis
    // This ensures we analyze the most up-to-date data even if the component state was stale
    const currentItems = StorageService.getInventory();
    setItems(currentItems);

    // Add small delay to ensure UI updates before heavy processing
    setTimeout(async () => {
      const result = await GeminiService.analyzeInventory(currentItems);
      setInsight(result);
      setLoadingAi(false);
    }, 100);
  };

  const daysLeft = Math.ceil((new Date(subscription.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));

  return (
    <div className="space-y-6">
      {/* Subscription Alert */}
      <div className={`${daysLeft < 5 ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200'} border rounded-xl p-4 flex justify-between items-center animate-fade-in`}>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">Subscription Status</p>
          <p className={`font-bold ${daysLeft < 5 ? 'text-red-700' : 'text-teal-800'}`}>
            {daysLeft > 0 ? `${daysLeft} Days Remaining` : 'Expired'}
          </p>
        </div>
        <Link to="/settings" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Extend via MoMo
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-gray-500 text-sm">Low Stock</span>
            <AlertCircle size={18} className="text-accent" />
          </div>
          <span className="text-3xl font-bold text-gray-800 mt-2">{lowStockCount}</span>
          <span className="text-xs text-gray-400 mt-1">Items below min level</span>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-gray-500 text-sm">Expired</span>
            <AlertTriangle size={18} className="text-danger" />
          </div>
          <span className="text-3xl font-bold text-gray-800 mt-2">{expiredCount}</span>
          <span className="text-xs text-gray-400 mt-1">Do not dispense</span>
        </div>

         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between col-span-2 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-gray-500 text-sm">Critical Shortages</span>
            <TrendingDown size={18} className="text-danger" />
          </div>
          <span className="text-3xl font-bold text-danger mt-2">{criticalLowCount}</span>
          <span className="text-xs text-gray-400 mt-1">Critical items needing immediate restock</span>
        </div>
      </div>

      {/* Gemini AI Insights */}
      <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles size={100} />
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" />
            Smart Assistant
          </h2>
          <button 
            onClick={handleRefreshAnalysis}
            disabled={loadingAi}
            className={`text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1 hover:bg-indigo-50 transition-all ${loadingAi ? 'opacity-70 cursor-wait' : 'hover:scale-105 active:scale-95'}`}
          >
            {loadingAi ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} />}
            {loadingAi ? 'Analyzing...' : 'Analyze Stock'}
          </button>
        </div>

        {insight ? (
          <div className="space-y-3 relative z-10 animate-fade-in">
            <p className="text-sm text-indigo-800 italic bg-white/50 p-2 rounded-lg border border-indigo-100">
              "{insight.summary}"
            </p>
            
            {insight.urgentActions.length > 0 && (
              <div className="bg-white/80 p-3 rounded-lg shadow-sm">
                <p className="text-xs font-bold text-danger uppercase mb-1 flex items-center gap-1">
                  <AlertCircle size={12} /> Urgent Attention
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-1">
                  {insight.urgentActions.slice(0, 3).map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
             {insight.restockSuggestions.length > 0 && (
              <div className="bg-white/80 p-3 rounded-lg shadow-sm">
                <p className="text-xs font-bold text-indigo-700 uppercase mb-1 flex items-center gap-1">
                   <TrendingDown size={12} /> Restock Suggestions
                </p>
                 <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-1">
                  {insight.restockSuggestions.slice(0, 3).map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-indigo-400 text-sm flex flex-col items-center">
            <Sparkles size={32} className="mb-2 opacity-30" />
            <p>Tap "Analyze Stock" to generate AI inventory insights.</p>
          </div>
        )}
      </div>

      <div className="pt-2">
        <Link to="/inventory" className="block w-full bg-primary text-white text-center py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-secondary transition-all active:scale-95">
          Manage Inventory
        </Link>
      </div>
    </div>
  );
};