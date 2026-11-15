/**
 * Cross-device sync with the cloud store (/api/store).
 * Orders sync one by one (two phones adding orders don't overwrite each other);
 * every other marketdrop_* key syncs as a whole value. Last writer wins per key / per order.
 * Local changes are found by comparing a hash with the last synced version, so the rest of the app
 * keeps writing localStorage exactly as before.
 */
import type { Order } from '@/types/order';

export const CLOUD_PIN_KEY = 'md_cloud_pin'; // no marketdrop_ prefix: never synced or backed up
const STATE_KEY = 'md_sync_state';
export const ORDERS_KEY = 'marketdrop_orders_v4';
export const SYNC_EVENT = 'marketdrop:synced';
// per-phone preferences that should not follow you to another phone
const LOCAL_ONLY = new Set(['marketdrop_sort_pref_v1']);
const OVERLAP_MS = 2 * 60 * 1000; // re-read a little before the last pull so a slow write is never missed

type KeyStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

interface SyncState {
  since: string | null;
  kv: Record<string, string>; // key → hash of the last synced value
  orders: Record<string, string>; // order id → hash of the last synced order
}

export interface OrderChanges {
  upserts: Order[];
  deletes: string[];
}

/** Put pulled orders into a list (new ones appended, changed ones replaced, deleted ones removed). */
export function applyOrderChanges(list: Order[], ch: OrderChanges): Order[] {
  if (!ch.upserts.length && !ch.deletes.length) return list;
  const byId = new Map(ch.upserts.map(o => [o.id, o]));
  // a changed order keeps this phone's stop number
  const out = list
    .filter(o => !ch.deletes.includes(o.id))
    .map(o => (byId.has(o.id) ? { ...byId.get(o.id)!, stopNumber: o.stopNumber } : o));
  const have = new Set(out.map(o => o.id));
  return [...out, ...ch.upserts.filter(o => !have.has(o.id))];
}

export interface SyncResult {
  ok: boolean;
  code?: 'not_configured' | 'bad_pin' | 'offline';
  pulled: number;
  pushed: number;
  at?: string;
}

/** Small string hash (djb2) — enough to notice a change. */
export function hashText(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length}:${h >>> 0}`;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function mergeValue(primary: unknown, secondary: unknown): unknown {
  if (Array.isArray(primary) && Array.isArray(secondary)) {
    const keyOf = (x: unknown) => (isObj(x) && 'id' in x ? `id:${String(x.id)}` : `v:${JSON.stringify(x)}`);
    const have = new Set(primary.map(keyOf));
    return [...primary, ...secondary.filter(x => !have.has(keyOf(x)))];
  }
  if (isObj(primary) && isObj(secondary)) return { ...secondary, ...primary };
  return primary;
}

/** Join two saved JSON values: lists by id (primary wins on the same id), objects key by key (primary wins). */
export function mergeJson(primaryText: string, secondaryText: string): string {
  try {
    const merged = JSON.stringify(mergeValue(JSON.parse(primaryText), JSON.parse(secondaryText)));
    return merged === JSON.stringify(JSON.parse(primaryText)) ? primaryText : merged;
  } catch {
    return primaryText;
  }
}

/** Order fingerprint without stopNumber: each phone numbers its stops in its own sort order. */
const orderSig = (o: Order) => hashText(JSON.stringify({ ...o, stopNumber: 0 }));

const readState = (store: KeyStore): SyncState => {
  try {
    const s = JSON.parse(store.getItem(STATE_KEY) || '');
    return { since: s.since ?? null, kv: s.kv || {}, orders: s.orders || {} };
  } catch {
    return { since: null, kv: {}, orders: {} };
  }
};

const syncedKeys = (store: KeyStore) => {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith('marketdrop_') && k !== ORDERS_KEY && !LOCAL_ONLY.has(k)) keys.push(k);
  }
  return keys;
};

const readOrders = (store: KeyStore): Order[] => {
  try {
    const v = JSON.parse(store.getItem(ORDERS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/** One round: pull what other phones changed, then push what this phone changed. */
export async function syncOnce(
  pin: string,
  deps: {
    store?: KeyStore;
    fetcher?: Fetch;
    /** The app applies pulled orders through its own state (so a pending save can't drop them). */
    applyOrders?: (ch: OrderChanges) => void;
  } = {}
): Promise<SyncResult> {
  const store = deps.store ?? localStorage;
  const fetcher = deps.fetcher ?? fetch;
  const applyOrders =
    deps.applyOrders ?? ((ch: OrderChanges) => store.setItem(ORDERS_KEY, JSON.stringify(applyOrderChanges(readOrders(store), ch))));
  // the PIN is optional: only sent when the shop set one
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(pin ? { 'x-app-pin': pin } : {}) };
  const state = readState(store);
  const firstSync = !state.since;

  // what this phone changed since the last sync (decided before pulling)
  const localKv = new Map(syncedKeys(store).map(k => [k, store.getItem(k) ?? '']));
  const kvDirty = new Set([...localKv].filter(([k, v]) => state.kv[k] !== hashText(v)).map(([k]) => k));
  const local = readOrders(store);
  const orderHash = new Map(local.map(o => [o.id, orderSig(o)]));
  const orderDirty = new Set(local.filter(o => state.orders[o.id] !== orderHash.get(o.id)).map(o => o.id));
  const removed = Object.keys(state.orders).filter(id => !orderHash.has(id));

  let res: Response;
  try {
    const since = state.since ? new Date(Date.parse(state.since) - OVERLAP_MS).toISOString() : '';
    res = await fetcher(`/api/store${since ? `?since=${encodeURIComponent(since)}` : ''}`, { headers, cache: 'no-store' });
  } catch {
    return { ok: false, code: 'offline', pulled: 0, pushed: 0 };
  }
  const pulledBody = await res.json().catch(() => null);
  if (!res.ok || !pulledBody?.success) {
    return { ok: false, code: pulledBody?.code ?? 'offline', pulled: 0, pushed: 0 };
  }

  // 1. apply the cloud's changes. When this phone changed the same list too (or syncs for the first
  //    time), the two are merged — lists join by id — so nobody's price book or regulars get dropped.
  //    An order this phone also changed keeps the phone's version (pushed below), except on the first sync.
  let pulled = 0;
  for (const row of pulledBody.kv as { key: string; value: string }[]) {
    if (LOCAL_ONLY.has(row.key) || row.key === ORDERS_KEY) continue;
    // the same version we already have (re-read in the overlap window): nothing new from the cloud
    if (state.kv[row.key] === hashText(row.value)) continue;
    const mine = store.getItem(row.key);
    let value = row.value;
    if (mine !== null && mine !== row.value && (firstSync || kvDirty.has(row.key))) {
      // first sync: the cloud's settings win, lists are joined; later conflicts: this phone wins, lists joined
      value = firstSync ? mergeJson(row.value, mine) : mergeJson(mine, row.value);
    }
    state.kv[row.key] = hashText(row.value);
    if (value !== row.value) {
      kvDirty.add(row.key); // the merged version goes back up
      localKv.set(row.key, value);
    } else {
      kvDirty.delete(row.key);
    }
    if (mine !== value) {
      store.setItem(row.key, value);
      pulled++;
    }
  }
  const changes: OrderChanges = { upserts: [], deletes: [] };
  for (const row of pulledBody.orders as { id: string; data: Order | null; deleted: boolean }[]) {
    if (!firstSync && (orderDirty.has(row.id) || removed.includes(row.id))) continue;
    orderDirty.delete(row.id);
    if (row.deleted || !row.data) {
      delete state.orders[row.id];
      if (orderHash.has(row.id)) changes.deletes.push(row.id);
      continue;
    }
    const h = orderSig(row.data);
    state.orders[row.id] = h;
    if (orderHash.get(row.id) !== h) changes.upserts.push(row.data);
  }
  if (changes.upserts.length || changes.deletes.length) {
    pulled += changes.upserts.length + changes.deletes.length;
    applyOrders(changes);
  }

  // 2. push this phone's changes
  const kvOut = [...kvDirty].map(key => ({ key, value: localKv.get(key)! }));
  const ordersOut = [
    ...local.filter(o => orderDirty.has(o.id)).map(o => ({ id: o.id, data: o })),
    ...(firstSync ? [] : removed.map(id => ({ id, data: null, deleted: true })))
  ];
  if (kvOut.length || ordersOut.length) {
    let pushRes: Response;
    try {
      pushRes = await fetcher('/api/store', { method: 'POST', headers, body: JSON.stringify({ kv: kvOut, orders: ordersOut }) });
    } catch {
      return { ok: false, code: 'offline', pulled, pushed: 0 };
    }
    if (!pushRes.ok) {
      store.setItem(STATE_KEY, JSON.stringify(state)); // keep what was pulled; push again next round
      return { ok: false, code: 'offline', pulled, pushed: 0 };
    }
    kvOut.forEach(r => (state.kv[r.key] = hashText(r.value)));
    ordersOut.forEach(r => (r.data ? (state.orders[r.id] = orderHash.get(r.id)!) : delete state.orders[r.id]));
  }
  for (const id of removed) delete state.orders[id];

  state.since = pulledBody.now;
  store.setItem(STATE_KEY, JSON.stringify(state));
  return { ok: true, pulled, pushed: kvOut.length + ordersOut.length, at: pulledBody.now };
}

/** Forget sync progress (e.g. after restoring a backup), so the next sync starts fresh. */
export function resetSyncState(store: KeyStore = localStorage) {
  store.removeItem(STATE_KEY);
}
