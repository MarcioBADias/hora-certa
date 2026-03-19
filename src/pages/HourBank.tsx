import { useMemo, useState } from 'react';
import { useHourBank } from '@/hooks/useHourBank';
import { useBankCredits, DayDetail } from '@/hooks/useBankCredits';
import { formatHoursMinutes, daysUntilExpiration, isExpired, isExpiringSoon } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import { Hourglass, TrendingUp, TrendingDown, AlertTriangle, Minus, ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const PUNCH_LABELS = ['1ª Entrada', '1ª Saída', '2ª Entrada', '2ª Saída'];

const HourBank = () => {
  const { entries: manualEntries, addBankEntry, balance: manualBalance } = useHourBank();
  const { credits: autoCredits } = useBankCredits();

  const [debitOpen, setDebitOpen] = useState(false);
  const [debitHours, setDebitHours] = useState('');
  const [debitDate, setDebitDate] = useState(new Date().toISOString().split('T')[0]);
  const [debitDescription, setDebitDescription] = useState('');
  const [confirmDebitOpen, setConfirmDebitOpen] = useState(false);

  const [expandedCredit, setExpandedCredit] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayDetail | null>(null);

  // Calculate total auto-credit balance (non-expired)
  const autoCreditBalance = useMemo(() => {
    const now = new Date();
    return autoCredits.reduce((sum, c) => {
      if (new Date(c.expiresAt) < now) return sum;
      return sum + c.bankHours;
    }, 0);
  }, [autoCredits]);

  // Total debits from manual entries
  const totalDebits = useMemo(() => {
    return manualEntries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + e.hours, 0);
  }, [manualEntries]);

  const balance = autoCreditBalance - totalDebits;

  const debits = useMemo(() => manualEntries.filter(e => e.type === 'debit'), [manualEntries]);

  const activeCredits = autoCredits.filter(c => !isExpired(c.expiresAt));
  const expiredCredits = autoCredits.filter(c => isExpired(c.expiresAt));

  // FIFO: compute which credits will be consumed by a debit
  const computeFifoConsumption = (hoursToDebit: number) => {
    const sorted = [...activeCredits].sort((a, b) => a.month.localeCompare(b.month));
    let remaining = hoursToDebit;
    const consumed: { monthLabel: string; hours: number; dailyDetails: DayDetail[] }[] = [];

    for (const credit of sorted) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, credit.bankHours);
      consumed.push({
        monthLabel: credit.monthLabel,
        hours: take,
        dailyDetails: credit.dailyDetails,
      });
      remaining -= take;
    }

    return { consumed, remaining };
  };

  const handleDebitClick = () => {
    const hours = parseFloat(debitHours);
    if (!hours || hours <= 0) {
      toast.error('Informe uma quantidade de horas válida');
      return;
    }
    if (hours > balance) {
      toast.error('Saldo insuficiente no banco de horas');
      return;
    }
    setConfirmDebitOpen(true);
  };

  const handleConfirmDebit = async () => {
    const hours = parseFloat(debitHours);
    try {
      await addBankEntry.mutateAsync({
        date: debitDate,
        hours,
        type: 'debit',
        description: debitDescription || 'Folga / Débito',
        expires_at: null,
      });
      toast.success('Débito registrado com sucesso!');
      setConfirmDebitOpen(false);
      setDebitOpen(false);
      setDebitHours('');
      setDebitDescription('');
    } catch {
      toast.error('Erro ao registrar débito');
    }
  };

  const statusBadge = (expiresAt: string) => {
    const days = daysUntilExpiration(expiresAt);
    if (days <= 7) return <Badge variant="destructive" className="text-[10px]">{days}d</Badge>;
    if (days <= 15) return <Badge className="bg-warning text-warning-foreground text-[10px]">{days}d</Badge>;
    if (days <= 30) return <Badge variant="secondary" className="text-[10px]">{days}d</Badge>;
    return <Badge variant="outline" className="text-[10px]">{days}d</Badge>;
  };

  const debitHoursNum = parseFloat(debitHours) || 0;
  const fifoResult = debitHoursNum > 0 ? computeFifoConsumption(debitHoursNum) : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Hourglass className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Banco de Horas</h1>
              <p className="text-sm text-muted-foreground">Controle detalhado do seu banco</p>
            </div>
          </div>
          <Dialog open={debitOpen} onOpenChange={setDebitOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Minus className="h-4 w-4" />
                Debitar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Debitar Banco de Horas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={debitDate} onChange={e => setDebitDate(e.target.value)} />
                </div>
                <div>
                  <Label>Horas a debitar</Label>
                  <Input type="number" placeholder="Ex: 7" value={debitHours} onChange={e => setDebitHours(e.target.value)} min={0.5} step={0.5} />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input placeholder="Ex: Folga, Consulta médica..." value={debitDescription} onChange={e => setDebitDescription(e.target.value)} />
                </div>
                <Button onClick={handleDebitClick} className="w-full" disabled={addBankEntry.isPending}>
                  {addBankEntry.isPending ? 'Salvando...' : 'Confirmar Débito'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* FIFO Debit Confirmation Dialog */}
      <AlertDialog open={confirmDebitOpen} onOpenChange={setConfirmDebitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Débito de {formatHoursMinutes(debitHoursNum)}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Essas horas serão descontadas das horas extras acumuladas dos seguintes períodos (do mais antigo para o mais recente):</p>
                {fifoResult && fifoResult.consumed.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between font-medium">
                      <span>{item.monthLabel}</span>
                      <span className="text-destructive">-{formatHoursMinutes(item.hours)}</span>
                    </div>
                    {item.dailyDetails.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.dailyDetails.map(d => (
                          <div key={d.date} className="flex justify-between text-xs text-muted-foreground">
                            <span>{new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                            <span>+{formatHoursMinutes(d.overtimeHours)} extras</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <p className="font-medium">Deseja debitar essas horas?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDebit}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Balance card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
        <Card className={balance >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Atual</p>
              <p className={`font-display text-3xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatHoursMinutes(balance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Créditos: {formatHoursMinutes(autoCreditBalance)} | Débitos: {formatHoursMinutes(totalDebits)}
              </p>
            </div>
            {balance >= 0 ? <TrendingUp className="h-8 w-8 text-success opacity-40" /> : <TrendingDown className="h-8 w-8 text-destructive opacity-40" />}
          </CardContent>
        </Card>
      </motion.div>

      {/* Active credits with daily breakdown */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-success" />
              Créditos Ativos ({activeCredits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCredits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum crédito ativo — horas extras acima de 44h/mês serão creditadas aqui automaticamente</p>
            ) : (
              <div className="space-y-2">
                {activeCredits.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()).map(credit => (
                  <div key={credit.month}>
                    <div
                      className={`flex cursor-pointer items-center justify-between rounded-lg p-3 text-sm transition-colors
                        ${isExpiringSoon(credit.expiresAt, 7) ? 'bg-destructive/10' : isExpiringSoon(credit.expiresAt, 15) ? 'bg-warning/10' : 'bg-muted/50'}
                        hover:bg-accent/50`}
                      onClick={() => setExpandedCredit(expandedCredit === credit.month ? null : credit.month)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedCredit === credit.month ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-semibold text-success">{formatHoursMinutes(credit.bankHours)}</span>
                        <span className="text-muted-foreground">{credit.monthLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Exp: {new Date(credit.expiresAt + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        {statusBadge(credit.expiresAt)}
                      </div>
                    </div>

                    {/* Daily breakdown */}
                    {expandedCredit === credit.month && credit.dailyDetails.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="ml-4 mt-1 space-y-1 border-l-2 border-success/20 pl-3"
                      >
                        {credit.dailyDetails.map(day => (
                          <div
                            key={day.date}
                            className="flex cursor-pointer items-center justify-between rounded-md bg-muted/30 p-2 text-xs transition-colors hover:bg-accent/40"
                            onClick={() => setSelectedDay(day)}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">Trabalhado: {formatHoursMinutes(day.netWorkedHours)}</span>
                              <span className="font-semibold text-success">+{formatHoursMinutes(day.overtimeHours)} extras</span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Day detail popup */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Marcações de {selectedDay && new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </DialogTitle>
          </DialogHeader>
          {selectedDay && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-lg bg-accent/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Horas trabalhadas:</span>
                  <span className="font-semibold">{formatHoursMinutes(selectedDay.netWorkedHours)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Horas regulares:</span>
                  <span>{formatHoursMinutes(selectedDay.regularHours)}</span>
                </div>
                <div className="flex justify-between text-success font-semibold">
                  <span>Horas extras:</span>
                  <span>+{formatHoursMinutes(selectedDay.overtimeHours)}</span>
                </div>
              </div>

              {/* Punches */}
              {selectedDay.punches.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Marcações Automáticas</h4>
                  <div className="space-y-2">
                    {selectedDay.punches.sort((a, b) => a.punch_number - b.punch_number).map(punch => (
                      <div key={punch.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {punch.punch_number}
                        </span>
                        <span className="font-medium">{PUNCH_LABELS[punch.punch_number - 1]}</span>
                        <span className="text-muted-foreground">— {punch.punch_time}</span>
                        {punch.address && (
                          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1 max-w-[200px]">{punch.address}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual entries */}
              {selectedDay.manualEntries.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Lançamentos Manuais</h4>
                  <div className="space-y-2">
                    {selectedDay.manualEntries.map((entry, idx) => (
                      <div key={idx} className="rounded-lg bg-muted/50 p-2 text-sm">
                        <span className="font-medium">{entry.entry_time} — {entry.exit_time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Debits */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Débitos / Folgas ({debits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum débito registrado — use o botão "Debitar" para lançar folgas</p>
            ) : (
              <div className="space-y-2">
                {debits.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                    <div>
                      <span className="font-semibold text-destructive">-{formatHoursMinutes(entry.hours)}</span>
                      <span className="ml-2 text-muted-foreground">{entry.description || 'Débito'}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Expired */}
      {expiredCredits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Expirados ({expiredCredits.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {expiredCredits.map(credit => (
                  <div key={credit.month} className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatHoursMinutes(credit.bankHours)} — {credit.monthLabel}</span>
                    <span className="text-xs">Expirou em {new Date(credit.expiresAt + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default HourBank;
