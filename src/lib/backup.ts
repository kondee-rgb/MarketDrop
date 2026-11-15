/** Save / restore everything the app keeps on this phone (all marketdrop_* keys) as one JSON file. */

const PREFIX = 'marketdrop_';

type KeyStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export interface BackupFile {
  app: 'MarketDrop';
  version: 1;
  savedAt: string;
  data: Record<string, string>;
}

const appKeys = (store: KeyStore) => {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  return keys;
};

export function buildBackup(store: KeyStore = localStorage): BackupFile {
  const data: Record<string, string> = {};
  for (const k of appKeys(store)) data[k] = store.getItem(k) ?? '';
  return { app: 'MarketDrop', version: 1, savedAt: new Date().toISOString(), data };
}

/** Check a file's text is a MarketDrop backup; returns it or an error message. */
export function parseBackup(text: string): BackupFile | string {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return 'ไฟล์นี้ไม่ใช่ไฟล์สำรองของ MarketDrop';
  }
  const b = raw as Partial<BackupFile>;
  if (!b || b.app !== 'MarketDrop' || !b.data || typeof b.data !== 'object') return 'ไฟล์นี้ไม่ใช่ไฟล์สำรองของ MarketDrop';
  const entries = Object.entries(b.data);
  if (!entries.length || entries.some(([k, v]) => !k.startsWith(PREFIX) || typeof v !== 'string')) {
    return 'ไฟล์สำรองเสียหรือไม่ครบ';
  }
  return b as BackupFile;
}

/** Replace this phone's app data with the backup's. */
export function restoreBackup(backup: BackupFile, store: KeyStore = localStorage): number {
  for (const k of appKeys(store)) store.removeItem(k);
  const entries = Object.entries(backup.data);
  for (const [k, v] of entries) store.setItem(k, v);
  return entries.length;
}
