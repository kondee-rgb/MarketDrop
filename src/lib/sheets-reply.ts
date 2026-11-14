/** Turns the Apps Script web app's raw reply into ok/not-ok plus a Thai message the user can act on. */
export function interpretSheetsReply(status: number, text: string): { ok: boolean; message: string } {
  let json: { status?: string; message?: string } | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (json?.status === 'success') return { ok: true, message: `บันทึกลง Google Sheets แล้ว${json.message ? ` (${json.message})` : ''}` };
  if (json?.status === 'error') return { ok: false, message: `สคริปต์ในชีตแจ้งข้อผิดพลาด: ${json.message || 'ไม่ทราบสาเหตุ'}` };

  // HTML page instead of JSON: Google's own sign-in / access-denied / missing-script screens
  if (status === 401 || status === 403 || /การเข้าถึงถูกปฏิเสธ|Access denied|ServiceLogin|accounts\.google\.com/i.test(text)) {
    return {
      ok: false,
      message: 'ชีตไม่ยอมรับข้อมูล: ตอน Deploy ให้ตั้ง "ผู้มีสิทธิ์เข้าถึง" เป็น "ทุกคน" (Anyone) แล้ว Deploy ใหม่'
    };
  }
  if (/Script function not found|doPost/i.test(text)) {
    return { ok: false, message: 'ไม่พบฟังก์ชัน doPost ในสคริปต์ — วางโค้ดใหม่จากหน้าตั้งค่าแล้ว Deploy ใหม่' };
  }
  return { ok: false, message: `Google Sheets ตอบกลับไม่ถูกต้อง (HTTP ${status}) — ตรวจลิงก์ Webhook อีกครั้ง` };
}
