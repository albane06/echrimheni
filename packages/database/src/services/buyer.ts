import { getSupabaseClient } from '../client.js';
import { Category, Service, ExpertProfile, Listing, Booking, InspectionReport } from '@echrimheni/shared';

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return data as Category[];
}

export async function getAutomobileServices(): Promise<Service[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('*, categories!inner(code)')
    .eq('categories.code', 'automobile')
    .eq('is_active', true);
  if (error) throw error;
  return data as Service[];
}

export async function getApprovedExperts(wilaya?: string): Promise<(ExpertProfile & { full_name: string; phone: string })[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('expert_profiles')
    .select('*, profiles!inner(full_name, phone), expert_documents!inner(verification_status)')
    .eq('expert_documents.verification_status', 'APPROVED');

  if (wilaya) {
    query = query.eq('wilaya', wilaya);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    full_name: row.profiles?.full_name || '',
    phone: row.profiles?.phone || ''
  }));
}

export async function createVehicleListing(params: {
  buyerId: string;
  categoryId: string;
  title: string;
  make: string;
  model: string;
  year: number;
  mileage?: number;
  askingPrice?: number;
  locationWilaya: string;
  locationCommune: string;
  description?: string;
  photos?: string[];
}): Promise<Listing> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('listings')
    .insert({
      buyer_id: params.buyerId,
      category_id: params.categoryId,
      title: params.title,
      make: params.make,
      model: params.model,
      year: params.year,
      mileage: params.mileage,
      asking_price: params.askingPrice,
      location_wilaya: params.locationWilaya,
      location_commune: params.locationCommune,
      description: params.description,
      photos: params.photos || []
    })
    .select()
    .single();

  if (error) throw error;
  return data as Listing;
}

export async function createBookingRequest(params: {
  listingId: string;
  buyerId: string;
  expertId: string;
  serviceId: string;
  locationAddress: string;
  priceTotal: number;
}): Promise<Booking> {
  const supabase = getSupabaseClient();
  
  const commissionPlatform = Math.round(params.priceTotal * 0.15);
  const expertPayout = params.priceTotal - commissionPlatform;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      listing_id: params.listingId,
      buyer_id: params.buyerId,
      expert_id: params.expertId,
      service_id: params.serviceId,
      location_address: params.locationAddress,
      price_total: params.priceTotal,
      commission_platform: commissionPlatform,
      expert_payout: expertPayout,
      status: 'BOOKING_REQUESTED'
    })
    .select()
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function getBuyerReport(bookingId: string): Promise<InspectionReport | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('is_published', true)
    .maybeSingle();

  if (error) throw error;
  return data as InspectionReport;
}
