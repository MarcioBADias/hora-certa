import { Json } from '@/integrations/supabase/types';

export interface WorkDay {
  day: number; // 0=Sun, 1=Mon, ..., 6=Sat
  hours: number;
}

export interface UserSettings {
  weekly_hours: number;
  work_days: WorkDay[];
  opening_time: string;
  closing_time: string;
  max_daily_overtime: number;
  max_monthly_paid_overtime: number;
  bank_expiration_days: number;
  break_threshold_hours: number;
  break_duration_hours: number;
  hourly_rate: number | null;
}

export interface DayCalculation {
  date: string;
  totalWorkedMinutes: number;
  breakDeducted: boolean;
  netWorkedHours: number;
  regularHours: number;
  overtimeHours: number;
  isWorkDay: boolean;
  dayOfWeek: number;
}

export function parseWorkDays(json: Json): WorkDay[] {
  if (Array.isArray(json)) {
    return json.map((item: any) => ({ day: item.day, hours: item.hours }));
  }
  return [{ day: 3, hours: 7 }, { day: 4, hours: 7 }, { day: 5, hours: 6 }];
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function formatHoursMinutes(decimalHours: number): string {
  const negative = decimalHours < 0;
  const abs = Math.abs(decimalHours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${negative ? '-' : ''}${h}h${m.toString().padStart(2, '0')}`;
}

export function getRegularHoursForDay(dayOfWeek: number, workDays: WorkDay[]): number {
  const wd = workDays.find(w => w.day === dayOfWeek);
  return wd ? wd.hours : 0;
}

export function calculateDay(
  date: string,
  entries: { entry_time: string; exit_time: string }[],
  settings: UserSettings
): DayCalculation {
  const d = new Date(date + 'T12:00:00');
  const dayOfWeek = d.getDay();
  const workDays = settings.work_days;
  const regularHours = getRegularHoursForDay(dayOfWeek, workDays);
  const isWorkDay = regularHours > 0;

  let totalWorkedMinutes = 0;
  for (const entry of entries) {
    const start = timeToMinutes(entry.entry_time);
    const end = timeToMinutes(entry.exit_time);
    if (end > start) {
      totalWorkedMinutes += end - start;
    }
  }

  const grossHours = minutesToHours(totalWorkedMinutes);
  const breakDeducted = grossHours >= settings.break_threshold_hours;
  const netWorkedHours = breakDeducted ? grossHours - settings.break_duration_hours : grossHours;

  let overtimeHours = 0;
  if (isWorkDay) {
    overtimeHours = Math.max(0, netWorkedHours - regularHours);
    overtimeHours = Math.min(overtimeHours, settings.max_daily_overtime);
  } else {
    // Working on a non-work day = all hours are overtime
    overtimeHours = Math.min(netWorkedHours, settings.max_daily_overtime);
  }

  return {
    date,
    totalWorkedMinutes,
    breakDeducted,
    netWorkedHours: Math.max(0, netWorkedHours),
    regularHours: isWorkDay ? Math.min(netWorkedHours, regularHours) : 0,
    overtimeHours,
    isWorkDay,
    dayOfWeek,
  };
}

export interface MonthSummary {
  totalWorkedHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  paidOvertimeHours: number;
  bankOvertimeHours: number;
  estimatedOvertimePay: number | null;
}

export function calculateMonthSummary(
  dayCalculations: DayCalculation[],
  settings: UserSettings
): MonthSummary {
  const totalWorkedHours = dayCalculations.reduce((s, d) => s + d.netWorkedHours, 0);
  const totalRegularHours = dayCalculations.reduce((s, d) => s + d.regularHours, 0);
  const totalOvertimeHours = dayCalculations.reduce((s, d) => s + d.overtimeHours, 0);
  
  const paidOvertimeHours = Math.min(totalOvertimeHours, settings.max_monthly_paid_overtime);
  const bankOvertimeHours = Math.max(0, totalOvertimeHours - settings.max_monthly_paid_overtime);
  
  const estimatedOvertimePay = settings.hourly_rate
    ? Math.round(paidOvertimeHours * settings.hourly_rate * 100) / 100
    : null;

  return {
    totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
    totalRegularHours: Math.round(totalRegularHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    paidOvertimeHours: Math.round(paidOvertimeHours * 100) / 100,
    bankOvertimeHours: Math.round(bankOvertimeHours * 100) / 100,
    estimatedOvertimePay,
  };
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isExpiringSoon(expiresAt: string, thresholdDays: number = 15): boolean {
  const expDate = new Date(expiresAt);
  const now = new Date();
  const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= thresholdDays && diffDays >= 0;
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function daysUntilExpiration(expiresAt: string): number {
  const expDate = new Date(expiresAt);
  const now = new Date();
  return Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
