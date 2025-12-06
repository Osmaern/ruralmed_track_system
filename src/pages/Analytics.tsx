import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  
  useEffect(() => {
    const logs = StorageService.getLogs();
    const agg: Record<string, number> = {};
    logs.forEach(l => { agg[l.itemName] = (agg[l.itemName] || 0) + l.quantityUsed; });
    setData(Object.entries(agg).map(([name, usage]) => ({ name, usage })).sort((a,b)=>b.usage-a.usage).slice(0,5));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow border">
         <h3 className="font-bold mb-4">Top Consumed Items</h3>
         <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data}><XAxis dataKey="name" fontSize={10}/><YAxis/><Tooltip/><Bar dataKey="usage" fill="#0d9488" /></BarChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};