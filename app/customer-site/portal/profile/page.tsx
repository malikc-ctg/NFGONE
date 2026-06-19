import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Settings } from 'lucide-react';
import Link from 'next/link';

export default function CustomerProfilePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Profile</h1>
          <p className="text-slate-500">Manage your personal information and account settings.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 text-sm mb-4">You can view and update your details here. (Coming soon)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-600" /> Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 text-sm mb-4">Password reset and notification settings will appear here. (Coming soon)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
