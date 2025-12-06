import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { ConsumptionLog, InventoryItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowRight, Info, AlertTriangle, CalendarClock, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Analytics: React.FC = () => {
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    setLogs(StorageService.getLogs());
    setItems(StorageService.getInventory());
  }, []);

  // Prepare Chart Data (Usage by Item Name)
  const usageData = logs.reduce((acc: any[], log) => {
    const existing = acc.find(x => x.name === log.itemName);
    if (existing) {
      existing.usage += log.quantityUsed;
    } else {
      acc.push({ name: log.itemName, usage: log.quantityUsed });
    }
    return acc;
  }, []).sort((a, b) => b.usage - a.usage).slice(0, 10); // Top 10 items

  // Calculate Total Revenue
  const totalRevenue = logs.reduce((sum, log) => sum + (log.saleAmount || 0), 0);

  // Enhanced Forecasting Logic
  const getForecast = (item: InventoryItem) => {
    const itemLogs = logs.filter(l => l.itemId === item.id);
    if (itemLogs.length === 0) return { dailyRate: 0, daysLeft: 999 };

    // Sort logs by date
    itemLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalUsed = itemLogs.reduce((sum, log) => sum + log.quantityUsed, 0);
    
    // Calculate span in days
    const firstDate = new Date(itemLogs[0].date);
    const lastDate = new Date();
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Effective days is at least 1 to avoid division by zero
    const effectiveDays = Math.max(diffDays, 1);
    
    const dailyRate = totalUsed / effectiveDays;
    
    if (dailyRate === 0) return { dailyRate: 0, daysLeft: 999 };
    
    const daysLeft = Math.floor(item.quantity / dailyRate);
    return { dailyRate, daysLeft };
  };

  const highRiskItems = items.map(item => {
    const { dailyRate, daysLeft } = getForecast(item);
    return { ...item, dailyRate, daysLeft };
  }).filter(i => i.daysLeft < 30 && i.dailyRate > 0).sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="space-y-6">
      
      {/* Revenue Card */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
         <div>
            <h2 className="text-gray-500 text-sm font-medium flex items-center gap-2 mb-1">
               <Coins size={16} className="text-green-600" /> Total Revenue
            </h2>
            <p className="text-xs text-gray-400">Generated from sold inventory</p>
         </div>
         <p className="text-3xl font-bold text-green-700">GHS {totalRevenue.toFixed(2)}</p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center">
          <span>Top Consumption</span>
          <span className="text-xs font-normal text-gray-400 bg-gray-50 px-2 py-1 rounded">All Time</span>
        </h2>
        <div className="h-48 w-full">
          {usageData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageData} margin={{bottom: 20}}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis fontSize={10} tickLine={false} />
                <Tooltip cursor={{fill: '#f0fdfa'}} />
                <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                  {usageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0d9488' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
               <Info size={24} className="mb-2 opacity-50" />
               <p className="text-xs font-medium">No consumption data yet.</p>
               <Link to="/inventory" className="text-[10px] mt-2 text-primary font-bold hover:underline">Log usage in Inventory</Link>
             </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <CalendarClock size={20} className="text-orange-500" />
          Stock-out Prediction
        </h2>
        <div className="space-y-3">
          {highRiskItems.length > 0 ? highRiskItems.map(item => (
            <div key={item.id} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm flex justify-between items-center ${item.daysLeft <= 7 ? 'border-red-500' : 'border-yellow-400'}`}>
              <div>
                <h3 className="font-bold text-gray-800">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {item.quantity} units <br/>
                  Avg Use: <span className="font-medium">{item.dailyRate.toFixed(1)} / day</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Runs out in</p>
                <p className={`text-xl font-bold ${item.daysLeft <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>
                  {item.daysLeft <= 0 ? 'Today' : `${item.daysLeft} Days`}
                </p>
              </div>
            </div>
          )) : (
            <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center">
              <p className="font-bold text-green-800 mb-1">No Immediate Risks</p>
              <p className="text-xs text-green-700 opacity-80">
                {logs.length === 0 
                  ? "Start logging usage to see stock-out predictions." 
                  : "Based on current usage trends, no items are expected to run out in the next 30 days."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};