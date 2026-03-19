import { useState, useMemo, useCallback } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useClockPunches } from '@/hooks/useClockPunches';
import { useSettings } from '@/hooks/useSettings';
import { useHourBank } from '@/hooks/useHourBank';
import { calculateDay, formatHoursMinutes, DAY_NAMES, MONTH_NAMES, getDaysInMonth, getRegularHoursForDay } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Trash2, ChevronLeft, ChevronRight, CalendarDays, MapPin, Fingerprint, Loader2 } from 'lucide-react';

const PUNCH_LABELS = ['1ª Entrada', '1ª Saída', '2ª Entrada', '2ª Saída'];

const TimeEntry = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryTime, setEntryTime] = useState('07:00');
  const [exitTime, setExitTime] = useState('21:00');
  const [entryType, setEntryType] = useState('work');
  const [isPunching, setIsPunching] = useState(false);

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

  const { entries, isLoading, addEntry, deleteEntry } = useTimeEntries(startDate, endDate);
  const { punches, addPunch, deletePunch } = useClockPunches(startDate, endDate);
  const { settings } = useSettings();

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, typeof entries> = {};
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [entries]);

  const punchesByDate = useMemo(() => {
    const map: Record<string, typeof punches> = {};
    for (const p of punches) {
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    }
    return map;
  }, [punches]);

  const navigateMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  const handleAddEntry = async () => {
    if (!selectedDate) return;
    try {
      await addEntry.mutateAsync({
        date: selectedDate,
        entry_time: entryTime,
        exit_time: exitTime,
        entry_type: entryType,
        notes: null,
      });
      toast.success('Registro adicionado!');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao adicionar registro');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id);
      toast.success('Registro removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const openAddDialog = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (settings) {
      setEntryTime(settings.opening_time);
      setExitTime(settings.closing_time);
    }
    setEntryType('work');
    setDialogOpen(true);
  };

  const getDateStr = (d: Date) => d.toISOString().split('T')[0];
  const today = getDateStr(new Date());

  const todayPunches = punchesByDate[today] || [];
  const nextPunchNumber = todayPunches.length + 1;

  const handleClockPunch = useCallback(async () => {
    if (nextPunchNumber > 4) {
      toast.error('Todas as 4 marcações do dia já foram feitas');
      return;
    }
    setIsPunching(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      const nowTime = new Date();
      const punchTime = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`;

      let address: string | undefined;
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await resp.json();
        address = data.display_name;
      } catch {
        // Address is optional
      }

      await addPunch.mutateAsync({
        date: today,
        punch_number: nextPunchNumber,
        punch_time: punchTime,
        latitude,
        longitude,
        address,
      });

      toast.success(`${PUNCH_LABELS[nextPunchNumber - 1]} registrada às ${punchTime}`);
    } catch (err: any) {
      if (err?.code === 1) {
        toast.error('Permissão de localização negada. Habilite a localização para marcar o ponto.');
      } else if (err?.code === 2) {
        toast.error('Não foi possível obter a localização. Verifique seu GPS.');
      } else if (err?.code === 3) {
        toast.error('Tempo esgotado ao obter localização. Tente novamente.');
      } else {
        toast.error('Erro ao registrar marcação');
      }
    } finally {
      setIsPunching(false);
    }
  }, [nextPunchNumber, today, addPunch]);

  const handleDeletePunch = async (id: string) => {
    try {
      await deletePunch.mutateAsync(id);
      toast.success('Marcação removida');
    } catch {
      toast.error('Erro ao remover marcação');
    }
  };

  // Calculate worked hours from punches for a given date
  const getPunchWorkedInfo = (datePunches: typeof punches) => {
    const sorted = [...datePunches].sort((a, b) => a.punch_number - b.punch_number);
    let totalMinutes = 0;
    // Period 1: punch 1 to 2, Period 2: punch 3 to 4
    for (let i = 0; i < sorted.length - 1; i += 2) {
      const start = sorted[i];
      const end = sorted[i + 1];
      if (start && end) {
        const [sh, sm] = start.punch_time.split(':').map(Number);
        const [eh, em] = end.punch_time.split(':').map(Number);
        totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
      }
    }
    return { totalMinutes, hours: Math.round((totalMinutes / 60) * 100) / 100 };
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Registro de Ponto</h1>
            <p className="text-sm text-muted-foreground">Marque suas entradas e saídas</p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="auto" className="gap-2">
            <Fingerprint className="h-4 w-4" />
            Marcação Automática
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Clock className="h-4 w-4" />
            Lançamento Manual
          </TabsTrigger>
        </TabsList>

        {/* AUTO CLOCK TAB */}
        <TabsContent value="auto" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Marcar Ponto — {new Date().toLocaleDateString('pt-BR')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="mb-1 text-sm text-muted-foreground">
                  {nextPunchNumber <= 4
                    ? `Próxima marcação: ${PUNCH_LABELS[nextPunchNumber - 1]}`
                    : 'Todas as marcações do dia foram feitas ✅'}
                </p>
                <Button
                  size="lg"
                  className="mt-2 h-16 w-full gap-3 text-lg"
                  onClick={handleClockPunch}
                  disabled={isPunching || nextPunchNumber > 4}
                >
                  {isPunching ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Obtendo localização...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-6 w-6" />
                      Marcar Ponto
                    </>
                  )}
                </Button>
              </div>

              {/* Today's punches */}
              {todayPunches.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Marcações de hoje</h3>
                  {todayPunches.sort((a, b) => a.punch_number - b.punch_number).map(punch => (
                    <div key={punch.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {punch.punch_number}
                          </span>
                          <span className="font-semibold">{PUNCH_LABELS[punch.punch_number - 1]}</span>
                          <span className="text-muted-foreground">— {punch.punch_time}</span>
                        </div>
                        {punch.address && (
                          <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="line-clamp-1">{punch.address}</span>
                          </div>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja realmente excluir esta marcação? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Não</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePunch(punch.id)}>Sim</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                  {todayPunches.length >= 2 && (
                    <div className="rounded-lg bg-accent/50 p-2 text-xs">
                      <div className="flex justify-between">
                        <span>Horas trabalhadas:</span>
                        <span className="font-semibold">{formatHoursMinutes(getPunchWorkedInfo(todayPunches).hours)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Punch history for the month */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Histórico do Mês</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{MONTH_NAMES[month]} {year}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(punchesByDate).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma marcação automática neste mês</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(punchesByDate)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, dayPunches]) => {
                      const info = getPunchWorkedInfo(dayPunches);
                      return (
                        <div key={date} className="rounded-lg border border-border/50 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </span>
                            {dayPunches.length >= 2 && (
                              <span className="text-xs font-medium text-primary">{formatHoursMinutes(info.hours)}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map(num => {
                              const p = dayPunches.find(x => x.punch_number === num);
                              return (
                                <div key={num} className="text-center">
                                  <div className="text-[10px] text-muted-foreground">{PUNCH_LABELS[num - 1]}</div>
                                  <div className="text-xs font-medium">{p ? p.punch_time : '—'}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANUAL TAB */}
        <TabsContent value="manual" className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between rounded-xl bg-card p-3 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-display text-lg font-semibold">
              {MONTH_NAMES[month]} {year}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {DAY_NAMES.map(d => <div key={d} className="py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: days[0]?.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const dateStr = getDateStr(day);
              const dayEntries = entriesByDate[dateStr] || [];
              const dayOfWeek = day.getDay();
              const isWork = settings ? getRegularHoursForDay(dayOfWeek, settings.work_days) > 0 : false;
              const isToday = dateStr === today;
              const hasEntries = dayEntries.length > 0;

              let calc = null;
              if (hasEntries && settings) {
                calc = calculateDay(dateStr, dayEntries, settings);
              }

              return (
                <motion.div
                  key={dateStr}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative cursor-pointer rounded-lg border p-1.5 text-xs transition-colors
                    ${isToday ? 'border-primary bg-accent' : 'border-border/50'}
                    ${isWork && !hasEntries ? 'bg-card' : ''}
                    ${hasEntries ? 'bg-success/10 border-success/30' : ''}
                    ${!isWork && !hasEntries ? 'bg-muted/30' : ''}
                  `}
                  onClick={() => openAddDialog(dateStr)}
                >
                  <div className={`font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day.getDate()}
                  </div>
                  {calc && (
                    <div className="mt-0.5 text-[10px] text-success font-medium">
                      {formatHoursMinutes(calc.netWorkedHours)}
                    </div>
                  )}
                  {hasEntries && (
                    <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-success" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Selected date entries */}
          <AnimatePresence>
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Registros de {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <Button size="sm" className="gap-1" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(entriesByDate[selectedDate] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum registro neste dia</p>
                    ) : (
                      <div className="space-y-2">
                        {(entriesByDate[selectedDate] || []).map(entry => (
                          <div key={entry.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm">
                            <div>
                              <span className="font-medium">{entry.entry_time} — {entry.exit_time}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({entry.entry_type === 'work' ? 'Trabalho' : entry.entry_type === 'absence' ? 'Falta' : 'Folga'})
                              </span>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Deseja realmente excluir este registro? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Não</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>Sim</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                        {settings && (entriesByDate[selectedDate] || []).length > 0 && (() => {
                          const calc = calculateDay(selectedDate, entriesByDate[selectedDate], settings);
                          return (
                            <div className="mt-2 rounded-lg bg-accent/50 p-2 text-xs">
                              <div className="flex justify-between">
                                <span>Horas trabalhadas:</span>
                                <span className="font-semibold">{formatHoursMinutes(calc.netWorkedHours)}</span>
                              </div>
                              {calc.breakDeducted && (
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Intervalo descontado:</span>
                                  <span>-{settings.break_duration_hours}h</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Horas regulares:</span>
                                <span>{formatHoursMinutes(calc.regularHours)}</span>
                              </div>
                              <div className="flex justify-between text-primary font-semibold">
                                <span>Horas extras:</span>
                                <span>{formatHoursMinutes(calc.overtimeHours)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* Add entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Trabalho</SelectItem>
                  <SelectItem value="absence">Falta</SelectItem>
                  <SelectItem value="day_off">Folga (banco de horas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {entryType === 'work' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entrada</Label>
                  <Input type="time" value={entryTime} onChange={e => setEntryTime(e.target.value)} />
                </div>
                <div>
                  <Label>Saída</Label>
                  <Input type="time" value={exitTime} onChange={e => setExitTime(e.target.value)} />
                </div>
              </div>
            )}
            <Button onClick={handleAddEntry} className="w-full" disabled={addEntry.isPending}>
              {addEntry.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeEntry;
