'use client';

import { useState } from 'react';
import { Home, BedDouble, Bath, Dog, Check, Edit2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface HomeProfileProps {
  customer: any;
}

export function HomeProfileWidget({ customer }: HomeProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Parse existing notes or initialize empty
  const initialPrefs = (() => {
    try {
      const parsed = JSON.parse(customer.notes || '{}');
      return {
        bedrooms: parsed.home_bedrooms || 0,
        bathrooms: parsed.home_bathrooms || 0,
        hasPets: parsed.has_pets || false,
        instructions: parsed.entry_instructions || '',
      };
    } catch {
      return { bedrooms: 0, bathrooms: 0, hasPets: false, instructions: '' };
    }
  })();

  const [prefs, setPrefs] = useState(initialPrefs);

  async function handleSave() {
    setIsSaving(true);
    try {
      // Merge with existing notes
      const existingNotes = JSON.parse(customer.notes || '{}');
      const updatedNotes = {
        ...existingNotes,
        home_bedrooms: prefs.bedrooms,
        home_bathrooms: prefs.bathrooms,
        has_pets: prefs.hasPets,
        entry_instructions: prefs.instructions,
      };

      const res = await fetch('/api/customers/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updatedNotes }),
      });

      if (!res.ok) throw new Error('Failed to save preferences');
      
      toast.success('Home profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Home className="h-4 w-4 text-blue-600" />
          Home Profile
        </h3>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <><Save className="h-4 w-4"/> Save</> : <><Edit2 className="h-4 w-4"/> Edit</>}
        </button>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <BedDouble className="h-3 w-3" /> Bedrooms
            </label>
            {isEditing ? (
              <select 
                value={prefs.bedrooms} 
                onChange={(e) => setPrefs({...prefs, bedrooms: parseInt(e.target.value)})}
                className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <p className="font-medium text-slate-900">{prefs.bedrooms || 'Not set'}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Bath className="h-3 w-3" /> Bathrooms
            </label>
            {isEditing ? (
              <select 
                value={prefs.bathrooms} 
                onChange={(e) => setPrefs({...prefs, bathrooms: parseInt(e.target.value)})}
                className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <p className="font-medium text-slate-900">{prefs.bathrooms || 'Not set'}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Dog className="h-3 w-3" /> Pets
          </label>
          {isEditing ? (
            <div className="flex gap-3 mt-1">
              <button 
                onClick={() => setPrefs({...prefs, hasPets: true})}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium ${prefs.hasPets ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Yes
              </button>
              <button 
                onClick={() => setPrefs({...prefs, hasPets: false})}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium ${!prefs.hasPets ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                No
              </button>
            </div>
          ) : (
            <p className="font-medium text-slate-900">{prefs.hasPets ? 'Yes (Pets in home)' : 'No pets'}</p>
          )}
        </div>

        <div className="space-y-1 flex-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Entry Instructions</label>
          {isEditing ? (
            <textarea 
              value={prefs.instructions}
              onChange={(e) => setPrefs({...prefs, instructions: e.target.value})}
              placeholder="E.g., Gate code is 1234. Key under mat."
              className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
            />
          ) : (
            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg min-h-[4rem] italic">
              {prefs.instructions || 'No instructions provided.'}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
