// ============================================================
// Sea of Blue — Core TypeScript Types
// ============================================================

// ---------- Enums / Unions ----------

export type UserRole = 'admin' | 'contractor' | 'customer' | 'zone_manager' | 'partner';

// Phase 3 additional enums
export type DisputeCategory = 'missed_items' | 'damage' | 'no_show' | 'billing' | 'other';
export type DisputeStatus = 'open' | 'under_review' | 'resolved_customer' | 'resolved_company' | 'escalated';
export type PartnerType = 'realtor' | 'property_manager' | 'other';
export type PartnerInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type ReferralStatus = 'pending' | 'qualified' | 'credit_applied';
export type RestockStatus = 'pending' | 'ordered' | 'received';

export type JobStatus =
  | 'lead_received' | 'quoted' | 'deposit_paid' | 'confirmed'
  | 'offered' | 'accepted' | 'assigned' | 'on_the_way'
  | 'in_progress' | 'completed' | 'reviewed' | 'paid_out'
  | 'cancelled' | 'rescheduled' | 'no_show' | 'disputed' | 'refunded';

export type ServiceType =
  | 'standard_clean' | 'deep_clean'
  | 'move_in_clean' | 'move_out_clean'
  | 'recurring_standard' | 'recurring_deep';

export type TimeWindow = 'morning' | 'afternoon' | 'evening';

export type DayOfWeek =
  | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  | 'friday' | 'saturday' | 'sunday';

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';

export type ContractorTier = 'basic' | 'pro' | 'team';

export type ContractorStatus = 'active' | 'probation' | 'suspended' | 'inactive';

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'converted' | 'lost';

export type LeadSource = 'lsa' | 'referral' | 'realtor' | 'inbound_call' | 'website';

export type HomeCondition = 'well_maintained' | 'average' | 'heavy_clean_needed';

export type AddOn = 'inside_fridge' | 'inside_oven' | 'inside_cabinets' | 'baseboards' | 'interior_windows';

export type PhotoType = 'before' | 'after' | 'issue' | 'supply_kit';

export type RoomType = 'kitchen' | 'bathroom' | 'bedroom' | 'living_room' | 'other';

export type PaymentType = 'deposit' | 'balance' | 'full' | 'refund' | 'partial_refund';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export type NotificationChannel = 'sms' | 'email' | 'push';

export type NotificationType =
  | 'job_offer' | 'booking_confirmed' | 'reminder'
  | 'review_request' | 'cleaner_on_way' | 'job_complete';

export type ExpenseCategory = 'supplies' | 'gas' | 'insurance' | 'maintenance' | 'other';

// ---------- Human-readable display maps ----------

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  standard_clean: 'Standard Clean',
  deep_clean: 'Deep Clean',
  move_in_clean: 'Move-In Clean',
  move_out_clean: 'Move-Out Clean',
  recurring_standard: 'Recurring Standard',
  recurring_deep: 'Recurring Deep',
};

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Morning (8am–12pm)',
  afternoon: 'Afternoon (12pm–4pm)',
  evening: 'Evening (4pm–8pm)',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  lead_received: 'Lead Received',
  quoted: 'Quoted',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  offered: 'Offered',
  accepted: 'Accepted',
  assigned: 'Assigned',
  on_the_way: 'On the Way',
  in_progress: 'In Progress',
  completed: 'Completed',
  reviewed: 'Reviewed',
  paid_out: 'Paid Out',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  no_show: 'No Show',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

export const CUSTOMER_STATUS_MESSAGES: Partial<Record<JobStatus, string>> = {
  confirmed: 'Your booking is confirmed. We will confirm your cleaner shortly.',
  offered: 'We are confirming your cleaner. You will receive an update soon.',
  assigned: 'Your cleaner has been assigned.',
  on_the_way: 'Your cleaner is on their way to you now.',
  in_progress: 'Your clean is in progress.',
  completed: 'Your clean is complete. How did it go?',
  rescheduled: 'Your booking has been rescheduled. Please check your email for details.',
  cancelled: 'Your booking has been cancelled. Please contact us for assistance.',
};

// ---------- Data Interfaces ----------

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
  areas: string[];
  notes: string | null;
  created_at: string;
}


export interface Customer {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string;
  postal_code: string | null;
  zone_id: string | null;
  stripe_customer_id: string | null;
  notes: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  // joined
  zone?: Zone;
  jobs_count?: number;
  last_clean_date?: string | null;
  has_recurring?: boolean;
}

export interface Contractor {
  id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  zone_id: string | null;
  tier: ContractorTier;
  status: ContractorStatus;
  payout_rate: number;
  brings_own_supplies: boolean;
  has_vehicle: boolean;
  max_jobs_per_day: number;
  score: number;
  stripe_account_id: string | null;
  background_check_cleared: boolean;
  insurance_on_file: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  zone?: Zone;
  jobs_this_month?: number;
}

export interface ContractorDocument {
  id: string;
  contractor_id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
  verified: boolean;
  verified_by: string | null;
  notes: string | null;
}

export interface ContractorAvailability {
  id: string;
  contractor_id: string;
  day_of_week: DayOfWeek;
  time_window: TimeWindow;
  is_available: boolean;
}

export interface ContractorAvailabilityOverride {
  id: string;
  contractor_id: string;
  override_date: string;
  time_window: TimeWindow;
  is_available: boolean;
  reason: string | null;
}

export interface Lead {
  id: string;
  source: LeadSource;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  city: string | null;
  service_type: ServiceType | null;
  preferred_date: string | null;
  preferred_window: TimeWindow | null;
  home_bedrooms: number | null;
  home_bathrooms: number | null;
  home_size_sqft: number | null;
  condition: HomeCondition | null;
  has_pets: boolean;
  add_ons: AddOn[];
  notes: string | null;
  quoted_price: number | null;
  status: LeadStatus;
  converted_job_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  job_number: string;
  lead_id: string | null;
  customer_id: string;
  zone_id: string;
  assigned_contractor_id: string | null;
  service_type: ServiceType;
  status: JobStatus;
  scheduled_date: string;
  scheduled_window: TimeWindow;
  estimated_duration_minutes: number;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  access_instructions: string | null;
  home_bedrooms: number | null;
  home_bathrooms: number | null;
  home_size_sqft: number | null;
  has_pets: boolean;
  add_ons: AddOn[];
  scope_notes: string | null;
  quoted_price: number;
  final_price: number | null;
  contractor_payout_amount: number | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  contractor_started_at: string | null;
  contractor_completed_at: string | null;
  admin_notes: string | null;
  cancellation_reason: string | null;
  dispute_reason: string | null;
  recurring_booking_id: string | null;
  is_first_clean: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  // joined
  customer?: Customer;
  contractor?: Contractor;
  zone?: Zone;
}

export interface JobOffer {
  id: string;
  job_id: string;
  contractor_id: string;
  status: OfferStatus;
  offered_at: string;
  responded_at: string | null;
  expires_at: string | null;
  decline_reason: string | null;
  // joined
  job?: Job;
  contractor?: Contractor;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  contractor_id: string;
  photo_type: PhotoType;
  room: RoomType | null;
  file_url: string;
  caption: string | null;
  uploaded_at: string;
}

export interface JobChecklist {
  id: string;
  job_id: string;
  contractor_id: string;
  checklist_data: ChecklistData;
  submitted_at: string;
  reviewed_by_admin: string | null;
  reviewed_at: string | null;
}

export interface ChecklistData {
  kitchen: {
    counters: boolean;
    sink: boolean;
    stovetop: boolean;
    exterior_appliances: boolean;
    cabinet_fronts: boolean;
    floor: boolean;
    microwave_exterior: boolean;
    microwave_interior?: boolean;
  };
  bathrooms: {
    toilet: boolean;
    sink: boolean;
    shower_tub: boolean;
    mirror: boolean;
    counter: boolean;
    floor: boolean;
    garbage: boolean;
  }[];
  bedrooms: {
    dust_surfaces: boolean;
    vacuum_mop: boolean;
    light_tidy: boolean;
  }[];
  living_areas: {
    dusting: boolean;
    floors: boolean;
    surfaces: boolean;
    garbage: boolean;
  };
  add_ons: {
    inside_fridge?: boolean;
    inside_oven?: boolean;
    inside_cabinets?: boolean;
    baseboards?: boolean;
    interior_windows?: boolean;
  };
  contractor_notes: string;
  scope_changes_noted: string;
  completed_at: string;
}

export interface Payment {
  id: string;
  job_id: string;
  customer_id: string;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  status: PaymentStatus;
  processed_at: string | null;
  created_at: string;
}

export interface ContractorPayout {
  id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  payout_rate: number;
  status: PayoutStatus;
  payout_method: string;
  payout_reference: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  // joined
  job?: Job;
  contractor?: Contractor;
}

export interface Review {
  id: string;
  job_id: string;
  customer_id: string;
  contractor_id: string;
  rating: number;
  was_on_time: boolean | null;
  job_completed_properly: boolean | null;
  anything_missed: string | null;
  would_book_again: boolean | null;
  public_comment: string | null;
  private_feedback: string | null;
  google_review_requested: boolean;
  google_review_requested_at: string | null;
  created_at: string;
}

export interface RecurringBooking {
  id: string;
  customer_id: string;
  preferred_contractor_id: string | null;
  service_type: ServiceType;
  frequency: RecurringFrequency;
  preferred_day_of_week: DayOfWeek | null;
  preferred_window: TimeWindow | null;
  address_line1: string;
  city: string;
  postal_code: string;
  quoted_price: number;
  discount_rate: number;
  add_ons: AddOn[];
  notes: string | null;
  is_active: boolean;
  last_job_date: string | null;
  next_job_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  channel: NotificationChannel;
  notification_type: NotificationType;
  job_id: string | null;
  message: string | null;
  sent_at: string | null;
  delivered: boolean;
  error: string | null;
}

export interface ContractorScoreHistory {
  id: string;
  contractor_id: string;
  score_before: number | null;
  score_after: number | null;
  reason: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface ContractorExpense {
  id: string;
  contractor_id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Minimum photo requirements ----------

export const MIN_PHOTOS: Record<string, number> = {
  standard_clean: 4,
  deep_clean: 6,
  move_out_clean: 8,
  move_in_clean: 8,
  recurring_standard: 4,
  recurring_deep: 6,
};

// ---------- Default pricing (CAD) ----------

export const DEFAULT_PRICING: Record<ServiceType, number> = {
  standard_clean: 180,
  deep_clean: 280,
  move_in_clean: 350,
  move_out_clean: 350,
  recurring_standard: 160,
  recurring_deep: 250,
};

// ---------- Map / Location Interfaces ----------

export interface ContractorLocation {
  id: string;
  contractor_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_active: boolean;
  last_updated: string;
  // joined
  contractor?: Contractor;
}

export interface JobLocationHistory {
  id: string;
  job_id: string;
  contractor_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export interface ZoneBoundary {
  id: string;
  zone_id: string;
  geojson: any;
  center_lat: number | null;
  center_lng: number | null;
  created_at: string;
  updated_at: string;
  // joined
  zone?: Zone;
}

export interface RankedContractor {
  contractor: Contractor;
  dispatch_score: number;
  distance_km: number | null;
  jobs_today: number;
}

// ============================================================
// Phase 3 Interfaces
// ============================================================

// ---------- Zone Staff ----------

export interface ZoneStaff {
  id: string;
  zone_id: string;
  profile_id: string;
  role: string;
  is_active: boolean;
  assigned_at: string;
  // joined
  zone?: Zone;
  profile?: Profile;
}

// ---------- Contractor Teams ----------

export interface ContractorTeam {
  id: string;
  name: string;
  lead_contractor_id: string;
  zone_id: string;
  status: string;
  max_jobs_per_day: number;
  payout_split: { lead: number; member: number };
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  zone?: Zone;
  lead_contractor?: Contractor;
  members?: ContractorTeamMember[];
}

export interface ContractorTeamMember {
  id: string;
  team_id: string;
  contractor_id: string;
  role: string;
  joined_at: string;
  // joined
  contractor?: Contractor;
}

// ---------- Supply Management ----------

export interface SupplyItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  units_per_kit_standard: number;
  units_per_kit_deep: number;
  units_per_kit_moveout: number;
  reorder_threshold: number;
  cost_per_unit: number | null;
  supplier_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SupplyInventory {
  id: string;
  item_id: string;
  zone_id: string | null;
  quantity_on_hand: number;
  last_restocked_at: string | null;
  last_updated: string;
  // joined
  item?: SupplyItem;
  zone?: Zone;
}

export interface SupplyAssignment {
  id: string;
  job_id: string;
  contractor_id: string;
  item_id: string;
  quantity_assigned: number;
  quantity_returned: number | null;
  assigned_at: string;
  returned_at: string | null;
  // joined
  item?: SupplyItem;
  contractor?: Contractor;
}

export interface SupplyRestockOrder {
  id: string;
  item_id: string;
  zone_id: string | null;
  quantity_ordered: number;
  cost_total: number | null;
  status: RestockStatus;
  ordered_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  // joined
  item?: SupplyItem;
  zone?: Zone;
}

// ---------- Disputes ----------

export interface Dispute {
  id: string;
  job_id: string;
  customer_id: string;
  contractor_id: string | null;
  reported_by: string;
  category: DisputeCategory;
  description: string;
  evidence_urls: string[];
  status: DisputeStatus;
  resolution_notes: string | null;
  refund_amount: number | null;
  contractor_penalty: number | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  job?: Job;
  customer?: Customer;
  contractor?: Contractor;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  attachments: string[];
  sent_at: string;
  // joined
  sender?: Profile;
}

// ---------- Partners ----------

export interface Partner {
  id: string;
  profile_id: string;
  company_name: string;
  partner_type: PartnerType;
  zone_id: string | null;
  referral_code: string | null;
  commission_rate: number;
  credit_balance: number;
  billing_email: string | null;
  stripe_customer_id: string | null;
  invoice_billing: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joined
  zone?: Zone;
  profile?: Profile;
}

export interface PartnerBooking {
  id: string;
  partner_id: string;
  job_id: string;
  partner_reference: string | null;
  billing_notes: string | null;
  created_at: string;
  // joined
  job?: Job;
}

export interface PartnerInvoice {
  id: string;
  partner_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  line_items: PartnerInvoiceLineItem[];
  subtotal: number;
  credits_applied: number;
  total_due: number;
  stripe_invoice_id: string | null;
  status: PartnerInvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PartnerInvoiceLineItem {
  job_id: string;
  job_number: string;
  date: string;
  address: string;
  service_type: ServiceType;
  price: number;
}

// ---------- Customer Referrals ----------

export interface CustomerReferral {
  id: string;
  referrer_customer_id: string;
  referred_customer_id: string | null;
  referral_code: string;
  status: ReferralStatus;
  referrer_credit: number;
  referred_discount: number;
  created_at: string;
  qualified_at: string | null;
  credit_applied_at: string | null;
  // joined
  referred_customer?: Customer;
}

// ---------- Booking Sessions ----------

export interface BookingSession {
  id: string;
  session_token: string;
  email: string | null;
  phone: string | null;
  form_data: Record<string, unknown> | null;
  last_step_completed: number;
  quote: PriceQuote | null;
  recovery_email_1_sent_at: string | null;
  recovery_email_2_sent_at: string | null;
  recovery_email_3_sent_at: string | null;
  discount_code: string | null;
  recovered: boolean;
  created_at: string;
  updated_at: string;
}

// ---------- Dynamic Pricing ----------

export interface DynamicPricingConfig {
  id: string;
  zone_id: string | null;
  is_global_config: boolean;
  enabled: boolean;
  multiplier_floor: number;
  multiplier_ceiling: number;
  tier1_threshold: number;
  tier1_multiplier: number;
  tier2_threshold: number;
  tier2_multiplier: number;
  same_day_multiplier: number;
  weekend_multiplier: number;
  updated_at: string;
}

export interface PriceQuote {
  service_type: ServiceType;
  base_price: number;
  add_ons_price: number;
  final_price: number;
  deposit_amount: number;
  balance_due: number;
  surge_multiplier: number;
  surge_reason: string | null;
  credit_applied?: number;
  line_items: Array<{ label: string; amount: number }>;
}

// ---------- Finance / P&L ----------

export interface ZoneMonthlyPnl {
  zone_id: string;
  month: string;
  jobs_completed: number;
  gross_revenue: number;
  total_contractor_payouts: number;
  gross_profit: number;
  avg_ticket: number;
  recurring_jobs: number;
  one_time_jobs: number;
  // joined
  zone?: Zone;
}

export interface ZoneExpansionScore {
  zone_id: string;
  zone_name: string;
  score: number; // 0-100
  jobs_per_month: number;
  contractor_count: number;
  recurring_rate: number;
  avg_ticket: number;
  net_margin: number;
  ready: boolean;
}

