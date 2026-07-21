// Sea of Blue — Team Dispatch
// Extends the existing dispatch engine to rank employee teams alongside solo employees.

import { createServiceClient } from '@/lib/supabase/server';
import type { EmployeeTeam, TimeWindow } from '@/types';

export interface RankedTeam {
  team: EmployeeTeam;
  dispatch_score: number;
  jobs_today: number;
  team_score: number;
}

export async function getAvailableTeams(
  zoneId: string,
  date: string,
  window: TimeWindow,
  serviceType: string
): Promise<RankedTeam[]> {
  const supabase = await createServiceClient();

  // Only teams support deep clean and move-out by default
  const teamEligibleServices = ['deep_clean', 'move_out_clean', 'move_in_clean'];
  if (!teamEligibleServices.includes(serviceType)) return [];

  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date(date + 'T12:00:00').getDay()
  ];

  // Get active teams in this zone
  const { data: teams } = await supabase
    .from('employee_teams')
    .select(`
      *,
      zone:zones(name),
      lead_employee:employees!employee_teams_lead_employee_id_fkey(
        id, full_name, score, max_jobs_per_day
      ),
      members:employee_team_members(
        employee_id,
        employee:employees(id, full_name, score)
      )
    `)
    .eq('zone_id', zoneId)
    .eq('status', 'active');

  if (!teams || teams.length === 0) return [];

  const ranked: RankedTeam[] = [];

  for (const team of teams) {
    const leadEmployee = team.lead_employee as { id: string; score: number; max_jobs_per_day: number } | null;
    if (!leadEmployee) continue;

    // Check lead employee availability
    const { data: availability } = await supabase
      .from('employee_availability')
      .select('is_available')
      .eq('employee_id', leadEmployee.id)
      .eq('day_of_week', dayOfWeek)
      .eq('time_window', window)
      .single();

    if (!availability?.is_available) continue;

    // Check for date override
    const { data: override } = await supabase
      .from('employee_availability_overrides')
      .select('is_available')
      .eq('employee_id', leadEmployee.id)
      .eq('override_date', date)
      .eq('time_window', window)
      .single();

    if (override && !override.is_available) continue;

    // Count today's assigned jobs for the team
    const { count: jobsToday } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_team_id', team.id)
      .eq('scheduled_date', date)
      .not('status', 'in', '(cancelled,refunded)');

    if ((jobsToday ?? 0) >= team.max_jobs_per_day) continue;

    // Calculate team score = weighted average of member scores
    const members = (team.members as Array<{ employee: { score: number } }>) ?? [];
    const memberScores = members.map((m) => m.employee.score);
    const allScores = [leadEmployee.score, ...memberScores];
    const teamScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;

    // Dispatch score: team score × capacity remaining ratio
    const capacityRatio = 1 - (jobsToday ?? 0) / team.max_jobs_per_day;
    const dispatchScore = teamScore * capacityRatio;

    ranked.push({
      team: team as unknown as EmployeeTeam,
      dispatch_score: Math.round(dispatchScore * 100) / 100,
      jobs_today: jobsToday ?? 0,
      team_score: Math.round(teamScore * 100) / 100,
    });
  }

  return ranked.sort((a, b) => b.dispatch_score - a.dispatch_score);
}

// Calculate per-member payout from team job
export function calculateTeamPayouts(
  totalPayout: number,
  payoutSplit: { lead: number; member: number },
  memberCount: number
): { lead: number; per_member: number } {
  const leadPayout = Math.round(totalPayout * payoutSplit.lead * 100) / 100;
  const remaining = totalPayout - leadPayout;
  const perMember = memberCount > 0 ? Math.round((remaining / memberCount) * 100) / 100 : 0;
  return { lead: leadPayout, per_member: perMember };
}
