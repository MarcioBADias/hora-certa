import { useMemo } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useClockPunches } from '@/hooks/useClockPunches';
import { useSettings } from '@/hooks/useSettings';
import { calculateDay, calculateMonthSummary, getDaysInMonth, addDays, DayCalculation } from '@/lib/calculations';
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
  expiresAt: string;
  dailyDetails: DayDetail[];
}

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function useBankCredits() {
  const { entries } = useTimeEntries();
  const { punches } = useClockPunches();
  const { settings } = useSettings();

  const credits = useMemo((): BankCredit[] => {
    if (!settings || (entries.length === 0 && punches.length === 0)) return [];

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

    // Group by month
    const byMonth: Record<string, Record<string, { entry_time: string; exit_time: string }[]>> = {};
    for (const [date, dateEntries] of Object.entries(unifiedByDate)) {
      const monthKey = date.substring(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = {};
      byMonth[monthKey][date] = dateEntries;
    }

    const result: BankCredit[] = [];

    for (const [monthKey, entriesByDate] of Object.entries(byMonth)) {
      const [y, m] = monthKey.split('-').map(Number);
      const days = getDaysInMonth(y, m - 1);

      const dayCalcs: DayCalculation[] = [];
      const dayDetailMap: Record<string, DayCalculation> = {};

      for (const d of days) {
        const dateStr = d.toISOString().split('T')[0];
        const dayEntries = entriesByDate[dateStr] || [];
        if (dayEntries.length === 0) continue;
        const calc = calculateDay(dateStr, dayEntries, settings);
        dayCalcs.push(calc);
        dayDetailMap[dateStr] = calc;
      }

      const summary = calculateMonthSummary(dayCalcs, settings);

      if (summary.bankOvertimeHours > 0) {
        const lastDay = new Date(y, m, 0);
        const expiresAt = addDays(lastDay, settings.bank_expiration_days);

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
          monthLabel: `${MONTH_LABELS[m - 1]} ${y}`,
          bankHours: summary.bankOvertimeHours,
          expiresAt: expiresAt.toISOString().split('T')[0],
          dailyDetails,
        });
      }
    }

    return result.sort((a, b) => a.month.localeCompare(b.month));
  }, [entries, punches, settings]);

  return { credits };
}
