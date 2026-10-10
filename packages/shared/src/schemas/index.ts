import { z } from 'zod';

export const UserRoleSchema = z.enum(['BUYER', 'EXPERT', 'ADMIN']);

export const ExpertVerificationStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']);

export const ItemStatusSchema = z.enum(['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE']);

export const SeverityLevelSchema = z.enum(['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE']);

export const BookingStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'BOOKING_REQUESTED',
  'ACCEPTED',
  'PAYMENT_PENDING',
  'PAID',
  'SCHEDULED',
  'IN_PROGRESS',
  'INSPECTION_COMPLETED',
  'REPORT_PENDING',
  'REPORT_READY',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
  'REJECTED',
  'EXPIRED'
]);

export const ListingSourcePlatformSchema = z.enum([
  'ECHRI',
  'FACEBOOK_MARKETPLACE',
  'OUEDKNISS',
  'OTHER',
]);

export const ListingUrlSchema = z
  .string()
  .trim()
  .max(2048, 'Lien trop long')
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const url = new URL(v);
        return url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Lien invalide (URL HTTPS attendue).' },
  )
  .optional();

export const CreateAutomobileListingSchema = z.object({
  title: z.string().min(3, 'Titre trop court'),
  make: z.string().min(1, 'Marque requise'),
  model: z.string().min(1, 'Modèle requis'),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  mileage: z.number().nonnegative().optional(),
  asking_price: z.number().positive().optional(),
  location_wilaya: z.string().min(2, 'Wilaya requise'),
  location_commune: z.string().min(2, 'Commune requise'),
  description: z.string().optional(),
  photos: z.array(z.string().url()).default([]),
  listing_url: ListingUrlSchema,
  source_platform: ListingSourcePlatformSchema.default('ECHRI'),
});

export const ExpertOnboardingSchema = z.object({
  full_name: z.string().min(3, 'Nom complet requis'),
  phone: z.string().regex(/^(05|06|07)[0-9]{8}$/, 'Numéro de téléphone algérien invalide'),
  wilaya: z.string().min(2, 'Wilaya requise'),
  commune: z.string().min(2, 'Commune requise'),
  specialties: z.array(z.string()).min(1, 'Au moins une spécialité requise'),
  identity_document_type: z.enum(['CNI', 'PASSPORT', 'PERMIS']),
  identity_document_number: z.string().min(5, 'Numéro de pièce requis'),
  identity_document_url: z.string().min(1, 'Document d\'identité obligatoire'),
  business_registration_number: z.string().min(5, 'Numéro de registre de commerce requis'),
  business_registration_url: z.string().min(1, 'Document RC obligatoire'),
  business_name: z.string().min(2, 'Raison sociale requise'),
  business_activity: z.string().min(3, 'Activité déclarée requise')
});

export const AdminVerifyExpertSchema = z.object({
  expert_id: z.string().uuid(),
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  rejection_reason: z.string().optional()
}).refine(
  (data) => data.status !== 'REJECTED' || (!!data.rejection_reason && data.rejection_reason.trim().length > 5),
  {
    message: 'Un motif obligatoire d\'au moins 5 caractères est requis en cas de refus',
    path: ['rejection_reason']
  }
);

export const InspectionAnswerInputSchema = z.object({
  item_id: z.string().uuid(),
  status: ItemStatusSchema,
  severity: SeverityLevelSchema.optional(),
  comment: z.string().optional()
});

export const FinalizeInspectionInputSchema = z.object({
  session_id: z.string().uuid(),
  answers: z.array(InspectionAnswerInputSchema),
  photos: z.array(z.object({
    item_id: z.string().uuid().optional(),
    media_url: z.string().url(),
    caption: z.string().optional()
  })).default([]),
  general_notes: z.string().optional()
});
