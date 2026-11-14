'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, MapPin, Navigation, Repeat, LocateFixed, Check } from 'lucide-react';
import {
  Place,
  TripPlan,
  LegMemory,
  buildTripLegs,
  tripTotalKm,
  legKey,
  parseLatLng,
  buildMapsDirectionsUrl,
  loadPlaces,
  savePlaces,
  loadTrip,
  saveTrip,
  loadLegMemory,
  saveLegMemory,
  DEFAULT_PLACES,
  DEFAULT_TRIP
} from '@/lib/trip';

interface TripPlannerProps {
  onTotalKmChange: (km: number) => void;
}

type RowTarget = 'start' | number; // number = index in stopIds

export function TripPlanner({ onTotalKmChange }: TripPlannerProps) {
  const [places, setPlaces] = useState<Place[]>(DEFAULT_PLACES);
  const [plan, setPlan] = useState<TripPlan>(DEFAULT_TRIP);
  const [memory, setMemory] = useState<LegMemory>({});
  const [editingLeg, setEditingLeg] = useState<string | null>(null);
  const [legDraft, setLegDraft] = useState('');
  const [addingFor, setAddingFor] = useState<RowTarget | null>(null);
  const [newName, setNewName] = useState('');
  const [newCoords, setNewCoords] = useState('');
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  useEffect(() => {
    setPlaces(loadPlaces());
    setPlan(loadTrip());
    setMemory(loadLegMemory());
  }, []);

  const legs = useMemo(() => buildTripLegs(plan, places, memory), [plan, places, memory]);
  const totalKm = tripTotalKm(legs);
  const missingCount = legs.filter(l => l.source === 'missing').length;
  const mapsUrl = buildMapsDirectionsUrl(plan, places);

  useEffect(() => {
    onTotalKmChange(totalKm);
  }, [totalKm, onTotalKmChange]);

  const nameOf = (id: string) => places.find(p => p.id === id)?.name || '—';

  const updatePlan = (next: TripPlan) => {
    setPlan(next);
    saveTrip(next);
  };

  const updatePlaces = (next: Place[]) => {
    setPlaces(next);
    savePlaces(next);
  };

  const setRowPlace = (target: RowTarget, id: string) => {
    if (target === 'start') updatePlan({ ...plan, startId: id });
    else updatePlan({ ...plan, stopIds: plan.stopIds.map((s, i) => (i === target ? id : s)) });
  };

  const handleSelect = (target: RowTarget, value: string) => {
    if (value === '__new') {
      setAddingFor(target);
      setNewName('');
      setNewCoords('');
      setGeoMsg(null);
    } else {
      setRowPlace(target, value);
    }
  };

  const locate = (onFound: (lat: number, lng: number) => void) => {
    if (!navigator.geolocation) {
      setGeoMsg('เครื่องนี้ใช้ตำแหน่งไม่ได้');
      return;
    }
    setGeoMsg('กำลังหาตำแหน่ง...');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoMsg(null);
        onFound(Math.round(pos.coords.latitude * 1e6) / 1e6, Math.round(pos.coords.longitude * 1e6) / 1e6);
      },
      () => setGeoMsg('ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const coordsValid = !newCoords.trim() || parseLatLng(newCoords) !== null;

  const handleAddPlace = () => {
    const name = newName.trim();
    if (!name || addingFor === null || !coordsValid) return;
    const coords = parseLatLng(newCoords);
    const place: Place = { id: `p-${Date.now()}`, name, ...(coords || {}) };
    updatePlaces([...places, place]);
    setRowPlace(addingFor, place.id);
    setAddingFor(null);
  };

  const pinHere = (id: string) =>
    locate((lat, lng) => updatePlaces(places.map(p => (p.id === id ? { ...p, lat, lng } : p))));

  const saveLeg = (key: string) => {
    const km = parseFloat(legDraft);
    if (Number.isFinite(km) && km >= 0) {
      const next = { ...memory, [key]: Math.round(km * 10) / 10 };
      setMemory(next);
      saveLegMemory(next);
    }
    setEditingLeg(null);
  };

  // rows: start, stops..., (back to start)
  const rows: { target: RowTarget | 'end'; id: string }[] = [
    { target: 'start', id: plan.startId },
    ...plan.stopIds.map((id, i) => ({ target: i as RowTarget, id })),
    ...(plan.roundTrip && plan.stopIds.length ? [{ target: 'end' as const, id: plan.startId }] : [])
  ];

  const renderLeg = (index: number) => {
    const leg = legs[index];
    if (!leg) return null;
    const key = legKey(leg.fromId, leg.toId);
    const isEditing = editingLeg === key;
    return (
      <div className="flex items-center gap-3 py-1 pl-[7px]">
        <span className="w-px self-stretch bg-slate-200 ml-[4px]" />
        {isEditing ? (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="0.1"
              value={legDraft}
              onChange={e => setLegDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveLeg(key)}
              className="w-20 px-2.5 py-1 text-sm rounded-lg border border-slate-300 bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <span className="text-xs text-slate-500">กม.</span>
            <button
              type="button"
              onClick={() => saveLeg(key)}
              aria-label="บันทึกระยะทาง"
              className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingLeg(key);
              setLegDraft(leg.km ? String(leg.km) : '');
            }}
            className={`text-xs px-2.5 py-1 rounded-full tabular-nums ${
              leg.source === 'missing'
                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {leg.source === 'missing'
              ? 'แตะเพื่อใส่ระยะทาง'
              : `${leg.source === 'estimate' ? '≈ ' : ''}${leg.km} กม.`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        {rows.map((row, i) => {
          const isEnd = row.target === 'end';
          const place = places.find(p => p.id === row.id);
          return (
            <React.Fragment key={`${row.target}-${i}`}>
              {i > 0 && renderLeg(i - 1)}
              <div className="flex items-center gap-3">
                <span
                  className={`w-[11px] h-[11px] rounded-full shrink-0 ${
                    row.target === 'start' || isEnd ? 'bg-emerald-600' : 'bg-white ring-2 ring-slate-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] text-slate-400 leading-none mb-1">
                    {row.target === 'start' ? 'เริ่มจาก' : isEnd ? 'กลับมาที่' : `จุดแวะ ${(row.target as number) + 1}`}
                  </p>
                  {isEnd ? (
                    <p className="text-sm font-medium text-slate-800 py-1.5">{nameOf(row.id)}</p>
                  ) : (
                    <select
                      value={row.id}
                      onChange={e => handleSelect(row.target as RowTarget, e.target.value)}
                      className="w-full bg-slate-50 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 border-0 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      {places.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                      <option value="__new">+ เพิ่มสถานที่ใหม่…</option>
                    </select>
                  )}
                </div>
                {!isEnd && (
                  <button
                    type="button"
                    onClick={() => pinHere(row.id)}
                    title="บันทึกตำแหน่งปัจจุบันเป็นพิกัดของที่นี่"
                    aria-label={`ตั้งพิกัด ${place?.name || ''} จากตำแหน่งปัจจุบัน`}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      place?.lat !== undefined ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                )}
                {typeof row.target === 'number' && (
                  <button
                    type="button"
                    onClick={() =>
                      updatePlan({ ...plan, stopIds: plan.stopIds.filter((_, j) => j !== row.target) })
                    }
                    aria-label="ลบจุดแวะ"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {addingFor === row.target && !isEnd && (
                <div className="ml-6 mt-2 mb-1 p-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="ชื่อสถานที่ เช่น ตลาดบางปะกอก"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white ring-1 ring-slate-200 border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <div className="flex gap-2">
                    <input
                      value={newCoords}
                      onChange={e => setNewCoords(e.target.value)}
                      placeholder="วางลิงก์ Google Maps หรือพิกัด (ไม่บังคับ)"
                      className={`flex-1 min-w-0 px-3 py-2 text-xs rounded-xl bg-white border-0 ring-1 focus:outline-none focus:ring-2 ${
                        coordsValid ? 'ring-slate-200 focus:ring-emerald-500/40' : 'ring-rose-300 focus:ring-rose-400/40'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => locate((lat, lng) => setNewCoords(`${lat}, ${lng}`))}
                      aria-label="ใช้ตำแหน่งปัจจุบัน"
                      className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 text-slate-600 flex items-center justify-center shrink-0"
                    >
                      <LocateFixed className="w-4 h-4" />
                    </button>
                  </div>
                  {(geoMsg || !coordsValid) && (
                    <p className="text-[11px] text-slate-500">
                      {geoMsg || 'อ่านพิกัดจากลิงก์นี้ไม่ได้ — ลิงก์แบบย่อ (maps.app.goo.gl) ให้เปิดในเบราว์เซอร์ก่อนแล้วคัดลอกลิงก์เต็ม'}
                    </p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setAddingFor(null)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 rounded-lg"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPlace}
                      disabled={!newName.trim() || !coordsValid}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg disabled:opacity-40"
                    >
                      บันทึกสถานที่
                    </button>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const unused = places.find(p => p.id !== plan.startId && !plan.stopIds.includes(p.id));
            updatePlan({ ...plan, stopIds: [...plan.stopIds, unused?.id || 'market'] });
          }}
          className="flex-1 py-2 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          เพิ่มจุดแวะ
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={plan.roundTrip}
          onClick={() => updatePlan({ ...plan, roundTrip: !plan.roundTrip })}
          className={`py-2 px-3 rounded-xl text-sm font-medium flex items-center gap-1.5 ${
            plan.roundTrip ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Repeat className="w-4 h-4" />
          ไป-กลับ
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
        <div>
          <p className="text-[11px] text-slate-500">ระยะทางรวมวันนี้</p>
          <p className="text-xl font-semibold text-slate-900 tabular-nums">
            {totalKm} <span className="text-sm font-normal text-slate-500">กม.</span>
          </p>
          {missingCount > 0 && (
            <p className="text-[11px] text-amber-700">ยังไม่ได้ใส่ระยะ {missingCount} ช่วง</p>
          )}
        </div>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-slate-700 bg-white ring-1 ring-slate-200 rounded-xl px-3 py-2 flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
            ดูใน Google Maps
          </a>
        )}
      </div>
      <p className="text-[10.5px] text-slate-400 leading-snug">
        ระยะที่ใส่ไว้จะจำให้อัตโนมัติ · กดหมุดตอนอยู่ที่นั่นเพื่อให้ประมาณระยะเอง
      </p>
    </div>
  );
}
