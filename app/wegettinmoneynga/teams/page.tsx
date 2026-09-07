'use client';

import { useEffect, useState } from 'react';
import { UsersRound, Plus, Crown, User, UserPlus, Trash2, Pencil, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { EmployeeTeam, Zone, Employee } from '@/types';

export default function TeamsPage() {
  const [teams, setTeams] = useState<EmployeeTeam[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState<EmployeeTeam | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    name: '',
    zone_id: '',
    lead_employee_id: '',
    max_jobs_per_day: '3',
    lead_payout_pct: '45',
    member_payout_pct: '25',
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    zone_id: '',
    lead_employee_id: '',
    max_jobs_per_day: '3',
    lead_payout_pct: '45',
    member_payout_pct: '25',
    notes: '',
    status: 'active',
  });

  const [selectedNewMemberId, setSelectedNewMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [teamsRes, zonesRes, employeesRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/zones'),
        fetch('/api/employees'),
      ]);
      const [teamsData, zonesData, employeesData] = await Promise.all([
        teamsRes.json(),
        zonesRes.json(),
        employeesRes.json(),
      ]);

      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setZones(Array.isArray(zonesData) ? zonesData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load teams data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // Filter employees available for a selected zone
  const getZoneEmployees = (zoneId: string) => {
    if (!zoneId) return employees;
    return employees.filter(e => e.zone_id === zoneId || !e.zone_id);
  };

  async function handleCreateTeam() {
    if (!createForm.name || !createForm.zone_id || !createForm.lead_employee_id) {
      toast.error('Please enter team name, zone, and select a team lead.');
      return;
    }
    setSubmitting(true);
    try {
      const leadPct = parseFloat(createForm.lead_payout_pct) / 100;
      const memberPct = parseFloat(createForm.member_payout_pct) / 100;

      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          zone_id: createForm.zone_id,
          lead_employee_id: createForm.lead_employee_id,
          max_jobs_per_day: parseInt(createForm.max_jobs_per_day, 10) || 3,
          payout_split: { lead: leadPct, member: memberPct },
          notes: createForm.notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create team');
      }

      toast.success(`Team "${createForm.name}" created successfully`);
      setCreateOpen(false);
      setCreateForm({
        name: '', zone_id: '', lead_employee_id: '',
        max_jobs_per_day: '3', lead_payout_pct: '45', member_payout_pct: '25', notes: '',
      });
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditTeam() {
    if (!editForm.name || !editForm.zone_id || !editForm.lead_employee_id) {
      toast.error('Name, zone, and team lead are required.');
      return;
    }
    setSubmitting(true);
    try {
      const leadPct = parseFloat(editForm.lead_payout_pct) / 100;
      const memberPct = parseFloat(editForm.member_payout_pct) / 100;

      const res = await fetch(`/api/teams/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          zone_id: editForm.zone_id,
          lead_employee_id: editForm.lead_employee_id,
          max_jobs_per_day: parseInt(editForm.max_jobs_per_day, 10) || 3,
          payout_split: { lead: leadPct, member: memberPct },
          notes: editForm.notes || null,
          status: editForm.status,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update team');
      }

      toast.success('Team updated successfully');
      setEditOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTeam(teamId: string, teamName: string) {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete team');
      toast.success(`Team "${teamName}" deleted`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleAddMember() {
    if (!activeTeam || !selectedNewMemberId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${activeTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedNewMemberId,
          role: 'member',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add team member');
      }

      toast.success('Team member added');
      setAddMemberOpen(false);
      setSelectedNewMemberId('');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveMember(teamId: string, memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from this team?`)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove member');
      toast.success(`${memberName} removed from team`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function toggleTeamStatus(team: EmployeeTeam) {
    const newStatus = team.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Team ${team.name} status updated to ${newStatus}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const openEditModal = (team: EmployeeTeam) => {
    setActiveTeam(team);
    setEditForm({
      id: team.id,
      name: team.name,
      zone_id: team.zone_id,
      lead_employee_id: team.lead_employee_id,
      max_jobs_per_day: team.max_jobs_per_day.toString(),
      lead_payout_pct: (team.payout_split?.lead ? team.payout_split.lead * 100 : 45).toString(),
      member_payout_pct: (team.payout_split?.member ? team.payout_split.member * 100 : 25).toString(),
      notes: team.notes || '',
      status: team.status || 'active',
    });
    setEditOpen(true);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Teams &amp; Cleaning Crews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage 2–3 person employee teams for heavy cleans, deep cleans, and multi-staff zones</p>
        </div>

        {/* Create Team Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Employee Team</DialogTitle>
              <DialogDescription>
                Define a standard cleaning team with a Team Lead and custom payout split.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label>Team Name *</Label>
                <Input
                  placeholder="e.g. Toronto East Alpha Crew"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Assigned Zone *</Label>
                <Select value={createForm.zone_id} onValueChange={v => setCreateForm({ ...createForm, zone_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Zone" /></SelectTrigger>
                  <SelectContent>
                    {zones.map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.name} ({z.city})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Team Lead Employee *</Label>
                <Select value={createForm.lead_employee_id} onValueChange={v => setCreateForm({ ...createForm, lead_employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Team Lead" /></SelectTrigger>
                  <SelectContent>
                    {getZoneEmployees(createForm.zone_id).map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        👑 {e.full_name} ({e.tier ?? 'basic'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Max Jobs / Day</Label>
                  <Input
                    type="number"
                    value={createForm.max_jobs_per_day}
                    onChange={e => setCreateForm({ ...createForm, max_jobs_per_day: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lead Payout %</Label>
                  <Input
                    type="number"
                    value={createForm.lead_payout_pct}
                    onChange={e => setCreateForm({ ...createForm, lead_payout_pct: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Member Payout %</Label>
                  <Input
                    type="number"
                    value={createForm.member_payout_pct}
                    onChange={e => setCreateForm({ ...createForm, member_payout_pct: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Special instructions or equipment requirements..."
                  value={createForm.notes}
                  onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="h-20"
                />
              </div>

              <Button onClick={handleCreateTeam} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                {submitting ? 'Creating...' : 'Create Team'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main List Grid */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading teams…
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center max-w-lg mx-auto space-y-3">
          <UsersRound className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="font-bold text-base text-foreground">No Teams Created Yet</h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Create standard employee crews to automatically route multi-person jobs, split payouts, and assign crew leads.
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="mt-2">
            <Plus className="h-4 w-4 mr-1.5" /> Create First Team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const zone = team.zone as Zone | undefined;
            const leadPct = team.payout_split?.lead ? Math.round(team.payout_split.lead * 100) : 45;
            const memberPct = team.payout_split?.member ? Math.round(team.payout_split.member * 100) : 25;
            const membersList = team.members ?? [];

            // Existing team member IDs to exclude when adding new member
            const existingMemberIds = membersList.map(m => m.employee_id);

            return (
              <div key={team.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 hover:border-primary/40 transition-colors">
                {/* Team Card Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      {team.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      📍 {zone?.name ?? 'Unassigned Zone'} {zone?.city ? `(${zone.city})` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTeamStatus(team)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                        team.status === 'active'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300'
                          : 'bg-muted text-muted-foreground hover:bg-slate-200'
                      }`}
                    >
                      {team.status}
                    </button>

                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditModal(team)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-red-600" onClick={() => handleDeleteTeam(team.id, team.name)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-600" />
                    </Button>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="space-y-2 bg-muted/40 p-3 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    <span>Crew Members ({membersList.length})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1"
                      onClick={() => {
                        setActiveTeam(team);
                        setSelectedNewMemberId('');
                        setAddMemberOpen(true);
                      }}
                    >
                      <UserPlus className="h-3 w-3" /> Add Member
                    </Button>
                  </div>

                  {membersList.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">No members added to this team yet.</p>
                  ) : (
                    membersList.map((m) => {
                      const emp = m.employee as Employee | undefined;
                      const isLead = m.role === 'lead' || m.employee_id === team.lead_employee_id;
                      return (
                        <div key={m.id} className="flex items-center justify-between py-1.5 px-2 bg-background rounded border border-border/40 text-sm">
                          <div className="flex items-center gap-2">
                            {isLead ? (
                              <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="font-medium text-foreground">{emp?.full_name ?? 'Employee'}</span>
                            {isLead && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                Lead
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {emp?.score && (
                              <span className="text-xs text-muted-foreground font-semibold">★ {emp.score.toFixed(1)}</span>
                            )}
                            {!isLead && (
                              <button
                                onClick={() => handleRemoveMember(team.id, m.id, emp?.full_name || 'Member')}
                                className="text-muted-foreground hover:text-red-600 transition-colors p-1"
                                title="Remove from team"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Team Footer & Details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                  <span className="font-medium">Max {team.max_jobs_per_day} jobs / day</span>
                  <span className="font-semibold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    Lead: {leadPct}% / Member: {memberPct}%
                  </span>
                </div>

                {team.notes && (
                  <p className="text-xs text-muted-foreground italic bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border border-amber-100 dark:border-amber-900/40">
                    📝 {team.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Settings</DialogTitle>
            <DialogDescription>
              Update team details, lead employee, max daily jobs, and payout split percentages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Team Name *</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Assigned Zone *</Label>
              <Select value={editForm.zone_id} onValueChange={v => setEditForm({ ...editForm, zone_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {zones.map(z => (
                    <SelectItem key={z.id} value={z.id}>{z.name} ({z.city})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Team Lead Employee *</Label>
              <Select value={editForm.lead_employee_id} onValueChange={v => setEditForm({ ...editForm, lead_employee_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getZoneEmployees(editForm.zone_id).map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      👑 {e.full_name} ({e.tier ?? 'basic'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Max Jobs / Day</Label>
                <Input
                  type="number"
                  value={editForm.max_jobs_per_day}
                  onChange={e => setEditForm({ ...editForm, max_jobs_per_day: e.target.value })}
                />
              </div>
              <div>
                <Label>Lead Payout %</Label>
                <Input
                  type="number"
                  value={editForm.lead_payout_pct}
                  onChange={e => setEditForm({ ...editForm, lead_payout_pct: e.target.value })}
                />
              </div>
              <div>
                <Label>Member Payout %</Label>
                <Input
                  type="number"
                  value={editForm.member_payout_pct}
                  onChange={e => setEditForm({ ...editForm, member_payout_pct: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                className="h-20"
              />
            </div>

            <Button onClick={handleEditTeam} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Save Team Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Member to {activeTeam?.name}</DialogTitle>
            <DialogDescription>
              Select an available employee to join this crew.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Select Employee</Label>
              <Select value={selectedNewMemberId} onValueChange={setSelectedNewMemberId}>
                <SelectTrigger><SelectValue placeholder="Choose employee..." /></SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(e => activeTeam && !activeTeam.members?.some(m => m.employee_id === e.id))
                    .map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name} ({e.status})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAddMember} disabled={submitting || !selectedNewMemberId} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Add to Crew
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
