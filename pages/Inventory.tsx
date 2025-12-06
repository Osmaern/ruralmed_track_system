import React, { useState, useEffect } from 'react';
import { InventoryItem, ItemCategory, User } from '../types';
import { StorageService } from '../services/storageService';
import { Plus, Search, AlertTriangle, Syringe, X, ArrowUpDown, Trash2, Filter, Tag, Coins } from 'lucide-react';

type SortOption = 'EXPIRY' | 'NAME' | 'QUANTITY' | 'STATUS';
type ModalMode = 'ADD' | 'EDIT' | 'CONSUME';

export const Inventory: React.FC<{ user: User | null }> = ({ user }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('STATUS');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('ADD');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Animation State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    category: ItemCategory.ESSENTIAL,
    isForSale: false,
    price: 0
  });
  const [consumeQty, setConsumeQty] = useState<string>('');

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    setItems(StorageService.getInventory());
  };

  const triggerHighlight = (id: string) => {
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === 'CONSUME') {
      if (!editingItem) return;
      const qty = parseInt(consumeQty);
      if (isNaN(qty) || qty <= 0 || qty > editingItem.quantity) {
        alert("Invalid quantity.");
        return;
      }
      
      const updated = { ...editingItem, quantity: editingItem.quantity - qty, lastUpdated: new Date().toISOString() };
      StorageService.updateItem(updated);

      // Calculate Revenue if item is for sale
      const saleAmount = editingItem.isForSale ? (editingItem.price || 0) * qty : 0;

      StorageService.addLog({
        id: crypto.randomUUID(),
        itemId: editingItem.id,
        itemName: editingItem.name,
        quantityUsed: qty,
        date: new Date().toISOString(),
        saleAmount // Save the revenue generated
      });
      
      triggerHighlight(editingItem.id);
      closeModal();
      loadItems();
      return;
    }

    if (!isAdmin) return;

    if (!formData.name || formData.quantity === undefined) return;

    const newItem: InventoryItem = {
      id: editingItem ? editingItem.id : crypto.randomUUID(),
      name: formData.name,
      quantity: Number(formData.quantity),
      minLevel: Number(formData.minLevel) || 10,
      batchNumber: formData.batchNumber || 'N/A',
      expiryDate: formData.expiryDate || new Date(Date.now() + 86400000 * 30).toISOString(),
      category: formData.category || ItemCategory.ESSENTIAL,
      lastUpdated: new Date().toISOString(),
      isForSale: formData.isForSale || false,
      price: formData.isForSale ? Number(formData.price) : 0
    };

    if (editingItem) {
      StorageService.updateItem(newItem);
      triggerHighlight(newItem.id);
    } else {
      StorageService.addItem(newItem);
      triggerHighlight(newItem.id);
    }

    closeModal();
    loadItems();
  };

  const handleDelete = () => {
    if (!isAdmin) return;
    if (editingItem && confirm(`Are you sure you want to delete ${editingItem.name}? This cannot be undone.`)) {
      const id = editingItem.id;
      setDeletingId(id);
      closeModal();
      
      // Delay actual deletion to allow fade-out animation to play
      setTimeout(() => {
        StorageService.deleteItem(id);
        setDeletingId(null);
        loadItems();
      }, 400);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setConsumeQty('');
    setFormData({ category: ItemCategory.ESSENTIAL, isForSale: false, price: 0 });
  };

  const openAdd = () => {
    if (!isAdmin) return;
    setModalMode('ADD');
    setEditingItem(null);
    setFormData({ category: ItemCategory.ESSENTIAL, quantity: 0, minLevel: 10, isForSale: false, price: 0 });
    setShowModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    if (!isAdmin) return;
    setModalMode('EDIT');
    setEditingItem(item);
    setFormData({
      ...item,
      expiryDate: item.expiryDate.split('T')[0]
    });
    setShowModal(true);
  };

  const openConsume = (item: InventoryItem) => {
    setModalMode('CONSUME');
    setEditingItem(item);
    setConsumeQty('');
    setShowModal(true);
  };

  const getSortedItems = () => {
    let sorted = [...items];
    switch (sortBy) {
      case 'NAME':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'QUANTITY':
        return sorted.sort((a, b) => a.quantity - b.quantity);
      case 'EXPIRY':
        return sorted.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      case 'STATUS':
      default:
        // Critical > Expired > Low Stock > OK
        return sorted.sort((a, b) => {
          const aExp = new Date(a.expiryDate) < new Date() ? 3 : 0;
          const bExp = new Date(b.expiryDate) < new Date() ? 3 : 0;
          const aCrit = a.category === ItemCategory.CRITICAL ? 1 : 0;
          const bCrit = b.category === ItemCategory.CRITICAL ? 1 : 0;
          const aLow = a.quantity <= a.minLevel ? 2 : 0;
          const bLow = b.quantity <= b.minLevel ? 2 : 0;
          
          const aScore = aExp + aLow + aCrit;
          const bScore = bExp + bLow + bCrit;
          return bScore - aScore; 
        });
    }
  };

  const filteredItems = getSortedItems().filter(i => 
    (i.name.toLowerCase().includes(filter.toLowerCase()) || 
    i.batchNumber.toLowerCase().includes(filter.toLowerCase())) &&
    (categoryFilter === 'ALL' || i.category === categoryFilter)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Search & Filter Bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search name or batch..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="relative group">
           <button className="h-full px-3 bg-white border border-gray-200 rounded-lg text-gray-600 flex items-center gap-1">
             <ArrowUpDown size={18} />
           </button>
           <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-100 shadow-lg rounded-lg hidden group-hover:block z-10">
              <div 
                className={`px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer ${sortBy === 'STATUS' ? 'font-bold text-primary' : ''}`}
                onClick={() => setSortBy('STATUS')}
              >Urgency</div>
              <div 
                className={`px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer ${sortBy === 'NAME' ? 'font-bold text-primary' : ''}`}
                onClick={() => setSortBy('NAME')}
              >Name (A-Z)</div>
              <div 
                className={`px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer ${sortBy === 'QUANTITY' ? 'font-bold text-primary' : ''}`}
                onClick={() => setSortBy('QUANTITY')}
              >Quantity (Low-High)</div>
           </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
        <button 
          onClick={() => setCategoryFilter('ALL')} 
          className={`whitespace-nowrap px-3 py-1 text-xs rounded-full border transition-colors ${categoryFilter === 'ALL' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}
        >
          All Items
        </button>
        {Object.values(ItemCategory).map(cat => (
          <button 
            key={cat}
            onClick={() => setCategoryFilter(cat)} 
            className={`whitespace-nowrap px-3 py-1 text-xs rounded-full border transition-colors ${categoryFilter === cat ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3 pb-20">
        {filteredItems.map(item => {
           const isLow = item.quantity <= item.minLevel;
           const isExpired = new Date(item.expiryDate) < new Date();
           const isCritical = item.category === ItemCategory.CRITICAL;
           const isDeleting = deletingId === item.id;
           const isHighlighted = highlightedId === item.id;
           
           return (
            <div 
              key={item.id} 
              className={`
                bg-white p-4 rounded-xl shadow-sm border relative group transition-all duration-300
                ${isDeleting ? 'animate-fade-out pointer-events-none' : 'animate-fade-in'}
                ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 bg-teal-50' : ''}
                ${isExpired ? 'border-red-200 bg-red-50/30' : isLow ? 'border-orange-200' : 'border-gray-100'}
              `}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800">{item.name}</h3>
                    {isCritical && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase tracking-wide">
                        Critical
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                    {item.isForSale ? (
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        GHS {item.price?.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded">
                        Not for Sale
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                   <span className={`text-lg font-bold ${isLow ? 'text-orange-600' : 'text-gray-700'}`}>
                    {item.quantity} <span className="text-xs font-normal text-gray-400">units</span>
                   </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                 <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isExpired ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                    {isExpired ? <AlertTriangle size={12} /> : null}
                    Exp: {new Date(item.expiryDate).toLocaleDateString()}
                 </div>
                 
                 <div className="flex gap-2">
                    <button 
                      onClick={() => openConsume(item)}
                      className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center gap-1"
                    >
                      {item.isForSale ? <Coins size={12} /> : <Syringe size={12} />} 
                      {item.isForSale ? 'Sell / Log' : 'Log Use'}
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => openEdit(item)}
                        className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg font-medium border border-gray-200 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                    )}
                 </div>
              </div>
            </div>
           );
        })}
        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-gray-400 flex flex-col items-center animate-fade-in">
            <Filter size={32} className="mb-2 opacity-20" />
            <p>No items found.</p>
            <button onClick={() => {setFilter(''); setCategoryFilter('ALL')}} className="text-primary text-sm mt-2">Clear filters</button>
          </div>
        )}
      </div>

      {/* FAB - Admin Only */}
      {isAdmin && (
        <button 
          onClick={openAdd}
          className="fixed bottom-20 right-4 bg-primary text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:bg-secondary transition-transform active:scale-95 z-10"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Unified Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">
                {modalMode === 'ADD' && 'Add New Stock'}
                {modalMode === 'EDIT' && 'Edit Stock Details'}
                {modalMode === 'CONSUME' && (editingItem?.isForSale ? 'Sell Item' : 'Log Usage')}
              </h2>
              <button onClick={closeModal}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4">
              
              {/* CONSUME MODE */}
              {modalMode === 'CONSUME' && (
                 <div>
                    <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl text-blue-900 mb-6">
                      <div className="bg-blue-200 p-2 rounded-lg">
                        {editingItem?.isForSale ? <Coins size={24} className="text-blue-700" /> : <Syringe size={24} className="text-blue-700" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase opacity-70">Item</p>
                        <p className="font-bold">{editingItem?.name}</p>
                        <p className="text-xs">Available: {editingItem?.quantity}</p>
                      </div>
                    </div>

                    <label className="block text-sm font-medium text-gray-700 mb-1 text-center">How many units?</label>
                    <input 
                      type="number"
                      required
                      autoFocus
                      min="1"
                      max={editingItem?.quantity}
                      className="w-full p-4 border-2 border-blue-100 focus:border-blue-500 rounded-2xl text-3xl font-bold text-center outline-none text-gray-800 transition-colors" 
                      placeholder="0"
                      value={consumeQty}
                      onChange={e => setConsumeQty(e.target.value)}
                    />

                    {editingItem?.isForSale && (
                       <div className="mt-4 bg-green-50 p-3 rounded-xl border border-green-100 text-center animate-fade-in">
                          <p className="text-xs text-gray-500 mb-1">Selling Price Calculation</p>
                          <div className="flex justify-center items-baseline gap-2">
                            <span className="text-sm text-gray-600">{consumeQty || '0'} x GHS {editingItem.price?.toFixed(2)} =</span>
                            <span className="text-xl font-bold text-green-700">
                              GHS {((parseInt(consumeQty) || 0) * (editingItem.price || 0)).toFixed(2)}
                            </span>
                          </div>
                       </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold mt-6 shadow-lg shadow-blue-200 transition-transform active:scale-95">
                      Confirm {editingItem?.isForSale ? 'Sale' : 'Usage'}
                    </button>
                 </div>
              )}

              {/* ADD / EDIT MODE */}
              {modalMode !== 'CONSUME' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <input 
                      required
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow" 
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Paracetamol"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input 
                          type="number"
                          required
                          className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow" 
                          value={formData.quantity}
                          onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                        />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Alert Level</label>
                        <input 
                          type="number"
                          className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow" 
                          value={formData.minLevel}
                          onChange={e => setFormData({...formData, minLevel: parseInt(e.target.value)})}
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select 
                      className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as ItemCategory})}
                    >
                      {Object.values(ItemCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                       <input 
                         type="checkbox" 
                         id="isForSale"
                         checked={formData.isForSale || false}
                         onChange={e => setFormData({...formData, isForSale: e.target.checked})}
                         className="w-4 h-4 text-primary rounded focus:ring-primary"
                       />
                       <label htmlFor="isForSale" className="text-sm font-bold text-gray-800 flex items-center gap-1">
                         <Coins size={14} /> Sell to Patients?
                       </label>
                    </div>
                    
                    {formData.isForSale && (
                      <div className="animate-fade-in">
                        <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Unit Price (GHS)</label>
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          value={formData.price || ''}
                          onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch #</label>
                        <input 
                          className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow" 
                          value={formData.batchNumber || ''}
                          onChange={e => setFormData({...formData, batchNumber: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input 
                          type="date"
                          className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow" 
                          value={formData.expiryDate ? formData.expiryDate.split('T')[0] : ''}
                          onChange={e => setFormData({...formData, expiryDate: new Date(e.target.value).toISOString()})}
                        />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-primary hover:bg-secondary text-white py-3.5 rounded-xl font-bold mt-4 shadow-lg shadow-teal-100 transition-transform active:scale-95">
                    Save Details
                  </button>

                  {modalMode === 'EDIT' && (
                    <button 
                      type="button"
                      onClick={handleDelete}
                      className="w-full bg-white text-red-600 border border-red-100 py-3 rounded-xl font-medium mt-2 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} /> Delete Item
                    </button>
                  )}
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};