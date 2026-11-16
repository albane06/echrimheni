import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * P6.8-B — Garde-fou anti-secrets (aucune dépendance, exécuté en CI via vitest).
 * Échoue si un fichier d'exemple versionné contient une valeur au format
 * secret réel. Les messages ne reproduisent JAMAIS de valeur.
 */
const EXAMPLE_FILES = ['.env.example', 'apps/web-admin/.env.local.example'];

function secretLike(content: string): string | null {
  if (/sb_secret_[A-Za-z0-9_-]+/.test(content)) return 'service-role-like value';
  // JWT compact réel (3 segments) — les placeholders n'en contiennent pas.
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(content)) return 'jwt-like value';
  return null;
}

describe('P6.8-B — aucun secret réel dans les fichiers versionnés', () => {
  for (const file of EXAMPLE_FILES) {
    it(`${file} : placeholders uniquement`, () => {
      const full = path.resolve(process.cwd(), file);
      if (!fs.existsSync(full)) return;
      const content = fs.readFileSync(full, 'utf8');
      expect(secretLike(content)).toBeNull();
    });
  }

  it('.env.example : la ligne service_role reste un placeholder explicite', () => {
    const full = path.resolve(process.cwd(), '.env.example');
    if (!fs.existsSync(full)) return;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    const line = lines.find(l => l.trim().startsWith('SUPABASE_SERVICE_ROLE_KEY='));
    expect(line).toBeDefined();
    expect(line as string).toMatch(/your-service-role-key|example|placeholder|xxx/i);
  });
});
