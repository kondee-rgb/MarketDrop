'use client';

import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { loadPlaces, Place } from '@/lib/trip';

const mapsUrl = (p: Place) =>
  typeof p.lat === 'number' && typeof p.lng === 'number'
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}`;

/** Places saved in the trip planner: one tap opens Google Maps directions. */
export function PlaceChips() {
  const [places, setPlaces] = useState<Place[]>([]);
  useEffect(() => setPlaces(loadPlaces().filter(p => p.id !== 'home')), []);
  if (!places.length) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto mt-2.5 -mx-1 px-1 pb-0.5">
      {places.map(p => (
        <a
          key={p.id}
          href={mapsUrl(p)}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium"
        >
          <MapPin className="w-3 h-3 text-emerald-600" aria-hidden="true" />
          {p.name}
        </a>
      ))}
    </div>
  );
}
