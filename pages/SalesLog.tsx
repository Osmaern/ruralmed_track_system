import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ConsumptionLog } from '../types';
import { Search, Calendar, Coins, Tag, ArrowUp, ArrowDown } from 'lucide-react';

type SortOption = 'DATE' | 'AMOUNT' | 'NAME';
type SortOrder = 'ASC' | 'DESC';

export const SalesLog: React.FC = () => {
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('DATE');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // Only get logs that have a positive sale amount
    const allLogs = StorageService.getLogs();
    const sales = allLogs.filter(log => (log.saleAmount || 0) > 0);
    setLogs(sales);
  }, []);

  const handleSort = (option: SortOption) => {
    if (sortOption === option) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortOption(option);
      // Default sort orders: Name -> A-Z, Others -> Descending (Newest/Highest)
      setSortOrder(option === 'NAME' ? 'ASC' : 'DESC');
    }
  };

  const getSortedLogs = () => {
    return [...logs].sort((a, b) => {
      let result = 0;
      switch (sortOption) {
        case 'DATE':
          result = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'AMOUNT':
          result = (a.saleAmount || 0) - (b.saleAmount || 0);
          break;
        case 'NAME':
          result = a.itemName.localeCompare(b.itemName);
          break;
      }
      return sortOrder === 'ASC' ? result : -result;
    });
  };

  const filteredLogs = getSortedLogs().filter(log => 
    log.itemName.toLowerCase().includes(filter.toLowerCase())
  );

  const totalRevenue = filteredLogs.reduce((sum, log) => sum + (log.saleAmount || 0), 0);

  const SortIcon = ({ active, order }: { active: boolean, order: SortOrder }) => {
    if (!active) return null;
    return order === 'ASC' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-end bg-gradient-to-r from-green-50 to-white p-4 rounded-xl border border-green-100">
        <div>
           <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <Coins className="text-green-600" /> Sales Log
           </h1>
           <p className="text-xs text-gray-500 mt-1">Track clinic revenue</p>
        </div>
        <div className="text-right">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Revenue</p>
           <p className="text-2xl font-bold text-green-700">GHS {totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search sold items..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Sort Buttons */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
           <button 
             onClick={() => handleSort('DATE')}
             className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap active:scale-95 ${sortOption === 'DATE' ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200' : 'bg-white text-gray-600 border-gray-200'}`}
           >
             <Calendar size={14} /> 
             Date 
             <SortIcon active={sortOption === 'DATE'} order={sortOrder} />
           </button>
           
           <button 
             onClick={() => handleSort('AMOUNT')}
             className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap active:scale-95 ${sortOption === 'AMOUNT' ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200' : 'bg-white text-gray-600 border-gray-200'}`}
           >
             <Coins size={14} /> 
             Amount 
             <SortIcon active={sortOption === 'AMOUNT'} order={sortOrder} />
           </button>
           
           <button 
             onClick={() => handleSort('NAME')}
             className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap active:scale-95 ${sortOption === 'NAME' ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200' : 'bg-white text-gray-600 border-gray-200'}`}
           >
             <Tag size={14} /> 
             Item Name 
             <SortIcon active={sortOption === 'NAME'} order={sortOrder} />
           </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 pb-20">
        {filteredLogs.map(log => (
          <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center animate-fade-in hover:shadow-md transition-shadow">
             <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-800">{log.itemName}</h3>
                  <span className="text-xs font-medium text-gray-400">{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                     <Calendar size={10} /> {new Date(log.date).toLocaleDateString()}
                   </span>
                   <span className="text-[10px] text-gray-500">
                     • {log.quantityUsed} units sold
                   </span>
                </div>
             </div>
             <div className="text-right pl-4">
                <span className="block font-bold text-green-700 text-lg">GHS {(log.saleAmount || 0).toFixed(2)}</span>
             </div>
          </div>
        ))}
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Coins size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No sales records found.</p>
            {filter && <button onClick={() => setFilter('')} className="text-green-600 text-xs font-bold mt-2">Clear Search</button>}
          </div>
        )}
      </div>
    </div>
  );
};