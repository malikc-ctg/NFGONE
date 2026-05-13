// Sea of Blue — Dispute Engine

import { createServiceClient } from '@/lib/supabase/server';
import type { DisputeCategory } from '@/types';

export async function createDispute(params: {
  job_id: string;
  customer_id: string;
  contractor_id: string | null;
  category: DisputeCategory;
  description: string;
  evidence_urls?: string[];
}): Promise<{ id: string } | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('disputes')
    .insert({
      ...params,
      reported_by: 'customer',
      status: 'open',
      evidence_urls: params.evidence_urls ?? [],
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create dispute:', error);
    return null;
  }

  // Update the job status
  await supabase
    .from('jobs')
    .update({ status: 'disputed', dispute_id: data.id })
    .eq('id', params.job_id);

  return data;
}

export async function resolveDispute(params: {
  dispute_id: string;
  resolved_by: string; // profile_id of admin
  resolution_notes: string;
  refund_amount?: number;
  contractor_penalty?: number;
  new_status: 'resolved_customer' | 'resolved_company' | 'escalated';
}): Promise<void> {
  const supabase = await createServiceClient();

  const { data: dispute } = await supabase
    .from('disputes')
    .select('job_id, contractor_id')
    .eq('id', params.dispute_id)
    .single();

  if (!dispute) throw new Error('Dispute not found');

  await supabase.from('disputes').update({
    status: params.new_status,
    resolution_notes: params.resolution_notes,
    refund_amount: params.refund_amount ?? null,
    contractor_penalty: params.contractor_penalty ?? null,
    resolved_by: params.resolved_by,
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', params.dispute_id);

  // Apply contractor score penalty if specified
  if (params.contractor_penalty && params.contractor_penalty > 0 && dispute.contractor_id) {
    await applyContractorPenalty(dispute.contractor_id, params.contractor_penalty);
  }

  // Move job to appropriate final status
  const finalJobStatus =
    params.new_status === 'resolved_customer' ? 'refunded' : 'reviewed';
  await supabase
    .from('jobs')
    .update({ status: finalJobStatus })
    .eq('id', dispute.job_id);
}

async function applyContractorPenalty(
  contractorId: string,
  penaltyAmount: number
): Promise<void> {
  const supabase = await createServiceClient();

  const { data: contractor } = await supabase
    .from('contractors')
    .select('score')
    .eq('id', contractorId)
    .single();

  if (!contractor) return;

  // Score penalty: $50 penalty = -0.2 score points (scaled)
  const scorePenalty = Math.min((penaltyAmount / 50) * 0.2, 0.5);
  const newScore = Math.max(1.0, (contractor.score as number) - scorePenalty);

  await Promise.all([
    supabase
      .from('contractors')
      .update({ score: Math.round(newScore * 100) / 100 })
      .eq('id', contractorId),
    supabase.from('contractor_score_history').insert({
      contractor_id: contractorId,
      score_before: contractor.score,
      score_after: Math.round(newScore * 100) / 100,
      reason: `Dispute penalty: $${penaltyAmount}`,
    }),
  ]);
}

export async function addDisputeMessage(params: {
  dispute_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  attachments?: string[];
}): Promise<void> {
  const supabase = await createServiceClient();

  await supabase.from('dispute_messages').insert({
    ...params,
    attachments: params.attachments ?? [],
  });

  // Update dispute status to under_review if it was open
  await supabase
    .from('disputes')
    .update({ status: 'under_review', updated_at: new Date().toISOString() })
    .eq('id', params.dispute_id)
    .eq('status', 'open');
}

export async function getDisputeWithMessages(disputeId: string) {
  const supabase = await createServiceClient();

  const [disputeResult, messagesResult] = await Promise.all([
    supabase
      .from('disputes')
      .select('*, job:jobs(*, customer:customers(*), contractor:contractors(*)), customer:customers(*), contractor:contractors(*)')
      .eq('id', disputeId)
      .single(),
    supabase
      .from('dispute_messages')
      .select('*, sender:profiles(full_name, role)')
      .eq('dispute_id', disputeId)
      .order('sent_at', { ascending: true }),
  ]);

  return {
    dispute: disputeResult.data,
    messages: messagesResult.data ?? [],
  };
}
