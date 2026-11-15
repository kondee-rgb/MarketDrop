'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { normalizeSpokenOrder } from '@/lib/line-parser';

// Minimal typing for the browser speech API (webkit-prefixed on iOS/Chrome)
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Dictate orders in Thai; finished phrases are appended to the paste box as parser-ready lines. */
export function VoiceOrderButton({ onText }: { onText: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recRef.current?.stop(), []);

  const start = () => {
    const rec = getRecognition();
    if (!rec) {
      setError('เบราว์เซอร์นี้ไม่รองรับการพูด ลองใช้ Chrome หรือ Safari');
      return;
    }
    setError(null);
    rec.lang = 'th-TH';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onText(normalizeSpokenOrder(r[0].transcript));
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed') setError('ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setError('ฟังไม่ชัด ลองพูดใหม่อีกครั้ง');
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => recRef.current?.stop();

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        className={`w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 ${
          listening ? 'bg-rose-600 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-800'
        }`}
      >
        {listening ? <Square className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
        {listening ? 'หยุดฟัง' : 'พูดออเดอร์'}
      </button>
      {listening && (
        <p className="text-xs text-slate-500 animate-pulse-subtle" aria-live="polite">
          {interim || 'กำลังฟัง… เช่น “บ้าน 51 ทับ 3 คุณวิภา สั่ง หมูบด 1 กิโล … คนต่อไป …”'}
        </p>
      )}
      {!listening && !error && (
        <p className="text-[11px] text-slate-400">พูดชื่อ แล้วพูด “สั่ง” ตามด้วยของ · เปลี่ยนคนพูด “คนต่อไป”</p>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
