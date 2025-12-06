import React, { useState, useEffect } from 'react';
import { InventoryItem, ItemCategory, User } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Search, Trash2, X, Coins, Syringe } from 'lucide-react';

export const Inventory: React.FC<{ user: User | null }> = ({ user }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState<'ADD'|'EDIT'|'LOG'>('ADD');
  const [selItem, setSelItem] = useState<InventoryItem|null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>({});
  const [qty, setQty] = useState('');

  useEffect(() => setItems(StorageService.getInventory()), []);
  const isAdmin = user?.role === 'Admin';

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'LOG') {
      if(!selItem) return;
      const q = parseInt(qty);
      const updated = { ...selItem, quantity: selItem.quantity - q };
      StorageService.updateItem(updated);
      StorageService.addLog({ id: crypto.randomUUID(), itemId: selItem.id, itemName: selItem.name, quantityUsed: q, date: new Date().toISOString(), saleAmount: selItem.isForSale ? q*(selItem.price||0) : 0 });
    } else if (isAdmin) {
      const newItem = { 
         id: selItem?.id || crypto.randomUUID(), 
         name: form.name!, 
         quantity: Number(form.quantity), 
         minLevel: Number(form.minLevel), 
         batchNumber: form.batchNumber||'N/A',
         expiryDate: form.expiryDate||new Date().toISOString(), 
         category: form.category as ItemCategory, 
         lastUpdated: new Date().toISOString(),
         isForSale: form.isForSale,
         price: Number(form.price)
      };
      selItem ? StorageService.updateItem(newItem) : StorageService.addItem(newItem);
    }
    setModal(false); setItems(StorageService.getInventory());
  };

  const del = () => { if(selItem && isAdmin) { StorageService.deleteItem(selItem.id); setModal(false); setItems(StorageService.getInventory()); } };

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-bold">Inventory</h2>
         {isAdmin && <button onClick={()=>{setMode('ADD');setForm({category:ItemCategory.ESSENTIAL});setModal(true)}} className="bg-primary text-white p-2 rounded-full"><Plus/></button>}
      </div>
      <div className="space-y-2">
        {items.map(i => (
           <div key={i.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between">
              <div>
                 <div className="font-bold">{i.name}</div>
                 <div className="text-xs text-gray-500">{i.quantity} units • {i.batchNumber}</div>
                 {i.isForSale && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">GHS {i.price}</span>}
              </div>
              <div className="flex gap-2">
                 <button onClick={()=>{setMode('LOG');setSelItem(i);setQty('');setModal(true)}} className="bg-blue-50 text-blue-600 px-3 rounded-lg text-xs font-bold">Log</button>
                 {isAdmin && <button onClick={()=>{setMode('EDIT');setSelItem(i);setForm(i);setModal(true)}} className="bg-gray-100 px-3 rounded-lg text-xs">Edit</button>}
              </div>
           </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
           <form onSubmit={save} className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-lg">{mode}</h3>
              {mode === 'LOG' ? (
                 <input type="number" placeholder="Qty Used/Sold" value={qty} onChange={e=>setQty(e.target.value)} className="w-full p-2 border rounded" required />
              ) : (
                 <>
                   <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full p-2 border rounded" required />
                   <div className="flex gap-2">
                     <input type="number" placeholder="Qty" value={form.quantity} onChange={e=>setForm({...form,quantity:parseInt(e.target.value)})} className="w-full p-2 border rounded" required />
                     <input type="number" placeholder="Min" value={form.minLevel} onChange={e=>setForm({...form,minLevel:parseInt(e.target.value)})} className="w-full p-2 border rounded" required />
                   </div>
                   <div className="flex gap-2 items-center">
                      <input type="checkbox" checked={form.isForSale} onChange={e=>setForm({...form,isForSale:e.target.checked})} /> <label>For Sale?</label>
                      {form.isForSale && <input type="number" placeholder="Price" value={form.price} onChange={e=>setForm({...form,price:parseFloat(e.target.value)})} className="w-full p-2 border rounded" />}
                   </div>
                   {mode==='EDIT' && <button type="button" onClick={del} className="w-full text-red-500 py-2">Delete Item</button>}
                 </>
              )}
              <button className="w-full bg-primary text-white py-3 rounded-xl font-bold">Save</button>
              <button type="button" onClick={()=>setModal(false)} className="w-full py-2 text-gray-400">Cancel</button>
           </form>
        </div>
      )}
    </div>
  );
};