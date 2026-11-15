'use client';

import { useEffect, useRef } from 'react';
import { CLOUD_PIN_KEY, OrderChanges, SYNC_EVENT, SyncResult, syncOnce } from './cloud-sync';

export const SYNC_NOW_EVENT = 'marketdrop:sync-now';
const EVERY_MS = 15000;

export const getCloudPin = () => {
  try {
    return localStorage.getItem(CLOUD_PIN_KEY) || '';
  } catch {
    return '';
  }
};

/**
 * Runs cloud sync while the app is open: on start, every 15 s while visible, when the app comes back
 * to the front, and on demand (SYNC_NOW_EVENT). Each result is broadcast as SYNC_EVENT for the settings card.
 */
export function useCloudSync(
  enabled: boolean,
  onOrders: (ch: OrderChanges) => void,
  onOtherData: () => void
) {
  const cb = useRef({ onOrders, onOtherData });
  cb.current = { onOrders, onOtherData };

  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const run = async () => {
      const pin = getCloudPin();
      if (!pin || running || document.visibilityState !== 'visible') return;
      running = true;
      try {
        let ordersPulled = 0;
        const result: SyncResult = await syncOnce(pin, {
          applyOrders: ch => {
            ordersPulled = ch.upserts.length + ch.deletes.length;
            cb.current.onOrders(ch);
          }
        });
        if (result.pulled > ordersPulled) cb.current.onOtherData(); // settings / shopping changed on another phone
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: result }));
      } finally {
        running = false;
      }
    };
    run();
    const timer = setInterval(run, EVERY_MS);
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(SYNC_NOW_EVENT, run);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(SYNC_NOW_EVENT, run);
    };
  }, [enabled]);
}
