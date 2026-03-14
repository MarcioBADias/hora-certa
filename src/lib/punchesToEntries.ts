import { ClockPunch } from '@/hooks/useClockPunches';

/**
 * Converts clock punches into time entry-like objects compatible with calculateDay.
 * Pairs punches: 1→2 = period 1, 3→4 = period 2.
 */
export function punchesToEntries(punches: ClockPunch[]): { entry_time: string; exit_time: string }[] {
  const sorted = [...punches].sort((a, b) => a.punch_number - b.punch_number);
  const entries: { entry_time: string; exit_time: string }[] = [];

  for (let i = 0; i < sorted.length - 1; i += 2) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start && end) {
      entries.push({
        entry_time: start.punch_time,
        exit_time: end.punch_time,
      });
    }
  }

  return entries;
}
