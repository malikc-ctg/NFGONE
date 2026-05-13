'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Briefcase, Star } from 'lucide-react';

export default function EarningsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Earnings</h1>

      <Tabs defaultValue="current">
        <TabsList className="w-full">
          <TabsTrigger value="current" className="flex-1 h-10">This Month</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 h-10">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">$0</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">$0</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Briefcase className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Jobs Done</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">5.0</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No completed jobs yet
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
