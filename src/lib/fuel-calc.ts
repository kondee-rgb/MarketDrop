export interface FuelConfig {
  distanceKm: number; // ระยะทางรวมที่ขับ (กิโลเมตร)
  consumptionKmPerLiter: number; // อัตราสิ้นเปลือง (กิโลเมตรต่อลิตร เช่น 14)
  fuelPricePerLiter: number; // ราคาน้ำมัน (บาทต่อลิตร เช่น 38.50)
  otherExpenses: number; // ค่าใช้จ่ายอื่นๆ (ค่าทางด่วน, ค่าจอดรถ, ถุงพลาสติก ฯลฯ)
  otherExpenseNotes?: string; // หมายเหตุค่าใช้จ่ายอื่นๆ
  tripDate?: string; // YYYY-MM-DD the distance / other expenses belong to
}

/** Distance and tolls count only on the day they were entered; a new day starts at 0. */
export function fuelForDay(cfg: FuelConfig, day: string): FuelConfig {
  return cfg.tripDate === day ? cfg : { ...cfg, distanceKm: 0, otherExpenses: 0 };
}

export interface FuelCalculationResult {
  litersUsed: number; // ปริมาณน้ำมันที่ใช้ (ลิตร)
  fuelCost: number; // ค่าน้ำมันรวม (บาท)
  otherExpenses: number; // ค่าใช้จ่ายอื่นๆ (บาท)
  totalExpense: number; // ค่าใช้จ่ายรวมทั้งหมด (บาท)
  costPerKm: number; // ต้นทุนต่อกิโลเมตร (บาท/กม.)
}

export const FUEL_CONFIG_KEY = 'marketdrop_fuel_config_v1';

export const DEFAULT_FUEL_CONFIG: FuelConfig = {
  distanceKm: 0, // comes from the trip planner; 0 = no driving logged yet
  consumptionKmPerLiter: 14,
  fuelPricePerLiter: 38.5,
  otherExpenses: 0,
  otherExpenseNotes: ''
};

// In-memory fallback for SSR / testing environments
let memoryFuelConfig: FuelConfig = { ...DEFAULT_FUEL_CONFIG };

/**
 * โหลดการตั้งค่าค่าน้ำมันจาก localStorage
 */
export function getFuelConfig(): FuelConfig {
  if (typeof window === 'undefined') {
    return { ...memoryFuelConfig };
  }

  try {
    const raw = localStorage.getItem(FUEL_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_FUEL_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_FUEL_CONFIG, ...parsed };
  } catch (err) {
    console.error('Failed to load fuel config from localStorage:', err);
    return { ...DEFAULT_FUEL_CONFIG };
  }
}

/**
 * บันทึกการตั้งค่าค่าน้ำมันลงใน localStorage
 */
export function saveFuelConfig(config: FuelConfig): void {
  const sanitized: FuelConfig = {
    distanceKm: Math.max(0, Number(config.distanceKm) || 0),
    consumptionKmPerLiter: Math.max(0.1, Number(config.consumptionKmPerLiter) || DEFAULT_FUEL_CONFIG.consumptionKmPerLiter),
    fuelPricePerLiter: Math.max(0, Number(config.fuelPricePerLiter) || 0),
    otherExpenses: Math.max(0, Number(config.otherExpenses) || 0),
    otherExpenseNotes: config.otherExpenseNotes || '',
    ...(config.tripDate ? { tripDate: config.tripDate } : {})
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FUEL_CONFIG_KEY, JSON.stringify(sanitized));
    } catch (err) {
      console.error('Failed to save fuel config to localStorage:', err);
    }
  } else {
    memoryFuelConfig = { ...sanitized };
  }
}

/**
 * คำนวณค่าน้ำมันและการเดินทางอย่างละเอียด
 */
export function calculateFuelExpense(config: FuelConfig): FuelCalculationResult {
  const distance = Math.max(0, Number(config.distanceKm) || 0);
  const consumption = Math.max(0.1, Number(config.consumptionKmPerLiter) || 14);
  const fuelPrice = Math.max(0, Number(config.fuelPricePerLiter) || 0);
  const others = Math.max(0, Number(config.otherExpenses) || 0);

  const litersUsed = distance / consumption;
  const fuelCost = Math.round(litersUsed * fuelPrice);
  const totalExpense = fuelCost + others;
  const costPerKm = distance > 0 ? totalExpense / distance : 0;

  return {
    litersUsed: Math.round(litersUsed * 100) / 100,
    fuelCost,
    otherExpenses: others,
    totalExpense,
    costPerKm: Math.round(costPerKm * 100) / 100
  };
}
