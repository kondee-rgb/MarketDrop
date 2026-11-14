/**
 * Slip OCR verification (ตรวจสลิปโอนเงินอัตโนมัติ)
 * อ่านสลิปด้วย Gemini Vision แล้วเทียบยอดกับบิล + กันสลิปซ้ำด้วยเลขอ้างอิง
 * หมายเหตุ: OCR ยืนยันได้แค่ "ตัวเลขบนรูป" ไม่ได้ยืนยันว่าเงินเข้าบัญชีจริง
 */

export interface SlipData {
  isSlip: boolean;
  amount: number;
  transRef: string;
  transferredAt: string;
  senderName: string;
  receiverName: string;
  bank: string;
}

export type SlipVerdict = 'MATCH' | 'AMOUNT_MISMATCH' | 'DUPLICATE' | 'NOT_A_SLIP';

export interface SlipEvaluation {
  verdict: SlipVerdict;
  message: string;
  diff: number; // ยอดสลิป - ยอดบิล
}

export function normalizeSlipRef(ref: string): string {
  return (ref || '').replace(/[\s-]/g, '').toUpperCase();
}

/** Coerce raw model JSON into a safe SlipData (model output is untrusted). */
export function sanitizeSlipData(raw: unknown): SlipData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 120) : '');
  const amountNum =
    typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount ?? '').replace(/[^\d.]/g, ''));
  return {
    isSlip: r.isSlip === true,
    amount: Number.isFinite(amountNum) && amountNum > 0 ? Math.round(amountNum * 100) / 100 : 0,
    transRef: str(r.transRef),
    transferredAt: str(r.transferredAt),
    senderName: str(r.senderName),
    receiverName: str(r.receiverName),
    bank: str(r.bank)
  };
}

export function evaluateSlip(
  slip: SlipData,
  expectedAmount: number,
  usedRefs: string[] = []
): SlipEvaluation {
  const diff = Math.round((slip.amount - expectedAmount) * 100) / 100;

  if (!slip.isSlip || slip.amount <= 0) {
    return { verdict: 'NOT_A_SLIP', message: 'อ่านยอดจากรูปไม่ได้ หรือรูปนี้ไม่ใช่สลิปโอนเงิน', diff };
  }

  const ref = normalizeSlipRef(slip.transRef);
  if (ref && usedRefs.some(u => normalizeSlipRef(u) === ref)) {
    return { verdict: 'DUPLICATE', message: `สลิปนี้เคยใช้กับออเดอร์อื่นแล้ว (Ref ${slip.transRef})`, diff };
  }

  if (Math.abs(diff) >= 0.01) {
    return {
      verdict: 'AMOUNT_MISMATCH',
      message:
        diff < 0
          ? `ยอดในสลิปขาดไป ฿${Math.abs(diff).toLocaleString()}`
          : `ยอดในสลิปเกินมา ฿${diff.toLocaleString()}`,
      diff
    };
  }

  return { verdict: 'MATCH', message: 'ยอดตรงกับบิล ✓', diff };
}
