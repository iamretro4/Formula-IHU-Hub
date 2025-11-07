// src/lib/types/database.ts
// IMPORTANT: This file relies on `supabase/database.types.ts` being generated.
// Run `supabase gen types typescript --project-id wplyazvnhhhcehbxkxhg --schema public > supabase/database.types.ts`
// from your project root to generate it.

import { Database as SupabaseDatabase } from '../../../supabase/database.types';

// Export enums from SupabaseDatabase for consistent type usage across the app
// These map directly to the enums defined in your Supabase schema.
// Changed from `const enum` to `enum` to ensure runtime availability
export enum UserRole {
  admin = 'admin',
  scrutineer = 'scrutineer',
  team_leader = 'team_leader',
  inspection_responsible = 'inspection_responsible',
  team_member = 'team_member',
  design_judge_software = 'design_judge_software',
  design_judge_mechanical = 'design_judge_mechanical',
  design_judge_electronics = 'design_judge_electronics',
  design_judge_overall = 'design_judge_overall',
  bp_judge = 'bp_judge',
  cm_judge = 'cm_judge',
  engineering_design = 'engineering_design',
  track_marshal = 'track_marshal',
  viewer = 'viewer',
}

export enum TeamStatus {
  active = 'active',
  inactive = 'inactive',
  disqualified = 'disqualified',
}

export enum VehicleStatus {
  ready = 'ready',
  under_maintenance = 'under_maintenance',
  failed_inspection = 'failed_inspection',
  passed_inspection = 'passed_inspection',
}

export enum BookingStatus {
  upcoming = 'upcoming',
  ongoing = 'ongoing',
  completed = 'completed',
  cancelled = 'cancelled',
}

export enum ResultStatus {
  passed = 'passed',
  failed = 'failed',
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  submitted = 'submitted',
  reviewed = 'reviewed',
  final = 'final',
  provisional = 'provisional',
}

export enum ItemStatus {
  pass = 'pass',
  fail = 'fail',
  pending = 'pending',
  not_applicable = 'not_applicable',
}

export enum ScoreStatus {
  pending = 'pending',
  submitted = 'submitted',
  approved = 'approved',
  rejected = 'rejected',
  reviewed = 'reviewed',
  final = 'final',
}

// Export types for the enums
// These types should now be compatible with the runtime enums above
export type UserRoleType = UserRole;
export type TeamStatusType = TeamStatus;
export type VehicleStatusType = VehicleStatus;
export type BookingStatusType = BookingStatus;
export type ResultStatusType = ResultStatus;
export type ItemStatusType = ItemStatus;
export type ScoreStatusType = ScoreStatus;

// UserProfile should match the 'user_profiles' table structure from Supabase
export type UserProfile = SupabaseDatabase['public']['Tables']['user_profiles']['Row'];

// Team should match the 'teams' table structure from Supabase
export type Team = SupabaseDatabase['public']['Tables']['teams']['Row'];

// Booking should match the 'bookings' table structure from Supabase
export type Booking = SupabaseDatabase['public']['Tables']['bookings']['Row'];

// JudgedEventBookingWithTeam for nested relations
export type JudgedEventBookingWithTeam = SupabaseDatabase['public']['Tables']['judged_event_bookings']['Row'] & {
  teams?: Team | null; // Assuming a single team relation
};

// JudgedEventCriterion for nested relations
export type JudgedEventCriterion = SupabaseDatabase['public']['Tables']['judged_event_criteria']['Row'];

// JudgedEventScore should match the 'judged_event_scores' table structure
// and include relations as they are fetched in your queries.
export type JudgedEventScore = SupabaseDatabase['public']['Tables']['judged_event_scores']['Row'] & {
  judged_event_bookings?: SupabaseDatabase['public']['Tables']['judged_event_bookings']['Row'] & { teams?: Team | null } | null;
  judged_event_criteria?: JudgedEventCriterion | null;
  user_profiles?: UserProfile | null;
  teams?: Team | null;
};

// JudgedEventScoreWithRelations for queries that fetch multiple bookings or more complex relations
export type JudgedEventScoreWithRelations = SupabaseDatabase['public']['Tables']['judged_event_scores']['Row'] & {
  judged_event_criteria?: JudgedEventCriterion | null;
  judged_event_bookings?: (SupabaseDatabase['public']['Tables']['judged_event_bookings']['Row'] & { teams?: Team | null }) | null;
  teams?: Team | null;
  user_profiles?: UserProfile | null;
};

// InspectionProgress with user_profiles relation
export type InspectionProgress = SupabaseDatabase['public']['Tables']['inspection_progress']['Row'] & {
  user_profiles?: Pick<UserProfile, 'first_name' | 'last_name'> | null;
};

export type CsvRow = {
  team_id: string;
  team_name: string;
  total_score: number;
  criterion_breakdown: { criterion: string; avg_score: number }[];
  judges_list: string[];
};

export type JudgedEventSummaryResult = {
  team: string;
  event: string;
  total_score: number;
};

export type JudgedEventSummaryRow = {
  team: string;
  total: number;
  [eventName: string]: string | number;
};

export type { SupabaseDatabase as Database };
// Export ChecklistTemplate directly from SupabaseDatabase
export type ChecklistTemplate = SupabaseDatabase['public']['Tables']['checklist_templates']['Row'];