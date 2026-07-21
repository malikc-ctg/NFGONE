// Sea of Blue — Dynamic Pricing Engine
// SERVER-SIDE ONLY. Never import this in client components.
// The surge multiplier calculation is never exposed to the browser.

import { createServiceClient } from '@/lib/supabase/server';
import type { ServiceType, TimeWindow, PriceQuote, DynamicPricingConfig } from '@/types';

interface PricingContext {
  service_type: ServiceType;
  zone_id: string;
  requested_date: string; // YYYY-MM-DD
  requested_window: TimeWindow;
  base_quote: Omit<PriceQuote, 'surge_multiplier' | 'surge_reason'>;
  customer_credit?: number;
}

interface DemandSnapshot {
  available_employees: number;
  jobs_already_booked_in_window: number;
  employee_capacity_in_window: number;
  utilization_rate: number;
}

async function getDemandSnapshot(
  zone_id: string,
  date: string,
  window: TimeWindow
): Promise<DemandSnapshot> {
  const supabase = await createServiceClient();

  const [employeesResult, bookedJobsResult] = await Promise.all([
    // Employees available in this zone on this day/window
    supabase.rpc('get_available_employees_count', {
      p_zone_id: zone_id,
      p_date: date,
      p_window: window,
    }),
    // Jobs already booked in this zone/date/window
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('zone_id', zone_id)
      .eq('scheduled_date', date)
      .eq('scheduled_window', window)
      .not('status', 'in', '(cancelled,refunded)'),
  ]);

  const availableEmployees = (employeesResult.data as number | null) ?? 2;
  const bookedJobs = bookedJobsResult.count ?? 0;
  const capacity = availableEmployees * 2; // each employee handles ~2 jobs per window
  const utilization = capacity > 0 ? bookedJobs / capacity : 0;

  return {
    available_employees: availableEmployees,
    jobs_already_booked_in_window: bookedJobs,
    employee_capacity_in_window: capacity,
    utilization_rate: Math.min(utilization, 1),
  };
}

async function getPricingConfig(zone_id: string): Promise<DynamicPricingConfig | null> {
  const supabase = await createServiceClient();

  // Zone-specific config first, then fall back to global
  const { data: zoneConfig } = await supabase
    .from('dynamic_pricing_config')
    .select('*')
    .eq('zone_id', zone_id)
    .single();

  if (zoneConfig) return zoneConfig as DynamicPricingConfig;

  const { data: globalConfig } = await supabase
    .from('dynamic_pricing_config')
    .select('*')
    .eq('is_global_config', true)
    .single();

  return globalConfig as DynamicPricingConfig | null;
}

export async function applyDynamicPricing(context: PricingContext): Promise<PriceQuote> {
  const config = await getPricingConfig(context.zone_id);

  // If dynamic pricing is globally disabled or zone-disabled, return base quote unchanged
  if (!config || !config.enabled) {
    return {
      ...context.base_quote,
      surge_multiplier: 1.0,
      surge_reason: null,
    };
  }

  const demand = await getDemandSnapshot(
    context.zone_id,
    context.requested_date,
    context.requested_window
  );

  let surgeMultiplier = config.multiplier_floor;
  let surgeReason: string | null = null;

  // Tier 1: High utilization
  if (demand.utilization_rate >= config.tier1_threshold) {
    surgeMultiplier = Math.max(surgeMultiplier, config.tier1_multiplier);
    surgeReason = 'High demand in your area';
  }

  // Tier 2: Very high utilization
  if (demand.utilization_rate >= config.tier2_threshold) {
    surgeMultiplier = Math.max(surgeMultiplier, config.tier2_multiplier);
    surgeReason = 'Limited availability';
  }

  // Last available slot
  if (demand.available_employees === 1) {
    surgeMultiplier = Math.max(surgeMultiplier, 1.20);
    surgeReason = 'Last available slot';
  }

  // Same-day booking premium
  const today = new Date().toISOString().split('T')[0];
  if (context.requested_date === today) {
    surgeMultiplier = Math.max(surgeMultiplier, config.same_day_multiplier);
    surgeReason = surgeReason ?? 'Same-day booking';
  }

  // Weekend premium (Saturday = 6, Sunday = 0)
  const dayOfWeek = new Date(context.requested_date + 'T12:00:00').getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    surgeMultiplier = Math.max(surgeMultiplier, config.weekend_multiplier);
    surgeReason = surgeReason ?? 'Weekend availability';
  }

  // Hard cap at ceiling
  surgeMultiplier = Math.min(surgeMultiplier, config.multiplier_ceiling);

  // Round to nearest $5
  const surgedPrice =
    Math.ceil((context.base_quote.final_price * surgeMultiplier) / 5) * 5;

  const deposit = Math.round(surgedPrice * 0.3 * 100) / 100;

  // Apply customer credit (max 50% of job price)
  let creditApplied = 0;
  let finalPrice = surgedPrice;
  const lineItems = [...context.base_quote.line_items];

  if (context.customer_credit && context.customer_credit > 0) {
    creditApplied = Math.min(context.customer_credit, surgedPrice * 0.5);
    finalPrice = surgedPrice - creditApplied;
    lineItems.push({ label: 'Sea of Blue credit', amount: -creditApplied });
  }

  return {
    ...context.base_quote,
    final_price: finalPrice,
    deposit_amount: deposit,
    balance_due: finalPrice - deposit,
    surge_multiplier: surgeMultiplier,
    surge_reason: surgeReason,
    credit_applied: creditApplied > 0 ? creditApplied : undefined,
    line_items: lineItems,
  };
}

export type { PricingContext, DemandSnapshot };
