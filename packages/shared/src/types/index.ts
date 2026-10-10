export type UserRole = 'BUYER' | 'EXPERT' | 'ADMIN';

export type ExpertVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type ItemStatus = 'BON' | 'MOYEN' | 'MAUVAIS' | 'NON_TESTE';

export type SeverityLevel = 'INFO' | 'FAIBLE' | 'MOYEN' | 'IMPORTANT' | 'CRITIQUE';

export type BookingStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'BOOKING_REQUESTED'
  | 'ACCEPTED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'INSPECTION_COMPLETED'
  | 'REPORT_PENDING'
  | 'REPORT_READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REJECTED'
  | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export type PaymentMethod = 'SANDBOX' | 'CASH';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface ExpertProfile {
  id: string;
  bio?: string;
  wilaya: string;
  commune: string;
  specialties: string[];
  hourly_rate?: number;
  fixed_rate?: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface ExpertDocument {
  id: string;
  expert_id: string;
  identity_document_url: string;
  identity_document_type: string;
  identity_document_number: string;
  business_registration_url: string;
  business_registration_number: string;
  business_name: string;
  business_activity: string;
  verification_status: ExpertVerificationStatus;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  base_price: number;
  estimated_duration_minutes: number;
  is_active: boolean;
}

export interface InspectionTemplate {
  id: string;
  service_id: string;
  title: string;
  version: number;
  is_active: boolean;
}

export interface InspectionSection {
  id: string;
  template_id: string;
  title: string;
  order_index: number;
}

export interface InspectionItem {
  id: string;
  section_id: string;
  name: string;
  description?: string;
  weight: number;
  is_required: boolean;
  order_index: number;
  possible_statuses: ItemStatus[];
  possible_severities: SeverityLevel[];
}

export interface Listing {
  id: string;
  buyer_id: string;
  category_id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  asking_price?: number;
  location_wilaya: string;
  location_commune: string;
  description?: string;
  photos: string[];
  /** P7.6 — lien d'annonce en ligne fourni par le buyer (NULL = EchriMheni). */
  listing_url?: string | null;
  /** P7.6 — plateforme source (défaut 'ECHRI'). */
  source_platform?: 'ECHRI' | 'FACEBOOK_MARKETPLACE' | 'OUEDKNISS' | 'OTHER';
  created_at: string;
}

export interface Booking {
  id: string;
  listing_id: string;
  buyer_id: string;
  expert_id?: string;
  service_id: string;
  status: BookingStatus;
  scheduled_at?: string;
  location_address: string;
  price_total: number;
  commission_platform: number;
  expert_payout: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionSession {
  id: string;
  booking_id: string;
  started_at: string;
  completed_at?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export interface InspectionAnswer {
  id: string;
  session_id: string;
  item_id: string;
  status: ItemStatus;
  severity?: SeverityLevel;
  comment?: string;
  created_at: string;
}

export interface InspectionMedia {
  id: string;
  session_id: string;
  item_id?: string;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  caption?: string;
  created_at: string;
}

export interface InspectionReport {
  id: string;
  booking_id: string;
  session_id: string;
  score: number;
  summary: string;
  positive_points: string[];
  watchpoints: string[];
  major_defects: string[];
  critical_defects: string[];
  disclaimer: string;
  pdf_url?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_ref?: string;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}
