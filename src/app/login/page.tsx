'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Database, ArrowRight, Eye, EyeOff, Sparkles, Key } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Sign In inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Sign Up inputs
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [useCustomDb, setUseCustomDb] = useState(false);
  const [customDbUri, setCustomDbUri] = useState('');
  
  // Common states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Clear errors on tab switch
  useEffect(() => {
    setErrorMsg('');
  }, [activeTab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      router.push('/chat');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          customDbUri: useCustomDb ? customDbUri : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      router.push('/chat');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden">
      
      {/* Background gradients for premium glassmorphism vibe */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col gap-6 relative z-10">
        
        {/* Logo Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-200">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Memoria AI</span>
          </Link>
          <p className="text-xs text-zinc-500 mt-1">
            Give your AI agents persistent, cognitive memory.
          </p>
        </div>

        {/* Auth Box */}
        <div className="border border-zinc-900 bg-zinc-950/40 rounded-2xl p-6 backdrop-blur-md shadow-2xl flex flex-col gap-5">
          
          {/* Tab Selector */}
          <div className="flex border-b border-zinc-900 pb-1.5 gap-4">
            <button
              onClick={() => setActiveTab('signin')}
              className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all ${
                activeTab === 'signin'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all ${
                activeTab === 'signup'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium leading-relaxed">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 p-3.5 focus:outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 p-3.5 pr-10 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 disabled:opacity-40"
              >
                {isLoading ? 'Verifying Account...' : 'Sign In'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Alex Johnson"
                  required
                  className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 p-3.5 focus:outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 p-3.5 focus:outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-600 p-3.5 pr-10 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* BYODB Optional Toggle */}
              <div className="mt-1 border-t border-zinc-900 pt-3">
                <button
                  type="button"
                  onClick={() => setUseCustomDb(!useCustomDb)}
                  className="flex items-center justify-between w-full text-zinc-400 hover:text-zinc-200 text-xs text-left"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Database className="h-4 w-4 text-indigo-400" />
                    ⚡ Bring Your Own Database (BYODB)
                  </span>
                  <span className="text-[10px] text-zinc-600 uppercase font-bold">
                    {useCustomDb ? 'Enabled' : 'Expand'}
                  </span>
                </button>

                {useCustomDb && (
                  <div className="flex flex-col gap-2.5 mt-3 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      MongoDB Connection URI
                    </label>
                    <textarea
                      value={customDbUri}
                      onChange={(e) => setCustomDbUri(e.target.value)}
                      placeholder="mongodb+srv://user:pass@cluster.mongodb.net/memoria_ai"
                      rows={2}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-zinc-200 placeholder-zinc-700 p-3 resize-none leading-relaxed focus:outline-none transition-all"
                    />
                    <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-zinc-400 leading-relaxed">
                      💡 <strong>Privacy First</strong>: Your connection string is AES-encrypted before storage. Conversations and memories will reside completely on your private cluster.
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 disabled:opacity-40"
              >
                {isLoading ? 'Creating Account...' : 'Register Account'} <Sparkles className="h-4 w-4 text-amber-300" />
              </button>
            </form>
          )}

        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Back to Landing Page
          </Link>
        </div>

      </div>
    </div>
  );
}
