import * as fs from 'fs';
import * as path from 'path';
import { InspectionSection, InspectionItem } from '@echrimheni/shared';

export interface SeedChecklistData {
  sections: (InspectionSection & { items: InspectionItem[] })[];
  items: InspectionItem[];
}

export function findSeedSqlPath(): string {
  // Check common relative paths from root, package, or tests directory
  const candidates = [
    path.resolve(process.cwd(), 'packages/database/supabase/seed.sql'),
    path.resolve(process.cwd(), 'supabase/seed.sql'),
    path.resolve(process.cwd(), '../database/supabase/seed.sql')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  // Fallback: search parents upward
  let cur = process.cwd();
  while (cur !== path.dirname(cur)) {
    const candidate = path.join(cur, 'packages/database/supabase/seed.sql');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    cur = path.dirname(cur);
  }

  throw new Error('Impossible de localiser packages/database/supabase/seed.sql');
}

export function parseSeedTelephoneChecklistFromSql(sql: string): SeedChecklistData {
  // Parse sections for template '33333333-3333-3333-3333-333333333334'
  const sectionRegex = /\(\s*'([0-9a-f-]{36})'\s*,\s*'33333333-3333-3333-3333-333333333334'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*\)/g;
  const sections: (InspectionSection & { items: InspectionItem[] })[] = [];
  let secMatch: RegExpExecArray | null;
  while ((secMatch = sectionRegex.exec(sql)) !== null) {
    sections.push({
      id: secMatch[1],
      template_id: '33333333-3333-3333-3333-333333333334',
      title: secMatch[2],
      order_index: parseInt(secMatch[3], 10),
      items: []
    });
  }

  // Parse items
  const itemRegex = /\(\s*'([0-9a-f-]{36})'\s*,\s*'([0-9a-f-]{36})'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*(\d+)\s*,\s*(true|false)\s*,\s*(\d+)\s*\)/g;
  const allItems: InspectionItem[] = [];
  let itMatch: RegExpExecArray | null;
  while ((itMatch = itemRegex.exec(sql)) !== null) {
    if (itMatch[1].startsWith('55555555-5555-5555-5555-0000000005')) {
      const item: InspectionItem = {
        id: itMatch[1],
        section_id: itMatch[2],
        name: itMatch[3],
        weight: parseInt(itMatch[5], 10),
        is_required: itMatch[6] === 'true',
        order_index: parseInt(itMatch[7], 10),
        possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
        possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE']
      };
      allItems.push(item);
      const sec = sections.find((s) => s.id === item.section_id);
      if (sec) {
        sec.items.push(item);
      }
    }
  }

  return { sections, items: allItems };
}

export function loadSeedTelephoneChecklist(): SeedChecklistData {
  const seedPath = findSeedSqlPath();
  const sql = fs.readFileSync(seedPath, 'utf8');
  return parseSeedTelephoneChecklistFromSql(sql);
}

export function parseSeedApplianceChecklistFromSql(sql: string): SeedChecklistData {
  // Parse sections for template '33333333-3333-3333-3333-333333333335'
  const sectionRegex = /\(\s*'([0-9a-f-]{36})'\s*,\s*'33333333-3333-3333-3333-333333333335'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*\)/g;
  const sections: (InspectionSection & { items: InspectionItem[] })[] = [];
  let secMatch: RegExpExecArray | null;
  while ((secMatch = sectionRegex.exec(sql)) !== null) {
    sections.push({
      id: secMatch[1],
      template_id: '33333333-3333-3333-3333-333333333335',
      title: secMatch[2],
      order_index: parseInt(secMatch[3], 10),
      items: []
    });
  }

  // Parse items with prefix '55555555-5555-5555-5555-0000000008'
  const itemRegex = /\(\s*'([0-9a-f-]{36})'\s*,\s*'([0-9a-f-]{36})'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*(\d+)\s*,\s*(true|false)\s*,\s*(\d+)\s*\)/g;
  const allItems: InspectionItem[] = [];
  let itMatch: RegExpExecArray | null;
  while ((itMatch = itemRegex.exec(sql)) !== null) {
    if (itMatch[1].startsWith('55555555-5555-5555-5555-0000000008')) {
      const item: InspectionItem = {
        id: itMatch[1],
        section_id: itMatch[2],
        name: itMatch[3],
        weight: parseInt(itMatch[5], 10),
        is_required: itMatch[6] === 'true',
        order_index: parseInt(itMatch[7], 10),
        possible_statuses: ['BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE'],
        possible_severities: ['INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE']
      };
      allItems.push(item);
      const sec = sections.find((s) => s.id === item.section_id);
      if (sec) {
        sec.items.push(item);
      }
    }
  }

  return { sections, items: allItems };
}

export function loadSeedApplianceChecklist(): SeedChecklistData {
  const seedPath = findSeedSqlPath();
  const sql = fs.readFileSync(seedPath, 'utf8');
  return parseSeedApplianceChecklistFromSql(sql);
}

