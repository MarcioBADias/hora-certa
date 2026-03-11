import { useMemo } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useSettings } from '@/hooks/useSettings';
import { calculateDay, calculateMonthSummary, getDaysInMonth, addDays } from '@/lib/calculations';

export interface BankCredit {
  month: string; // "2026-02"
  monthLabel: string;
  bankHours: number;
  expiresAt: string;
}

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function useBankCredits() {
  // Fetch all entries (no date filter)
  const { entries } = useTimeEntries();
  const { settings } = useSettings();

  const credits = useMemo((): BankCredit[] => {
    if (!settings || entries.length === 0) return [];

    // Group entries by month
    const byMonth: Record<string, typeof entries> = {};
    for (const e of entries) {
      const monthKey = e.date.substring(0, 7); // "2026-02"
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(e);
    }

    const result: BankCredit[] = [];

    for (const [monthKey, monthEntries] of Object.entries(byMonth)) {
      const [y, m] = monthKey.split('-').map(Number);
      const days = getDaysInMonth(y, m - 1);

      const entriesByDate: Record<string, typeof entries> = {};
      for (const e of monthEntries) {
        if (!entriesByDate[e.date]) entriesByDate[e.date] = [];
        entriesByDate[e.date].push(e);
      }

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
        // Last day of month + expiration days
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
  }, [entries, settings]);

  return { credits };
}
