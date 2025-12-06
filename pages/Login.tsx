import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { User, RegisteredUser } from '../types';
import { Lock, ChevronRight, UserPlus, KeyRound, ArrowLeft, Mail, Phone, UserCircle, MessageSquare, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

type Mode = 'LOGIN' | 'REGISTER' | 'RECOVERY';
type RecoveryStage = 'CONTACT' | 'OTP_RESET';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<Mode>('LOGIN');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login State
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Register State
  const [regData, setRegData] = useState({
    username: '',
    pin: '',
    role: 'Staff' as 'Admin' | 'Staff',
    phone: '',
    email: ''
  });

  // Recovery State
  const [recoveryStage, setRecoveryStage] = useState<RecoveryStage>('CONTACT');
  const [recoveryContact, setRecoveryContact] = useState('');
  const [recoveringUser, setRecoveringUser] = useState<RegisteredUser | null>(null);
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = StorageService.login(username, pin);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or PIN.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (regData.pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }

    const newUser: RegisteredUser = {
      id: crypto.randomUUID(),
      username: regData.username,
      pin: regData.pin,
      role: regData.role,
      phone: regData.phone,
      email: regData.email
    };

    const success = StorageService.registerUser(newUser);
    if (success) {
      setSuccessMsg("Account created! You can now login.");
      setMode('LOGIN');
      setUsername(regData.username);
      setPin('');
    } else {
      setError("Username already taken.");
    }
  };

  const handleRecoveryContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Small delay to check user existence
      const user = StorageService.findUserByContact(recoveryContact);
      
      if (user) {
        setRecoveringUser(user);
        
        // Request "Real" SMS (Simulated network call)
        await StorageService.requestPasswordResetOtp(recoveryContact);
        
        setRecoveryStage('OTP_RESET');
        setSuccessMsg(`OTP Code sent to ${recoveryContact}. Check your messages.`);
      } else {
        setError("No account found with that email or phone number.");
      }
    } catch (e) {
      setError("Failed to send SMS. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryReset = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verify OTP using service logic
    const isValid = StorageService.verifyPasswordResetOtp(recoveryContact, otp);
    
    if (!isValid) {
      setError("Invalid or Expired OTP Code.");
      return;
    }

    if (recoveringUser) {
      StorageService.resetUserPin(recoveringUser.id, newPin);
      setSuccessMsg("PIN reset successfully! Please login.");
      setMode('LOGIN');
      setRecoveryStage('CONTACT');
      setRecoveringUser(null);
      setOtp('');
      setNewPin('');
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setSuccessMsg('');
    setLoading(false);
    // Clear sensitive fields
    setPin('');
    setOtp('');
    setNewPin('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4 relative overflow-hidden">
      
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative z-10">
        
        {/* Header Section */}
        <div className="bg-teal-50 p-6 text-center border-b border-teal-100">
          <div className="inline-flex p-3 bg-white rounded-full shadow-sm mb-3">
             <div className="bg-teal-600 text-white p-2 rounded-lg">
                <Lock size={24} />
             </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {mode === 'LOGIN' && 'Welcome Back'}
            {mode === 'REGISTER' && 'Create Account'}
            {mode === 'RECOVERY' && 'Reset PIN'}
          </h1>
          <p className="text-gray-500 text-sm">RuralMed Inventory System</p>
        </div>

        {/* --- LOGIN MODE --- */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {successMsg && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm text-center font-medium border border-green-200">{successMsg}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                placeholder="Enter username"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 ml-1">
                <label className="block text-sm font-medium text-gray-700">Access PIN</label>
                <button type="button" onClick={() => switchMode('RECOVERY')} className="text-xs text-teal-600 font-bold hover:underline">Forgot PIN?</button>
              </div>
              <input
                type="password"
                inputMode="numeric"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center text-3xl font-bold tracking-widest p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                placeholder="••••"
              />
            </div>

            {error && <p className="text-red-500 text-xs text-center font-medium animate-pulse">{error}</p>}

            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-200 flex items-center justify-center gap-2 transition-transform active:scale-95">
              Login <ChevronRight size={20} />
            </button>

            <button type="button" onClick={() => switchMode('REGISTER')} className="w-full py-2 text-teal-600 text-sm font-bold flex items-center justify-center gap-1 hover:bg-teal-50 rounded-lg transition-colors">
              <UserPlus size={16} /> New User? Register
            </button>
          </form>
        )}

        {/* --- REGISTER MODE --- */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} className="p-8 space-y-4">
            <div className="flex gap-2 mb-2">
               {['Staff', 'Admin'].map((r) => (
                 <button
                   key={r}
                   type="button"
                   onClick={() => setRegData({...regData, role: r as any})}
                   className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${regData.role === r ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-200'}`}
                 >
                   {r}
                 </button>
               ))}
            </div>

            <input
              type="text"
              required
              placeholder="Choose Username"
              value={regData.username}
              onChange={e => setRegData({...regData, username: e.target.value})}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                required
                placeholder="Email Address"
                value={regData.email}
                onChange={e => setRegData({...regData, email: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
               <input
                type="tel"
                required
                placeholder="Phone Number"
                value={regData.phone}
                onChange={e => setRegData({...regData, phone: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>

            <input
              type="password"
              inputMode="numeric"
              required
              placeholder="Create PIN (4+ digits)"
              value={regData.pin}
              onChange={e => setRegData({...regData, pin: e.target.value})}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none"
            />

            {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-200">
              Create Account
            </button>
             <button type="button" onClick={() => switchMode('LOGIN')} className="w-full py-2 text-gray-400 text-sm font-medium hover:text-gray-600">
              Cancel
            </button>
          </form>
        )}

        {/* --- RECOVERY MODE --- */}
        {mode === 'RECOVERY' && (
          <div className="p-8 space-y-5">
            {recoveryStage === 'CONTACT' ? (
              <form onSubmit={handleRecoveryContactSubmit} className="space-y-4">
                 <p className="text-sm text-gray-500 text-center">Enter your registered email or phone number to receive a secure reset code.</p>
                 <div className="relative">
                   <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                   <input
                      type="text"
                      required
                      placeholder="Email or Phone"
                      value={recoveryContact}
                      onChange={e => setRecoveryContact(e.target.value)}
                      className="w-full pl-10 p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none"
                   />
                 </div>
                 {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
                 
                 <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Sending SMS...' : 'Send Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRecoveryReset} className="space-y-4">
                 <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs flex gap-2 items-center">
                    <UserCircle size={16} />
                    <span>Resetting PIN for <strong>{recoveringUser?.username}</strong></span>
                 </div>
                 {successMsg && <p className="text-xs text-green-600 font-bold text-center">{successMsg}</p>}
                 
                 <div className="space-y-1">
                   <label className="text-xs text-gray-500 ml-1">SMS Verification Code</label>
                   <input
                      type="text"
                      required
                      placeholder="6-digit Code"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-center font-mono tracking-widest text-lg"
                   />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-xs text-gray-500 ml-1">New PIN</label>
                   <input
                      type="password"
                      inputMode="numeric"
                      required
                      placeholder="New PIN"
                      value={newPin}
                      onChange={e => setNewPin(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-center"
                   />
                 </div>
                 
                 {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
                 <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold">Set New PIN</button>
              </form>
            )}
             <button type="button" onClick={() => switchMode('LOGIN')} className="w-full py-2 flex items-center justify-center gap-1 text-gray-400 text-sm font-medium hover:text-gray-600 mt-2">
              <ArrowLeft size={16} /> Back to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
};