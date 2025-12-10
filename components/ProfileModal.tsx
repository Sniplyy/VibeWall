
import React, { useState } from 'react';
import { User, X, Key, CreditCard, LogOut, Smartphone, Mail, Globe, Apple, Chrome } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  setUserName: (name: string) => void;
  apiKeyReady: boolean;
  onManageApiKey: () => void;
  isLoggedIn: boolean;
  onLogin: (provider: string) => void;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userName,
  setUserName,
  apiKeyReady,
  onManageApiKey,
  isLoggedIn,
  onLogin,
  onLogout
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(userName);

  if (!isOpen) return null;

  const handleSaveName = () => {
      if (tempName.trim()) {
          setUserName(tempName);
      }
      setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Banner */}
        <div className={`relative h-24 ${isLoggedIn ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-slate-800'}`}>
             <button 
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white/80 hover:text-white transition-colors z-10"
             >
                <X size={18} />
             </button>
             
             {!isLoggedIn && (
                 <div className="absolute inset-0 flex items-center justify-center">
                     <h2 className="text-xl font-bold text-white">Sign in to VibeWall</h2>
                 </div>
             )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 -mt-10 relative">
            
            {isLoggedIn ? (
                <>
                    {/* Avatar */}
                    <div className="relative inline-block">
                        <div className="w-20 h-20 rounded-full bg-slate-900 p-1.5">
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white shadow-inner">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="mt-3 mb-6">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 w-full"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                />
                                <button 
                                    onClick={handleSaveName}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between group">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{userName}</h2>
                                    <p className="text-indigo-400 text-xs font-medium">Premium Plan</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setTempName(userName);
                                        setIsEditing(true);
                                    }}
                                    className="p-2 text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all bg-slate-800/50 rounded-lg hover:bg-slate-800"
                                    title="Edit Name"
                                >
                                    <User size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Settings List */}
                    <div className="space-y-3">
                        {/* API Key */}
                        <button 
                            onClick={onManageApiKey}
                            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400 group-hover:text-indigo-400 transition-colors">
                                    <Key size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-slate-200">API Key</div>
                                    <div className={`text-[10px] ${apiKeyReady ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {apiKeyReady ? 'Connected' : 'Action Required'}
                                    </div>
                                </div>
                            </div>
                            <div className="px-2 py-1 bg-slate-700/50 rounded text-[10px] font-medium text-slate-400 group-hover:text-white transition-colors">
                                Manage
                            </div>
                        </button>

                        {/* Subscription (Disabled Mock) */}
                        <div className="w-full flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-lg text-indigo-400">
                                    <CreditCard size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-slate-400">Subscription</div>
                                    <div className="text-[10px] text-indigo-400">Active - Premium</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Logout */}
                    <button 
                        onClick={onLogout}
                        className="w-full mt-6 flex items-center justify-center gap-2 p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </>
            ) : (
                <div className="mt-4 space-y-3">
                    <p className="text-sm text-slate-400 text-center mb-6">
                        Sign in to generate unlimited wallpapers and save your collection.
                    </p>

                    <button 
                        onClick={() => onLogin('google')}
                        className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors text-sm font-medium text-white"
                    >
                         <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-500">G</span>
                         </div>
                         Continue with Google
                    </button>

                    <button 
                        onClick={() => onLogin('apple')}
                        className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors text-sm font-medium text-white"
                    >
                         <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-black">
                             <Apple size={14} fill="currentColor" />
                         </div>
                         Continue with Apple
                    </button>

                     <button 
                        onClick={() => onLogin('microsoft')}
                        className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors text-sm font-medium text-white"
                    >
                         <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-orange-600">
                             <div className="grid grid-cols-2 gap-0.5 w-3 h-3">
                                 <div className="bg-red-500"></div><div className="bg-green-500"></div>
                                 <div className="bg-blue-500"></div><div className="bg-yellow-500"></div>
                             </div>
                         </div>
                         Continue with Microsoft
                    </button>

                    <button 
                        onClick={() => onLogin('phone')}
                        className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors text-sm font-medium text-white"
                    >
                         <div className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center text-white">
                             <Smartphone size={12} />
                         </div>
                         Continue with Phone
                    </button>
                </div>
            )}
            
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
