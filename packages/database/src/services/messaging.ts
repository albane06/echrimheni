import { getSupabaseClient } from '../client.js';
import { requireSessionUserId } from './buyer.js';
import { ServiceError } from './ownership.js';

export const MESSAGE_MAX_LENGTH = 2000;

/**
 * P6.2-A — Validation message (pure, testable). Le sender est toujours
 * dérivé de auth.uid() par la RPC, jamais du client.
 */
export function validateMessageBody(body: string): string {
  const clean = (body || '').trim();
  if (clean.length < 1 || clean.length > MESSAGE_MAX_LENGTH) {
    throw new ServiceError(
      'VALIDATION',
      `Message invalide : 1 à ${MESSAGE_MAX_LENGTH} caractères requis.`
    );
  }
  return clean;
}

export interface Conversation {
  id: string;
  booking_id: string;
  buyer_id: string;
  expert_id: string;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/**
 * P6.2-A — Conversation d'un booking (créée si besoin, RPC vérifiée).
 */
export async function getOrCreateConversation(bookingId: string): Promise<Conversation> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  if (!bookingId) {
    throw new ServiceError('VALIDATION', 'Réservation requise.');
  }
  const { data: conversationId, error: rpcError } = await supabase.rpc(
    'get_or_create_conversation',
    { p_booking_id: bookingId }
  );
  if (rpcError) throw rpcError;

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId as string)
    .single();
  if (error) throw error;
  return data as Conversation;
}

/**
 * P6.2-A — Conversations du connecté (filtrage serveur/RLS).
 */
export async function getMyConversations(): Promise<Conversation[]> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Conversation[];
}

/**
 * P6.2-A — Messages d'une conversation (RLS : participants).
 */
export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  if (!conversationId) {
    throw new ServiceError('VALIDATION', 'Conversation requise.');
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ConversationMessage[];
}

/**
 * P6.2-A — Envoi via RPC (sender = auth.uid(), notification incluse).
 */
export async function sendMessage(conversationId: string, body: string): Promise<string> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  const clean = validateMessageBody(body);
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: clean
  });
  if (error) throw error;
  return (data as { message_id: string }).message_id;
}
