/**
 * P5 — Adapter de stockage Auth chunké pour Expo SecureStore.
 *
 * SecureStore limite chaque valeur (~2048 octets) alors qu'une session
 * Supabase sérialisée peut dépasser cette taille. L'adapter découpe donc
 * en chunks déterministes. Aucun mot de passe n'y transite (tokens Auth
 * uniquement). Aucun import Expo ici : l'implémentation est injectée,
 * ce qui rend l'adapter testable en pur.
 */

export interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface AuthStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const SECURE_STORE_CHUNK_SIZE = 1500;

const chunksKey = (key: string) => `${key}.__chunks`;
const chunkKey = (key: string, index: number) => `${key}.__c${index}`;

export function createChunkedSecureStore(
  secureStore: SecureStoreLike,
  chunkSize: number = SECURE_STORE_CHUNK_SIZE
): AuthStorageLike {
  return {
    async getItem(key: string): Promise<string | null> {
      const countRaw = await secureStore.getItemAsync(chunksKey(key));
      if (countRaw === null) return null;
      const count = parseInt(countRaw, 10);
      if (!Number.isFinite(count) || count <= 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await secureStore.getItemAsync(chunkKey(key, i));
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    },

    async setItem(key: string, value: string): Promise<void> {
      const parts: string[] = [];
      for (let i = 0; i < value.length; i += chunkSize) {
        parts.push(value.slice(i, i + chunkSize));
      }
      await secureStore.setItemAsync(chunksKey(key), String(parts.length));
      for (let i = 0; i < parts.length; i++) {
        await secureStore.setItemAsync(chunkKey(key, i), parts[i]);
      }
    },

    async removeItem(key: string): Promise<void> {
      const countRaw = await secureStore.getItemAsync(chunksKey(key));
      const count = countRaw === null ? 0 : parseInt(countRaw, 10);
      if (Number.isFinite(count) && count > 0) {
        for (let i = 0; i < count; i++) {
          await secureStore.deleteItemAsync(chunkKey(key, i));
        }
      }
      await secureStore.deleteItemAsync(chunksKey(key));
    },
  };
}
