import React, { useState } from 'react';
import { StorageService } from '../services/storageService';
import { User, RegisteredUser } from '../types';

export const Login: React.FC<{onLogin:(u:User)=>void}> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN'|'REGISTER'|'RECOVERY'>('LOGIN');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  // Register State
  const [reg, setReg] = useState<{
    username: string;
    pin: string;
    role: 'Staff' | 'Admin';
    phone: string;
    email: string;
  }>({username:'', pin:'', role:'Staff', phone:'', email:''});
  
  // Recovery
  const [recContact, setRecContact] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [recStage, setRecStage] = useState(0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = StorageService.login(username, pin);
    u ? onLogin(u) : setError('Invalid credentials');
  };

  const handleReg = (e: React.FormEvent) => {
    e.preventDefault();
    const u: RegisteredUser = { id: crypto.randomUUID(), ...reg };
    if(StorageService.registerUser(u)) { setMode('LOGIN'); alert('Registered!'); } else setError('Username taken');
  };

  const handleRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if(recStage===0) {
       if(StorageService.findUserByContact(recContact)) { await StorageService.requestPasswordResetOtp(recContact); setRecStage(1); }
       else setError('User not found');
    } else {
       const u = StorageService.findUserByContact(recContact);
       if(u) { StorageService.resetUserPin(u.id, newPin); setMode('LOGIN'); alert('PIN Reset!'); }
    }
  };

  return (
    <div className="min-h-screen bg-teal-700 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">{mode}</h1>
        {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}
        
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input className="w-full p-3 border rounded-xl" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
            <input className="w-full p-3 border rounded-xl" type="password" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)} required />
            <button className="w-full bg-teal-600 text-white p-3 rounded-xl font-bold">Login</button>
            <div className="flex justify-between text-sm text-teal-600 font-bold">
               <button type="button" onClick={()=>setMode('REGISTER')}>Register</button>
               <button type="button" onClick={()=>setMode('RECOVERY')}>Forgot PIN?</button>
            </div>
          </form>
        )}

        {mode === 'REGISTER' && (
          <form onSubmit={handleReg} className="space-y-3">
             <input className="w-full p-2 border rounded" placeholder="Username" value={reg.username} onChange={e=>setReg({...reg, username:e.target.value})} required />
             <input className="w-full p-2 border rounded" placeholder="Phone" value={reg.phone} onChange={e=>setReg({...reg, phone:e.target.value})} required />
             <input className="w-full p-2 border rounded" placeholder="Email" value={reg.email} onChange={e=>setReg({...reg, email:e.target.value})} required />
             <input className="w-full p-2 border rounded" type="password" placeholder="PIN" value={reg.pin} onChange={e=>setReg({...reg, pin:e.target.value})} required />
             <div className="flex gap-2">
                <button type="button" onClick={()=>setReg({...reg, role:'Staff'})} className={`flex-1 p-2 rounded border ${reg.role==='Staff'?'bg-teal-600 text-white':''}`}>Staff</button>
                <button type="button" onClick={()=>setReg({...reg, role:'Admin'})} className={`flex-1 p-2 rounded border ${reg.role==='Admin'?'bg-teal-600 text-white':''}`}>Admin</button>
             </div>
             <button className="w-full bg-teal-600 text-white p-3 rounded-xl font-bold">Create Account</button>
             <button type="button" onClick={()=>setMode('LOGIN')} className="w-full text-gray-500 text-sm">Cancel</button>
          </form>
        )}

        {mode === 'RECOVERY' && (
           <form onSubmit={handleRec} className="space-y-4">
             {recStage===0 ? (
               <input className="w-full p-3 border rounded-xl" placeholder="Phone or Email" value={recContact} onChange={e=>setRecContact(e.target.value)} required />
             ) : (
               <>
                 <input className="w-full p-3 border rounded-xl" placeholder="OTP (Check Console)" value={otp} onChange={e=>setOtp(e.target.value)} required />
                 <input className="w-full p-3 border rounded-xl" placeholder="New PIN" value={newPin} onChange={e=>setNewPin(e.target.value)} required />
               </>
             )}
             <button className="w-full bg-teal-600 text-white p-3 rounded-xl font-bold">{recStage===0?'Send Code':'Reset PIN'}</button>
             <button type="button" onClick={()=>setMode('LOGIN')} className="w-full text-gray-500 text-sm">Cancel</button>
           </form>
        )}
      </div>
    </div>
  );
};