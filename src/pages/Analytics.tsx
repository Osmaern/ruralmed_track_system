import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { ConsumptionLog, InventoryItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CalendarClock, Coins } from 'lucide-react';

export const Analytics: React.FC = () => {
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    setLogs(StorageService.getLogs());
    setItems(StorageService.getInventory());
  }, []);

  // 1. Prepare Consumption Data
  const usageData = logs.reduce((acc: any[], log) => {
    const existing = acc.find(x => x.name === log.itemName);
    if (existing) existing.usage += log.quantityUsed;
    else acc.push({ name: log.itemName, usage: log.quantityUsed });
    return acc;
  }, []).sort((a, b) => b.usage - a.usage).slice(0, 10);

  // 2. Calculate Total Revenue
  const totalRevenue = logs.reduce((sum, log) => sum + (log.saleAmount || 0), 0);

  // 3. Stock Prediction Logic
  const highRiskItems = items.map(item => {
    const itemLogs = logs.filter(l => l.itemId === item.id);
    if (itemLogs.length === 0) return { ...item, daysLeft: 999 };
    
    // Calculate daily usage rate based on log history span
    const sorted = itemLogs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const daysDiff = Math.max(1, Math.ceil((new Date().getTime() - new Date(sorted[0].date).getTime()) / (86400000)));
    const totalUsed = itemLogs.reduce((s, l) => s + l.quantityUsed, 0);
    const dailyRate = totalUsed / daysDiff;
    
    return { ...item, daysLeft: dailyRate > 0 ? Math.floor(item.quantity / dailyRate) : 999 };
  }).filter(i => i.daysLeft < 30).sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="space-y-6">
      {/* Revenue Card */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
         <div>
            <h2 className="text-gray-500 text-sm font-medium flex items-center gap-2 mb-1">
               <Coins size={16} className="text-green-600" /> Total Revenue
            </h2>
            <p className="text-xs text-gray-400">All-time sales</p>
         </div>
         <p className="text-3xl font-bold text-green-700">GHS {totalRevenue.toFixed(2)}</p>
      </div>

      {/* Chart */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Top Consumed Items</h2>
        <div className="h-48 w-full">
          {usageData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageData}>
                <XAxis dataKey="name" fontSize={10} angle={-15} textAnchor="end" height={30}/>
                <YAxis fontSize={10}/>
                <Tooltip cursor={{fill: '#f0fdfa'}} />
                <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                  {usageData.map((e, i) => <Cell key={i} fill={i%2===0 ? '#0d9488' : '#f59e0b'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs">No data yet</div>}
        </div>
      </div>

      {/* Predictions */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <CalendarClock size={20} className="text-orange-500" /> Stock Predictions
        </h2>
        <div className="space-y-3">
          {highRiskItems.length > 0 ? highRiskItems.map(item => (
            <div key={item.id} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm flex justify-between items-center ${item.daysLeft <= 7 ? 'border-red-500' : 'border-yellow-400'}`}>
              <div>
                <h3 className="font-bold text-gray-800">{item.name}</h3>
                <p className="text-xs text-gray-500">{item.quantity} units remaining</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Runs out in</p>
                <p className={`text-xl font-bold ${item.daysLeft <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>
                  {item.daysLeft <= 0 ? 'Today' : `${item.daysLeft} Days`}
                </p>
              </div>
            </div>
          )) : (
            <div className="bg-green-50 p-4 rounded-xl text-center text-green-800 text-sm font-medium">
               ✅ No items running out soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
};