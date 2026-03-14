import { useMemo } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useClockPunches } from '@/hooks/useClockPunches';
import { useSettings } from '@/hooks/useSettings';
import { calculateDay, calculateMonthSummary, getDaysInMonth, addDays } from '@/lib/calculations';
import { punchesToEntries } from '@/lib/punchesToEntries';

export interface BankCredit {
  month: string; // "2026-02"
  monthLabel: string;
  bankHours: number;
  expiresAt: string;
}

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function useBankCredits() {
  const { entries } = useTimeEntries();
  const { punches } = useClockPunches();
  const { settings } = useSettings();

  const credits = useMemo((): BankCredit[] => {
    if (!settings || (entries.length === 0 && punches.length === 0)) return [];

    // Build unified entries (manual + converted punches) grouped by date
    const unifiedByDate: Record<string, { entry_time: string; exit_time: string }[]> = {};

    // Add manual entries
    for (const e of entries) {
      if (!unifiedByDate[e.date]) unifiedByDate[e.date] = [];
      unifiedByDate[e.date].push({ entry_time: e.entry_time, exit_time: e.exit_time });
    }

    // Add converted clock punches
    const punchesByDate: Record<string, typeof punches> = {};
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

      const dayCalcs = days
        .map(d => {
          const dateStr = d.toISOString().split('T')[0];
          const dayEntries = entriesByDate[dateStr] || [];
          if (dayEntries.length === 0) return null;
          return calculateDay(dateStr, dayEntries, settings);
        })
        .filter(Boolean) as any[];

      const summary = calculateMonthSummary(dayCalcs, settings);

      if (summary.bankOvertimeHours > 0) {
        const lastDay = new Date(y, m, 0);
        const expiresAt = addDays(lastDay, settings.bank_expiration_days);

        result.push({
          month: monthKey,
          monthLabel: `${MONTH_LABELS[m - 1]} ${y}`,
          bankHours: summary.bankOvertimeHours,
          expiresAt: expiresAt.toISOString().split('T')[0],
        });
      }
    }

    return result.sort((a, b) => a.month.localeCompare(b.month));
  }, [entries, punches, settings]);

  return { credits };
}
