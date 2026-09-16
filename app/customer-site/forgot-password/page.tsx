'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password?portal=customer`,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Password reset email sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="font-rustic text-3xl text-white mb-2 text-center">Reset Password</h1>
          <p className="text-white/50 text-sm text-center mb-8">Enter your email and we&apos;ll send you a link to reset your password.</p>

          {sent ? (
            <div className="bg-blue-900/40 border border-blue-500/30 rounded-xl p-6 text-center">
              <p className="text-white font-medium mb-2">Check your email!</p>
              <p className="text-blue-200/70 text-sm mb-6">We&apos;ve sent a password reset link to {email}.</p>
              <Link href="/customer-site/login" className="w-full inline-block bg-white text-[#010A14] py-3.5 rounded-full font-bold tracking-widest uppercase hover:bg-white/90 transition-colors">
                Return to Login
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleReset}>
              <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-white text-[#010A14] py-3.5 rounded-full font-bold tracking-widest uppercase hover:bg-white/90 transition-colors mt-4 flex justify-center items-center h-[52px]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-white/50">
            Remember your password? <Link href="/customer-site/login" className="text-white hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
