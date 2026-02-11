import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/ui/Button';
import { Tag, Lock, User, Activity } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useStore();
  const [username, setUsername] = useState('Engineer');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Fake authentication delay
    setTimeout(() => {
        login({
            id: 'u1',
            name: username || 'User',
            role: 'Senior Engineer',
            email: 'engineer@pdh2.project'
        }, rememberMe);
        setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden">
        
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[128px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[128px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10 p-4">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-4 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 mb-4">
                    <Tag className="w-10 h-10 text-blue-500" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">TagEngine <span className="text-blue-500">Pro</span></h1>
                <p className="text-slate-400 mt-2 text-sm">Система управления инженерными данными</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <User className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-600 text-white rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                                placeholder="Логин (например, Engineer)"
                            />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-600 text-white rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                                placeholder="Пароль"
                            />
                        </div>
                        <div className="flex items-center">
                            <input 
                                id="remember-me" 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900" 
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400 select-none cursor-pointer">
                                Запомнить меня
                            </label>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide shadow-lg shadow-blue-900/20"
                    >
                        {isLoading ? <Activity className="animate-spin" /> : 'Войти в систему'}
                    </Button>
                </form>
                
                <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
                    <p className="text-xs text-slate-500">PDH2 Project &bull; Authorized Personnel Only</p>
                </div>
            </div>
        </div>
    </div>
  );
};