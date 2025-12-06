import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { InventoryItem, GeminiInsight, Subscription } from '../types';
import { AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

export const Dashboard: React.FC<{subscription: Subscription}> = ({ subscription }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [insight, setInsight] = useState<GeminiInsight|null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setItems(StorageService.getInventory()), []);

  const analyze = async () => {
    setLoading(true);
    const latest = StorageService.getInventory();
    setInsight(await GeminiService.analyzeInventory(latest));
    setLoading(false);
  };

  const low = items.filter(i=>i.quantity<=i.minLevel).length;
  const exp = items.filter(i=>new Date(i.expiryDate)<new Date()).length;

  return (
    <div className="space-y-4">
       <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex justify-between">
          <span className="font-bold text-teal-800">License: {subscription.isActive?'Active':'Expired'}</span>
          <span className="text-sm">{new Date(subscription.expiryDate).toLocaleDateString()}</span>
       </div>
       <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white shadow rounded-xl border border-gray-100">
             <div className="text-gray-500 text-sm">Low Stock</div>
             <div className="text-3xl font-bold text-orange-500">{low}</div>
          </div>
          <div className="p-4 bg-white shadow rounded-xl border border-gray-100">
             <div className="text-gray-500 text-sm">Expired</div>
             <div className="text-3xl font-bold text-red-500">{exp}</div>
          </div>
       </div>
       <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <div className="flex justify-between items-center mb-2">
             <h2 className="font-bold text-indigo-900 flex gap-2"><Sparkles size={18}/> Smart Assistant</h2>
             <button onClick={analyze} className="bg-white px-3 py-1 rounded border text-xs font-bold text-indigo-600">{loading?'...':'Analyze'}</button>
          </div>
          {insight ? (
             <div className="text-sm space-y-2">
                <p className="italic text-indigo-800">{insight.summary}</p>
                {insight.urgentActions.map((a,i)=><div key={i} className="text-red-600 font-bold">• {a}</div>)}
             </div>
          ) : <p className="text-xs text-center text-indigo-400">Tap analyze for AI insights</p>}
       </div>
    </div>
  );
};