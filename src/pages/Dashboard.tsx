import { useState, useMemo } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useClockPunches } from '@/hooks/useClockPunches';
import { useSettings } from '@/hooks/useSettings';
import { useHourBank } from '@/hooks/useHourBank';
import { useBankCredits } from '@/hooks/useBankCredits';
import { punchesToEntries } from '@/lib/punchesToEntries';
import { calculateDay, calculateMonthSummary, formatHoursMinutes, MONTH_NAMES, getDaysInMonth, daysUntilExpiration, isExpiringSoon, isExpired } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChevronLeft, ChevronRight, Clock, DollarSign, TrendingUp, AlertTriangle, Hourglass, CalendarCheck } from 'lucide-react';

const Dashboard = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

  const { entries } = useTimeEntries(startDate, endDate);
  const { punches } = useClockPunches(startDate, endDate);
  const { settings } = useSettings();
  const { entries: bankEntries } = useHourBank();
  const { credits: autoCredits } = useBankCredits();

  // Calculate real bank balance: auto credits (non-expired) - manual debits
  const balance = useMemo(() => {
    const now = new Date();
    const autoCreditBalance = autoCredits.reduce((sum, c) => {
      if (new Date(c.expiresAt) < now) return sum;
      return sum + c.bankHours;
    }, 0);
    const totalDebits = bankEntries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + e.hours, 0);
    return autoCreditBalance - totalDebits;
  }, [autoCredits, bankEntries]);

  const expiringCredits = useMemo(() => {
    return autoCredits.filter(c => !isExpired(c.expiresAt) && isExpiringSoon(c.expiresAt, 30));
  }, [autoCredits]);

  const navigateMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  // Build unified entries (manual + punches)
  const unifiedByDate = useMemo(() => {
    const map: Record<string, { entry_time: string; exit_time: string }[]> = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push({ entry_time: e.entry_time, exit_time: e.exit_time });
    }
    const punchesByDate: Record<string, typeof punches> = {};
    for (const p of punches) {
      if (!punchesByDate[p.date]) punchesByDate[p.date] = [];
      punchesByDate[p.date].push(p);
    }
    for (const [date, dayPunches] of Object.entries(punchesByDate)) {
      const converted = punchesToEntries(dayPunches);
      if (converted.length > 0) {
        if (!map[date]) map[date] = [];
        map[date].push(...converted);
      }
    }
    return map;
  }, [entries, punches]);

  const summary = useMemo(() => {
    if (!settings) return null;
    const days = getDaysInMonth(year, month);
    const dayCalcs = days
      .map(d => {
        const dateStr = d.toISOString().split('T')[0];
        const dayEntries = unifiedByDate[dateStr] || [];
        if (dayEntries.length === 0) return null;
        return calculateDay(dateStr, dayEntries, settings);
      })
      .filter(Boolean) as any[];
    return calculateMonthSummary(dayCalcs, settings);
  }, [unifiedByDate, settings, year, month]);

  const chartData = useMemo(() => {
    if (!settings) return [];
    const entriesByDate: Record<string, typeof entries> = {};
    for (const e of entries) {
      if (!entriesByDate[e.date]) entriesByDate[e.date] = [];
      entriesByDate[e.date].push(e);
    }
    return Object.keys(entriesByDate).sort().map(date => {
      const calc = calculateDay(date, entriesByDate[date], settings);
      return {
        date: new Date(date + 'T12:00:00').getDate().toString(),
        regular: Math.round(calc.regularHours * 100) / 100,
        overtime: Math.round(calc.overtimeHours * 100) / 100,
      };
    });
  }, [entries, settings]);

  // expiringCredits already computed above from autoCredits

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1 } }),
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Resumo das suas horas</p>
          </div>
        </div>
      </motion.div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-xl bg-card p-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-display text-lg font-semibold">{MONTH_NAMES[month]} {year}</h2>
        <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            { icon: Clock, label: 'Horas Trabalhadas', value: formatHoursMinutes(summary.totalWorkedHours), color: 'text-primary' },
            { icon: TrendingUp, label: 'HE Remuneradas', value: formatHoursMinutes(summary.paidOvertimeHours), color: 'text-success' },
            { icon: Hourglass, label: 'HE → Banco', value: formatHoursMinutes(summary.bankOvertimeHours), color: 'text-warning' },
            { icon: CalendarCheck, label: 'Saldo Banco', value: formatHoursMinutes(balance), color: balance >= 0 ? 'text-success' : 'text-destructive' },
            { icon: DollarSign, label: 'Valor HE', value: summary.estimatedOvertimePay !== null ? `R$ ${summary.estimatedOvertimePay.toFixed(2)}` : '—', color: 'text-primary' },
            { icon: AlertTriangle, label: 'Expirando', value: `${expiringCredits.length} registros`, color: expiringCredits.length > 0 ? 'text-destructive' : 'text-muted-foreground' },
          ].map((card, i) => (
            <motion.div key={card.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className={`mt-1 font-display text-xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                    <card.icon className={`h-5 w-5 ${card.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="regular" name="Regular" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="overtime" name="Extra" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Expiring alerts */}
      {expiringCredits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-warning">
                <AlertTriangle className="h-4 w-4" />
                Banco de Horas Expirando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiringCredits.map(credit => {
                  const days = daysUntilExpiration(credit.expiresAt);
                  return (
                    <div key={credit.month} className="flex items-center justify-between rounded-lg bg-card p-2 text-sm">
                      <div>
                        <span className="font-medium">{formatHoursMinutes(credit.bankHours)}</span>
                        <span className="ml-2 text-muted-foreground">de {credit.monthLabel}</span>
                      </div>
                      <span className={`text-xs font-semibold ${days <= 7 ? 'text-destructive' : days <= 15 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {days} dias restantes
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
