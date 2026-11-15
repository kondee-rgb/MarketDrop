/**
 * Trip planner for fuel cost (วางเส้นทางวันนี้: จากไหน → แวะไหน → ไปกลับ)
 * Distance per leg: km the user typed before for that pair (remembered) → else straight-line × road factor
 * when both places have coordinates → else 0 until the user types it once.
 */
import { REAL_LOCATIONS } from './locations';
import { toLocalDateStr } from './historical-profit';

export interface Place {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface TripPlan {
  startId: string;
  stopIds: string[];
  roundTrip: boolean;
  date?: string; // YYYY-MM-DD; stops are for that day only
}

export type LegSource = 'saved' | 'estimate' | 'missing';

export interface TripLeg {
  fromId: string;
  toId: string;
  km: number;
  source: LegSource;
}

export type LegMemory = Record<string, number>;

// shortcut: straight-line × 1.3 approximates city roads; the "open in Google Maps" button gives the real number
export const ROAD_FACTOR = 1.3;

const PLACES_KEY = 'marketdrop_places_v1';
const TRIP_KEY = 'marketdrop_trip_v1';
const LEG_MEMORY_KEY = 'marketdrop_leg_km_v1';

export const DEFAULT_PLACES: Place[] = [
  { id: 'home', name: 'บ้าน' },
  { id: 'market', name: 'ตลาดสด' },
  ...REAL_LOCATIONS.filter(l => l.id !== 'custom').map(l => ({ id: `loc-${l.id}`, name: l.shortName }))
];

export const DEFAULT_TRIP: TripPlan = { startId: 'home', stopIds: [], roundTrip: true };

export function legKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const hasCoords = (p?: Place): p is Place & { lat: number; lng: number } =>
  !!p && typeof p.lat === 'number' && typeof p.lng === 'number';

export function buildTripLegs(plan: TripPlan, places: Place[], memory: LegMemory): TripLeg[] {
  const route = [plan.startId, ...plan.stopIds];
  if (plan.roundTrip && plan.stopIds.length > 0) route.push(plan.startId);

  const byId = new Map(places.map(p => [p.id, p]));
  const legs: TripLeg[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const fromId = route[i];
    const toId = route[i + 1];
    const saved = memory[legKey(fromId, toId)];
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (fromId === toId) {
      legs.push({ fromId, toId, km: 0, source: 'saved' });
    } else if (typeof saved === 'number') {
      legs.push({ fromId, toId, km: saved, source: 'saved' });
    } else if (hasCoords(from) && hasCoords(to)) {
      legs.push({ fromId, toId, km: Math.round(haversineKm(from, to) * ROAD_FACTOR * 10) / 10, source: 'estimate' });
    } else {
      legs.push({ fromId, toId, km: 0, source: 'missing' });
    }
  }
  return legs;
}

export function tripTotalKm(legs: TripLeg[]): number {
  return Math.round(legs.reduce((s, l) => s + l.km, 0) * 10) / 10;
}

/** Reads coordinates from a pasted Google Maps URL or a "lat, lng" string. Short links (maps.app.goo.gl) can't be read offline. */
export function parseLatLng(text: string): { lat: number; lng: number } | null {
  const m =
    text.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
    text.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i) ||
    text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    text.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function buildMapsDirectionsUrl(plan: TripPlan, places: Place[]): string | null {
  const byId = new Map(places.map(p => [p.id, p]));
  const route = [plan.startId, ...plan.stopIds];
  if (plan.roundTrip && plan.stopIds.length > 0) route.push(plan.startId);
  if (route.length < 2) return null;
  const label = (id: string) => {
    const p = byId.get(id);
    return hasCoords(p) ? `${p.lat},${p.lng}` : p?.name || id;
  };
  const params = new URLSearchParams({ api: '1' });
  // No coordinates for the start ("บ้าน") → leave origin out; Google Maps then starts from where the phone is
  if (hasCoords(byId.get(route[0]))) params.set('origin', label(route[0]));
  params.set('destination', label(route[route.length - 1]));
  params.set('travelmode', 'driving');
  const middle = route.slice(1, -1);
  if (middle.length) params.set('waypoints', middle.map(label).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode
  }
}

export const loadPlaces = () => load<Place[]>(PLACES_KEY, DEFAULT_PLACES);
export const savePlaces = (p: Place[]) => save(PLACES_KEY, p);
/** Today's trip. A new day keeps the start place and round-trip choice but starts with no stops. */
export function loadTrip(today: string = toLocalDateStr()): TripPlan {
  const saved = { ...DEFAULT_TRIP, ...load<Partial<TripPlan>>(TRIP_KEY, {}) };
  return saved.date === today ? saved : { ...saved, stopIds: [], date: today };
}
export const saveTrip = (t: TripPlan) => save(TRIP_KEY, { ...t, date: t.date || toLocalDateStr() });
export const loadLegMemory = () => load<LegMemory>(LEG_MEMORY_KEY, {});
export const saveLegMemory = (m: LegMemory) => save(LEG_MEMORY_KEY, m);

/* Whole-route distance read off Google Maps, remembered per route (overrides the per-leg estimate) */
const ROUTE_KM_KEY = 'marketdrop_route_km_v1';

export function routeKey(plan: TripPlan): string {
  const route = [plan.startId, ...plan.stopIds];
  if (plan.roundTrip && plan.stopIds.length > 0) route.push(plan.startId);
  return route.join('>');
}

export const loadRouteKm = () => load<Record<string, number>>(ROUTE_KM_KEY, {});
export const saveRouteKm = (m: Record<string, number>) => save(ROUTE_KM_KEY, m);
