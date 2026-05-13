import { createServiceClient } from '@/lib/supabase/server';

export async function recalculateContractorScore(contractorId: string): Promise<number> {
  const supabase = await createServiceClient();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, status, contractor_started_at, scheduled_date, scheduled_window')
    .eq('assigned_contractor_id', contractorId)
    .in('status', ['completed', 'reviewed', 'paid_out', 'no_show', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(30);

  if (!jobs || jobs.length === 0) return 5.00;

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false })
    .limit(30);

  const completedJobs = jobs.filter(j =>
    ['completed', 'reviewed', 'paid_out'].includes(j.status)
  );
  const noShows = jobs.filter(j => j.status === 'no_show').length;
  const cancellations = jobs.filter(j => j.status === 'cancelled').length;

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
    : 5.0;

  const completionRate = completedJobs.length / jobs.length;
  const noShowRate = noShows / jobs.length;
  const cancellationRate = cancellations / jobs.length;

  const onTimeJobs = reviews ? reviews.filter(r => r.was_on_time === true) : [];
  const onTimeRate = reviews && reviews.length > 0
    ? onTimeJobs.length / reviews.length
    : 1.0;

  const score =
    (avgRating / 5) * 5 * 0.35 +
    completionRate * 5 * 0.20 +
    onTimeRate * 5 * 0.20 +
    (1 - cancellationRate) * 5 * 0.15 +
    (1 - Math.min(noShowRate * 3, 1)) * 5 * 0.10;

  const finalScore = Math.max(0, Math.min(5, parseFloat(score.toFixed(2))));

  // Get current score for history
  const { data: currentContractor } = await supabase
    .from('contractors')
    .select('score')
    .eq('id', contractorId)
    .single();

  await supabase
    .from('contractors')
    .update({ score: finalScore, updated_at: new Date().toISOString() })
    .eq('id', contractorId);

  await supabase.from('contractor_score_history').insert({
    contractor_id: contractorId,
    score_before: currentContractor?.score ?? null,
    score_after: finalScore,
    reason: 'recalculation_after_review',
  });

  // Auto-probation if score drops below 4.3 with enough data
  if (finalScore < 4.3 && completedJobs.length >= 10) {
    await supabase
      .from('contractors')
      .update({ status: 'probation' })
      .eq('id', contractorId)
      .eq('status', 'active');
  }

  return finalScore;
}
