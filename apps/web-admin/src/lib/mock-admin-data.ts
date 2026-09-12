import { ExpertDocument, ExpertProfile, Profile, AdminAction } from '@echrimheni/shared';

export interface ExpertWithDossier {
  profile: Profile;
  expertProfile: ExpertProfile;
  document: ExpertDocument;
}

export const INITIAL_EXPERTS: ExpertWithDossier[] = [
  {
    profile: {
      id: 'exp-001',
      role: 'EXPERT',
      full_name: 'Karim Benali',
      phone: '0550123456',
      created_at: '2026-09-01T10:00:00Z'
    },
    expertProfile: {
      id: 'exp-001',
      bio: 'Mecanicien automobile certifie avec 12 ans d experience.',
      wilaya: 'Alger',
      commune: 'Bab Ezzouar',
      specialties: ['automobile'],
      hourly_rate: 3500,
      fixed_rate: 7000,
      rating_avg: 4.85,
      rating_count: 24,
      created_at: '2026-09-01T10:00:00Z'
    },
    document: {
      id: 'doc-001',
      expert_id: 'exp-001',
      identity_document_url: 'https://private-storage.echrimheni.dz/id/exp-001-cni.pdf',
      identity_document_type: 'CNI',
      identity_document_number: '109823487612',
      business_registration_url: 'https://private-storage.echrimheni.dz/rc/exp-001-rc.pdf',
      business_registration_number: '16/00-0987654B20',
      business_name: 'EURL BENALI DIAGNOSTIC AUTO',
      business_activity: 'Reparation et controle technique mecanique automobile',
      verification_status: 'APPROVED',
      reviewed_by: 'admin-001',
      reviewed_at: '2026-09-02T14:30:00Z',
      created_at: '2026-09-01T10:05:00Z'
    }
  },
  {
    profile: {
      id: 'exp-002',
      role: 'EXPERT',
      full_name: 'Yacine Mansouri',
      phone: '0661987654',
      created_at: '2026-09-10T09:15:00Z'
    },
    expertProfile: {
      id: 'exp-002',
      bio: 'Specialiste carrosserie et mecanique generale.',
      wilaya: 'Blida',
      commune: 'Ouled Yaich',
      specialties: ['automobile'],
      hourly_rate: 3000,
      fixed_rate: 6500,
      rating_avg: 0,
      rating_count: 0,
      created_at: '2026-09-10T09:15:00Z'
    },
    document: {
      id: 'doc-002',
      expert_id: 'exp-002',
      identity_document_url: 'https://private-storage.echrimheni.dz/id/exp-002-cni.pdf',
      identity_document_type: 'CNI',
      identity_document_number: '112233445566',
      business_registration_url: 'https://private-storage.echrimheni.dz/rc/exp-002-rc.pdf',
      business_registration_number: '09/00-1122334A21',
      business_name: 'SARL MANSOURI AUTO SERVICES',
      business_activity: 'Maintenance, diagnostic electronique et carrosserie automobile',
      verification_status: 'PENDING',
      created_at: '2026-09-10T09:20:00Z'
    }
  }
];

export const INITIAL_AUDIT_LOGS: AdminAction[] = [
  {
    id: 'act-001',
    admin_id: 'admin-001',
    action_type: 'EXPERT_APPROVED',
    target_type: 'expert_documents',
    target_id: 'doc-001',
    details: {
      expert_name: 'Karim Benali',
      specialty: 'automobile',
      coherence_verified: true
    },
    created_at: '2026-09-02T14:30:00Z'
  }
];

export const INITIAL_MISSIONS = [
  {
    id: 'mis-001',
    vehicle: 'Volkswagen Golf 7 (2018) 2.0 TDI - 142 000 km',
    buyer_name: 'Sofiane Merad',
    expert_name: 'Karim Benali',
    status: 'COMPLETED',
    score: 92,
    date: '10 Septembre 2026',
    price: '7 000 DZD'
  },
  {
    id: 'mis-002',
    vehicle: 'Renault Clio 4 (2019) 1.5 dCi - 95 000 km',
    buyer_name: 'Amine Belkacem',
    expert_name: 'Karim Benali',
    status: 'IN_PROGRESS',
    score: null,
    date: '12 Septembre 2026',
    price: '7 000 DZD'
  }
];