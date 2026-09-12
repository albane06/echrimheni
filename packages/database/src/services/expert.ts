import { getSupabaseClient } from '../client.js';
import { 
  InspectionSection, 
  InspectionItem, 
  ItemStatus, 
  SeverityLevel,
  calculateInspectionScore,
  validateRequiredItemsCompleted,
  AnswerWithItem
} from '@echrimheni/shared';

export async function submitExpertDocuments(params: {
  expertId: string;
  identityDocumentUrl: string;
  identityDocumentType: string;
  identityDocumentNumber: string;
  businessRegistrationUrl: string;
  businessRegistrationNumber: string;
  businessName: string;
  businessActivity: string;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('expert_documents')
    .upsert({
      expert_id: params.expertId,
      identity_document_url: params.identityDocumentUrl,
      identity_document_type: params.identityDocumentType,
      identity_document_number: params.identityDocumentNumber,
      business_registration_url: params.businessRegistrationUrl,
      business_registration_number: params.businessRegistrationNumber,
      business_name: params.businessName,
      business_activity: params.businessActivity,
      verification_status: 'PENDING'
    }, { onConflict: 'expert_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function loadDynamicChecklist(serviceId?: string): Promise<{
  sections: (InspectionSection & { items: InspectionItem[] })[];
}> {
  const supabase = getSupabaseClient();

  let templateQuery = supabase
    .from('inspection_templates')
    .select('id')
    .eq('is_active', true);
  
  if (serviceId) {
    templateQuery = templateQuery.eq('service_id', serviceId);
  }

  const { data: templates, error: tmplError } = await templateQuery.limit(1);
  if (tmplError || !templates || templates.length === 0) {
    throw new Error('Aucun modele d inspection trouve.');
  }

  const templateId = templates[0].id;

  const { data: sections, error: secError } = await supabase
    .from('inspection_sections')
    .select('*')
    .eq('template_id', templateId)
    .order('order_index', { ascending: true });

  if (secError) throw secError;

  const sectionIds = (sections || []).map(s => s.id);
  const { data: items, error: itError } = await supabase
    .from('inspection_items')
    .select('*')
    .in('section_id', sectionIds)
    .order('order_index', { ascending: true });

  if (itError) throw itError;

  const sectionsWithItems = (sections || []).map(sec => ({
    ...sec,
    items: (items || []).filter(it => it.section_id === sec.id) as InspectionItem[]
  }));

  return { sections: sectionsWithItems };
}

export async function startInspection(bookingId: string, expertId: string) {
  const supabase = getSupabaseClient();
  
  const { data: session, error: sessError } = await supabase
    .from('inspection_sessions')
    .insert({
      booking_id: bookingId,
      expert_id: expertId,
      status: 'IN_PROGRESS'
    })
    .select()
    .single();

  if (sessError) throw sessError;

  await supabase.rpc('transition_booking_rpc', {
    p_booking_id: bookingId,
    p_target_status: 'IN_PROGRESS'
  });

  return session;
}

export async function saveInspectionAnswers(
  sessionId: string,
  answers: { item_id: string; status: ItemStatus; severity?: SeverityLevel; comment?: string }[]
) {
  const supabase = getSupabaseClient();
  const rows = answers.map(a => ({
    session_id: sessionId,
    item_id: a.item_id,
    status: a.status,
    severity: a.severity || null,
    comment: a.comment || null
  }));

  const { data, error } = await supabase
    .from('inspection_answers')
    .upsert(rows, { onConflict: 'session_id,item_id' });

  if (error) throw error;
  return data;
}

export async function finalizeAndPublishReport(params: {
  bookingId: string;
  sessionId: string;
  expertId: string;
  summary: string;
  answersWithItems: AnswerWithItem[];
  pdfUrl?: string;
}) {
  const supabase = getSupabaseClient();

  const requiredItems = params.answersWithItems.map(a => a.item);
  const check = validateRequiredItemsCompleted(
    requiredItems, 
    params.answersWithItems.map(a => ({ item_id: a.item.id, status: a.status }))
  );
  if (!check.isValid) {
    throw new Error('Impossible de finaliser : ' + check.missingItems.length + ' point(s) obligatoire(s) non renseigne(s).');
  }

  const scoreResult = calculateInspectionScore(params.answersWithItems);

  const { data: report, error: repError } = await supabase
    .from('reports')
    .upsert({
      booking_id: params.bookingId,
      session_id: params.sessionId,
      score: scoreResult.score,
      summary: params.summary,
      positive_points: scoreResult.positive_points,
      watchpoints: scoreResult.watchpoints,
      major_defects: scoreResult.major_defects,
      critical_defects: scoreResult.critical_defects,
      disclaimer: scoreResult.disclaimer,
      pdf_url: params.pdfUrl || null,
      is_published: true,
      published_at: new Date().toISOString()
    }, { onConflict: 'booking_id' })
    .select()
    .single();

  if (repError) throw repError;

  await supabase
    .from('inspection_sessions')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', params.sessionId);

  await supabase.rpc('transition_booking_rpc', {
    p_booking_id: params.bookingId,
    p_target_status: 'INSPECTION_COMPLETED'
  });
  await supabase.rpc('transition_booking_rpc', {
    p_booking_id: params.bookingId,
    p_target_status: 'REPORT_PENDING'
  });
  await supabase.rpc('transition_booking_rpc', {
    p_booking_id: params.bookingId,
    p_target_status: 'REPORT_READY'
  });

  return report;
}
