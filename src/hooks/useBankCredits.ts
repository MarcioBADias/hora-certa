import { useMemo } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useClockPunches } from '@/hooks/useClockPunches';
import { useSettings } from '@/hooks/useSettings';
import { useHourBank } from '@/hooks/useHourBank';
import { calculateDay, calculateMonthSummary, getDaysInMonth, addDays, DayCalculation, getPayrollMonthRange } from '@/lib/calculations';
import { punchesToEntries } from '@/lib/punchesToEntries';
import { ClockPunch } from '@/hooks/useClockPunches';

export interface DayDetail {
  date: string;
  overtimeHours: number;
  netWorkedHours: number;
  regularHours: number;
  punches: ClockPunch[];
  manualEntries: { entry_time: string; exit_time: string }[];
}

export interface BankCredit {
  month: string; // "2026-02"
  monthLabel: string;
  bankHours: number;
  totalOvertimeHours: number;
  paidOvertimeHours: number;
  customPaidHours: number | null; // null = default from settings
  expiresAt: string;
  dailyDetails: DayDetail[];
}

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function useBankCredits() {
  const { entries } = useTimeEntries();
  const { punches } = useClockPunches();
  const { settings } = useSettings();
  const { entries: bankEntries } = useHourBank();

  // Paid overrides stored in hour_bank with type='paid_override'
  const paidOverrides = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of bankEntries) {
      if (e.type === 'paid_override') {
        // date is first of the month, e.g. "2026-01-01"
        const monthKey = e.date.substring(0, 7);
        map[monthKey] = e.hours;
      }
    }
    return map;
  }, [bankEntries]);

  const credits = useMemo((): BankCredit[] => {
    if (!settings || (entries.length === 0 && punches.length === 0)) return [];

    const closingDay = settings.closing_day;

    // Build unified entries grouped by date
    const unifiedByDate: Record<string, { entry_time: string; exit_time: string }[]> = {};
    const manualByDate: Record<string, { entry_time: string; exit_time: string }[]> = {};
    const punchesByDate: Record<string, ClockPunch[]> = {};

    for (const e of entries) {
      if (!unifiedByDate[e.date]) unifiedByDate[e.date] = [];
      if (!manualByDate[e.date]) manualByDate[e.date] = [];
      unifiedByDate[e.date].push({ entry_time: e.entry_time, exit_time: e.exit_time });
      manualByDate[e.date].push({ entry_time: e.entry_time, exit_time: e.exit_time });
    }

    for (const p of punches) {
      if (!punchesByDate[p.date]) punchesByDate[p.date] = [];
      punchesByDate[p.date].push(p);
    }
    for (const [date, dayPunches] of Object.entries(punchesByDate)) {
      const converted = punchesToEntries(dayPunches);
      if (converted.length > 0) {
        if (!unifiedByDate[date]) unifiedByDate[date] = [];
        unifiedByDate[date].push(...converted);
      }
    }

    // Determine which payroll months are covered
    const allDates = Object.keys(unifiedByDate).sort();
    if (allDates.length === 0) return [];

    // Map each date to its payroll month
    const dateToPayrollMonth = (dateStr: string): { year: number; month: number; key: string } => {
      const d = new Date(dateStr + 'T12:00:00');
      if (!closingDay) {
        return { year: d.getFullYear(), month: d.getMonth(), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
      }
      // If day <= closingDay, belongs to current calendar month
      // If day > closingDay, belongs to next calendar month
      if (d.getDate() <= closingDay) {
        return { year: d.getFullYear(), month: d.getMonth(), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
      } else {
        const nextMonth = d.getMonth() + 1;
        const nextYear = nextMonth > 11 ? d.getFullYear() + 1 : d.getFullYear();
        const nm = nextMonth > 11 ? 0 : nextMonth;
        return { year: nextYear, month: nm, key: `${nextYear}-${String(nm + 1).padStart(2, '0')}` };
      }
    };

    // Group entries by payroll month
    const byPayrollMonth: Record<string, { year: number; month: number; entriesByDate: Record<string, { entry_time: string; exit_time: string }[]> }> = {};
    for (const [date, dateEntries] of Object.entries(unifiedByDate)) {
      const pm = dateToPayrollMonth(date);
      if (!byPayrollMonth[pm.key]) {
        byPayrollMonth[pm.key] = { year: pm.year, month: pm.month, entriesByDate: {} };
      }
      byPayrollMonth[pm.key].entriesByDate[date] = dateEntries;
    }

    const result: BankCredit[] = [];

    for (const [monthKey, { year: y, month: m, entriesByDate: monthEntries }] of Object.entries(byPayrollMonth)) {
      const dayCalcs: DayCalculation[] = [];
      const dayDetailMap: Record<string, DayCalculation> = {};

      for (const [dateStr, dayEntries] of Object.entries(monthEntries)) {
        if (dayEntries.length === 0) continue;
        const calc = calculateDay(dateStr, dayEntries, settings);
        dayCalcs.push(calc);
        dayDetailMap[dateStr] = calc;
      }

      const summary = calculateMonthSummary(dayCalcs, settings);

      // Check for paid override
      const customPaid = paidOverrides[monthKey] ?? null;
      const maxPaid = customPaid ?? settings.max_monthly_paid_overtime;
      const paidOvertimeHours = Math.min(summary.totalOvertimeHours, maxPaid);
      const bankOvertimeHours = Math.max(0, summary.totalOvertimeHours - maxPaid);

      if (bankOvertimeHours > 0) {
        const { end: monthEnd } = getPayrollMonthRange(y, m, closingDay);
        const expiresAt = addDays(monthEnd, settings.bank_expiration_days);

        // Build daily details for days with overtime
        const dailyDetails: DayDetail[] = [];
        for (const [dateStr, calc] of Object.entries(dayDetailMap)) {
          if (calc.overtimeHours > 0) {
            dailyDetails.push({
              date: dateStr,
              overtimeHours: calc.overtimeHours,
              netWorkedHours: calc.netWorkedHours,
              regularHours: calc.regularHours,
              punches: punchesByDate[dateStr] || [],
              manualEntries: manualByDate[dateStr] || [],
            });
          }
        }
        dailyDetails.sort((a, b) => a.date.localeCompare(b.date));

        result.push({
          month: monthKey,
          monthLabel: `${MONTH_LABELS[m]} ${y}`,
          bankHours: Math.round(bankOvertimeHours * 100) / 100,
          totalOvertimeHours: Math.round(summary.totalOvertimeHours * 100) / 100,
          paidOvertimeHours: Math.round(paidOvertimeHours * 100) / 100,
          customPaidHours: customPaid,
          expiresAt: expiresAt.toISOString().split('T')[0],
          dailyDetails,
        });
      }
    }

    return result.sort((a, b) => a.month.localeCompare(b.month));
  }, [entries, punches, settings, paidOverrides]);

  return { credits };
}
