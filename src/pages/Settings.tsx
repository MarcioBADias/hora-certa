import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { WorkDay, DAY_NAMES_FULL } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save } from 'lucide-react';

const Settings = () => {
  const { settings, isLoading, saveSettings } = useSettings();
  const [weeklyHours, setWeeklyHours] = useState(20);
  const [workDays, setWorkDays] = useState<WorkDay[]>([
    { day: 3, hours: 7 },
    { day: 4, hours: 7 },
    { day: 5, hours: 6 },
  ]);
  const [openingTime, setOpeningTime] = useState('07:00');
  const [closingTime, setClosingTime] = useState('21:00');
  const [maxDailyOvertime, setMaxDailyOvertime] = useState(6);
  const [maxMonthlyPaidOvertime, setMaxMonthlyPaidOvertime] = useState(44);
  const [bankExpirationDays, setBankExpirationDays] = useState(90);
  const [breakThreshold, setBreakThreshold] = useState(7);
  const [breakDuration, setBreakDuration] = useState(1);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [monthlySalary, setMonthlySalary] = useState<string>('');

  // Calcula valor/hora: salário / (horas semanais * 52 / 12)
  const monthlyDivisor = weeklyHours * (52 / 12);
  const calculatedHourlyRate = monthlySalary && monthlyDivisor > 0
    ? (parseFloat(monthlySalary) / monthlyDivisor)
    : null;

  useEffect(() => {
    if (settings) {
      setWeeklyHours(settings.weekly_hours);
      setWorkDays(settings.work_days);
      setOpeningTime(settings.opening_time);
      setClosingTime(settings.closing_time);
      setMaxDailyOvertime(settings.max_daily_overtime);
      setMaxMonthlyPaidOvertime(settings.max_monthly_paid_overtime);
      setBankExpirationDays(settings.bank_expiration_days);
      setBreakThreshold(settings.break_threshold_hours);
      setBreakDuration(settings.break_duration_hours);
      setHourlyRate(settings.hourly_rate?.toString() || '');
      setMonthlySalary((settings as any).monthly_salary?.toString() || '');
    }
  }, [settings]);

  const toggleDay = (day: number, checked: boolean) => {
    if (checked) {
      setWorkDays([...workDays, { day, hours: 6 }].sort((a, b) => a.day - b.day));
    } else {
      setWorkDays(workDays.filter(d => d.day !== day));
    }
  };

  const setDayHours = (day: number, hours: number) => {
    setWorkDays(workDays.map(d => d.day === day ? { ...d, hours } : d));
  };

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync({
        weekly_hours: weeklyHours,
        work_days: workDays,
        opening_time: openingTime,
        closing_time: closingTime,
        max_daily_overtime: maxDailyOvertime,
        max_monthly_paid_overtime: maxMonthlyPaidOvertime,
        bank_expiration_days: bankExpirationDays,
        break_threshold_hours: breakThreshold,
        break_duration_hours: breakDuration,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      });
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <SettingsIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Defina sua carga horária e regras</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Carga Horária</CardTitle>
            <CardDescription>Configure sua jornada semanal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Horas semanais</Label>
                <Input type="number" value={weeklyHours} onChange={e => setWeeklyHours(Number(e.target.value))} min={1} max={60} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <Label>Salário mensal (R$)</Label>
                <Input type="number" placeholder="Ex: 3000" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} min={0} step="0.01" />
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Valor/hora calculado</p>
                <p className="text-lg font-bold text-primary">
                  {calculatedHourlyRate !== null
                    ? `R$ ${calculatedHourlyRate.toFixed(2)}`
                    : '—'}
                </p>
                {monthlyDivisor > 0 && (
                  <p className="text-[10px] text-muted-foreground">Divisor: {monthlyDivisor.toFixed(1)}h/mês</p>
                )}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Dias de trabalho</Label>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5, 6].map(day => {
                  const wd = workDays.find(d => d.day === day);
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <Checkbox
                        checked={!!wd}
                        onCheckedChange={(checked) => toggleDay(day, !!checked)}
                      />
                      <span className="w-24 text-sm">{DAY_NAMES_FULL[day]}</span>
                      {wd && (
                        <Input
                          type="number"
                          value={wd.hours}
                          onChange={e => setDayHours(day, Number(e.target.value))}
                          className="w-20"
                          min={1}
                          max={14}
                          step={0.5}
                        />
                      )}
                      {wd && <span className="text-xs text-muted-foreground">horas</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horários e Limites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Abertura</Label>
                <Input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} />
              </div>
              <div>
                <Label>Fechamento</Label>
                <Input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Máx. HE diárias</Label>
                <Input type="number" value={maxDailyOvertime} onChange={e => setMaxDailyOvertime(Number(e.target.value))} min={0} max={12} />
              </div>
              <div>
                <Label>Máx. HE remuneradas/mês</Label>
                <Input type="number" value={maxMonthlyPaidOvertime} onChange={e => setMaxMonthlyPaidOvertime(Number(e.target.value))} min={0} max={100} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Expiração banco (dias)</Label>
                <Input type="number" value={bankExpirationDays} onChange={e => setBankExpirationDays(Number(e.target.value))} min={1} max={365} />
              </div>
              <div>
                <Label>Intervalo a partir de (h)</Label>
                <Input type="number" value={breakThreshold} onChange={e => setBreakThreshold(Number(e.target.value))} min={0} max={12} step={0.5} />
              </div>
              <div>
                <Label>Duração intervalo (h)</Label>
                <Input type="number" value={breakDuration} onChange={e => setBreakDuration(Number(e.target.value))} min={0} max={3} step={0.5} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Button onClick={handleSave} className="w-full gap-2" disabled={saveSettings.isPending}>
          <Save className="h-4 w-4" />
          {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </motion.div>
    </div>
  );
};

export default Settings;
