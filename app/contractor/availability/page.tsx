'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { DayOfWeek, TimeWindow } from '@/types';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WINDOWS: TimeWindow[] = ['morning', 'afternoon', 'evening'];
const WINDOW_LABELS = { morning: 'AM', afternoon: 'PM', evening: 'Eve' };
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export default function AvailabilityPage() {
  const [grid, setGrid] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DAYS.forEach(d => WINDOWS.forEach(w => { initial[`${d}-${w}`] = true; }));
    return initial;
  });
  const [blockDate, setBlockDate] = useState('');
  const [blockWindow, setBlockWindow] = useState<TimeWindow>('morning');
  const [blockReason, setBlockReason] = useState('');

  function toggleCell(day: DayOfWeek, window: TimeWindow) {
    const key = `${day}-${window}`;
    setGrid(g => ({ ...g, [key]: !g[key] }));
    toast.success(`${DAY_LABELS[day]} ${WINDOW_LABELS[window]} ${grid[`${day}-${window}`] ? 'blocked' : 'available'}`);
  }

  function addBlock() {
    if (!blockDate) { toast.error('Select a date'); return; }
    toast.success(`Blocked ${blockDate} ${WINDOW_LABELS[blockWindow]}`);
    setBlockDate('');
    setBlockReason('');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Availability</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Grid header */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            <div />
            {WINDOWS.map(w => (
              <div key={w} className="text-center text-xs font-medium text-muted-foreground">
                {WINDOW_LABELS[w]}
              </div>
            ))}
          </div>
          {/* Grid rows */}
          {DAYS.map(day => (
            <div key={day} className="grid grid-cols-4 gap-1 mb-1">
              <div className="text-sm font-medium flex items-center">{DAY_LABELS[day]}</div>
              {WINDOWS.map(window => {
                const key = `${day}-${window}`;
                const available = grid[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleCell(day, window)}
                    className={`h-12 rounded-lg font-medium text-xs transition-colors ${
                      available
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {available ? '✓' : '✗'}
                  </button>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Block Specific Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Date</Label><Input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} className="h-12" /></div>
          <div><Label>Window</Label>
            <Select value={blockWindow} onValueChange={v => setBlockWindow(v as TimeWindow)}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Reason (optional)</Label><Input value={blockReason} onChange={e => setBlockReason(e.target.value)} className="h-12" placeholder="e.g. Doctor's appointment" /></div>
          <Button onClick={addBlock} className="w-full h-12">Block Date</Button>
        </CardContent>
      </Card>
    </div>
  );
}
