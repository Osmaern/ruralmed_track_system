import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storageService';
import { ConsumptionLog } from '../types';
import { Coins, Download } from 'lucide-react';

export const SalesLog: React.FC = () => {
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  
  useEffect(() => {
    setLogs(StorageService.getLogs().filter(l => (l.saleAmount||0) > 0));
  }, []);

  const exportCsv = () => {
    const csv = ["Date,Item,Qty,Revenue", ...logs.map(l => `${l.date},${l.itemName},${l.quantityUsed},${l.saleAmount}`)].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
    link.download = "sales.csv";
    link.click();
  };

  const total = logs.reduce((sum, l) => sum + (l.saleAmount||0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end bg-green-50 p-4 rounded-xl border border-green-100">
         <div><h1 className="font-bold flex gap-2"><Coins/> Sales Log</h1></div>
         <div className="text-right"><p className="text-xs text-gray-500">Total Revenue</p><p className="text-2xl font-bold text-green-700">GHS {total.toFixed(2)}</p></div>
      </div>
      <button onClick={exportCsv} className="w-full bg-gray-800 text-white p-2 rounded-lg flex justify-center gap-2 text-sm"><Download size={16}/> Export CSV</button>
      <div className="space-y-2">
         {logs.map(l => (
            <div key={l.id} className="bg-white p-3 rounded-lg border shadow-sm flex justify-between">
               <div><div className="font-bold">{l.itemName}</div><div className="text-xs text-gray-500">{new Date(l.date).toLocaleDateString()} • {l.quantityUsed} units</div></div>
               <div className="font-bold text-green-700">GHS {l.saleAmount?.toFixed(2)}</div>
            </div>
         ))}
      </div>
    </div>
  );
};