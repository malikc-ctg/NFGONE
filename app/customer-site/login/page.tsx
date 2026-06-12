'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-[#010A14] flex flex-col justify-center items-center py-20 px-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#001a36]/50 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3" />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex justify-center mb-10">
          <img 
            src="/nav-logo.png?v=2" 
            alt="Sea of Blue" 
            className="h-8 w-auto object-contain"
          />
        </Link>
        
        <div className="bg-[#001a36]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h1 className="font-rustic text-3xl text-white mb-2 text-center">Welcome Back</h1>
          <p className="text-white/50 text-sm text-center mb-8">Sign in to track your active dispatch.</p>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-white/70 text-sm mb-2 font-medium">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-white/70 text-sm font-medium">Password</label>
                <Link href="#" className="text-blue-400 text-xs hover:text-blue-300 transition-colors">Forgot?</Link>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-white text-[#010A14] py-3.5 rounded-full font-bold tracking-widest uppercase hover:bg-white/90 transition-colors mt-4"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-white/50">
            Don&apos;t have an account? <Link href="/quote" className="text-white hover:underline">Request a Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
