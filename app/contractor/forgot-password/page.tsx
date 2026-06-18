'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ContractorForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password?portal=contractor`,
      });
      if (error) throw error;
      setSent(true);
      toast.success('Reset email sent successfully!');
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      toast.error((err as Error).message ?? 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <img src="/logo.png" alt="Sea of Blue Logo" className="mx-auto w-32 h-32 object-contain" />
          <CardTitle className="text-xl">Sea of Blue</CardTitle>
          <p className="text-sm text-muted-foreground">Reset your password</p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                Check your email! We've sent a password reset link to {email}.
              </div>
              <Link href="/contractor/login">
                <Button variant="outline" className="w-full">Return to login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  autoComplete="email"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <div className="text-center text-sm pt-2">
                <Link href="/contractor/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
