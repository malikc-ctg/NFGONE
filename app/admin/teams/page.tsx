'use client';

import { useEffect, useState } from 'react';
import { UsersRound, Plus, Crown, User } from 'lucide-react';
import type { ContractorTeam, Zone } from '@/types';

export default function TeamsPage() {
  const [teams, setTeams] = useState<ContractorTeam[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then(r => r.json()),
      fetch('/api/zones').then(r => r.json()),
    ]).then(([t, z]) => { setTeams(Array.isArray(t) ? t : []); setZones(Array.isArray(z) ? z : []); setLoading(false); });
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-0.5">2–3 person contractor crews for deep and move-out cleans</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Create Team
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm">Loading teams…</div>
      ) : teams.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <UsersRound className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No teams yet. Create your first team above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{team.name}</h3>
                  <p className="text-xs text-muted-foreground">{(team.zone as Zone | undefined)?.name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  team.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                }`}>
                  {team.status}
                </span>
              </div>

              <div className="space-y-1.5 mb-3">
                {(team.members ?? []).map((m) => {
                  const contractor = m.contractor as { full_name?: string; score?: number } | undefined;
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      {m.role === 'lead' ? (
                        <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-foreground">{contractor?.full_name ?? '—'}</span>
                      {contractor?.score && (
                        <span className="text-xs text-muted-foreground ml-auto">★ {contractor.score.toFixed(1)}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                <span>Max {team.max_jobs_per_day} jobs/day</span>
                <span>Lead {(team.payout_split.lead * 100).toFixed(0)}% / Member {(team.payout_split.member * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
