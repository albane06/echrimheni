import { getSupabaseClient } from '../client.js';
import { requireSessionUserId } from './buyer.js';
import { ServiceError } from './ownership.js';

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_COMMENT_MAX_LENGTH = 1000;

export interface Review {
  id: string;
  booking_id: string;
  buyer_id: string;
  expert_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/**
 * P6.2-A — Validation évaluation (pure, testable, miroir de la RPC).
 */
export function validateReviewInput(rating: number, comment?: string | null): {
  rating: number;
  comment: string | null;
} {
  if (!Number.isInteger(rating) || rating < REVIEW_RATING_MIN || rating > REVIEW_RATING_MAX) {
    throw new ServiceError(
      'VALIDATION',
      `Note invalide : ${REVIEW_RATING_MIN} à ${REVIEW_RATING_MAX} requise.`
    );
  }
  const clean = (comment || '').trim();
  if (clean.length > REVIEW_COMMENT_MAX_LENGTH) {
    throw new ServiceError(
      'VALIDATION',
      `Commentaire trop long (${REVIEW_COMMENT_MAX_LENGTH} caractères maximum).`
    );
  }
  return { rating, comment: clean.length > 0 ? clean : null };
}

/**
 * P6.2-A — Soumission via RPC (buyer du booking COMPLETED, une seule review).
 */
export async function submitReview(params: {
  bookingId: string;
  rating: number;
  comment?: string | null;
}): Promise<string> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  const { rating, comment } = validateReviewInput(params.rating, params.comment);
  const { data, error } = await supabase.rpc('submit_review', {
    p_booking_id: params.bookingId,
    p_rating: rating,
    p_comment: comment
  });
  if (error) throw error;
  return (data as { review_id: string }).review_id;
}

/**
 * P6.2-A — Review d'un booking (RLS : parties).
 */
export async function getBookingReview(bookingId: string): Promise<Review | null> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data as Review | null;
}

/**
 * P6.2-A — Évaluations reçues par un expert (RLS : concerné ou admin).
 * Alimente le futur ranking (rating_avg / rating_count calculés serveur).
 */
export async function getExpertReviews(expertId: string): Promise<Review[]> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('expert_id', expertId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Review[];
}
