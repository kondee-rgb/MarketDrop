/**
 * PromptPay QR payload (Thai QR Payment / EMVCo).
 * Amount is embedded, so the customer's bank app shows the exact total — no typing.
 */

const PROMPTPAY_AID = 'A000000677010111';
const PROMPTPAY_ID_KEY = 'marketdrop_promptpay_id_v1';

export type PromptPayIdKind = 'phone' | 'national_id' | 'ewallet';

/** Digits only; returns the kind or null when it isn't a valid PromptPay target. */
export function classifyPromptPayId(raw: string): { kind: PromptPayIdKind; digits: string } | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) return { kind: 'phone', digits };
  if (/^66\d{9}$/.test(digits)) return { kind: 'phone', digits: '0' + digits.slice(2) };
  if (/^\d{13}$/.test(digits)) return { kind: 'national_id', digits }; // national ID or tax ID
  if (/^\d{15}$/.test(digits)) return { kind: 'ewallet', digits };
  return null;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as required by EMVCo tag 63. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, '0')}${value}`;

export function buildPromptPayPayload(promptPayId: string, amount?: number): string {
  const id = classifyPromptPayId(promptPayId);
  if (!id) throw new Error('เลขพร้อมเพย์ไม่ถูกต้อง');

  const account =
    id.kind === 'phone'
      ? tlv('01', ('0000000000000' + '66' + id.digits.slice(1)).slice(-13)) // 0812345678 → 0066812345678
      : id.kind === 'national_id'
      ? tlv('02', id.digits)
      : tlv('03', id.digits);

  const hasAmount = typeof amount === 'number' && amount > 0;
  const body =
    tlv('00', '01') +
    tlv('01', hasAmount ? '12' : '11') + // 12 = one-time QR with amount, 11 = reusable
    tlv('29', tlv('00', PROMPTPAY_AID) + account) +
    tlv('58', 'TH') +
    tlv('53', '764') + // THB
    (hasAmount ? tlv('54', (Math.round(amount! * 100) / 100).toFixed(2)) : '') +
    '6304';
  return body + crc16(body);
}

/** For display: 081-234-5678 / 1-2345-67890-12-3 with the middle hidden. */
export function maskPromptPayId(raw: string): string {
  const id = classifyPromptPayId(raw);
  if (!id) return '';
  return id.kind === 'phone'
    ? `${id.digits.slice(0, 3)}-xxx-${id.digits.slice(6)}`
    : `${id.digits.slice(0, 1)}-xxxx-xxxxx-${id.digits.slice(-3, -1)}-${id.digits.slice(-1)}`;
}

export function loadPromptPayId(): string {
  try {
    return localStorage.getItem(PROMPTPAY_ID_KEY) || '';
  } catch {
    return '';
  }
}

export function savePromptPayId(id: string): void {
  try {
    localStorage.setItem(PROMPTPAY_ID_KEY, id);
  } catch {
    // ignore
  }
}
