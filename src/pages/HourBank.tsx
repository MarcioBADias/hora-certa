import { useMemo, useState } from 'react';
import { useHourBank } from '@/hooks/useHourBank';
import { useBankCredits } from '@/hooks/useBankCredits';
import { formatHoursMinutes, daysUntilExpiration, isExpired, isExpiringSoon } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Hourglass, TrendingUp, TrendingDown, AlertTriangle, Minus } from 'lucide-react';
import { toast } from 'sonner';

const HourBank = () => {
  const { entries: manualEntries, addBankEntry, balance: manualBalance } = useHourBank();
  const { credits: autoCredits } = useBankCredits();

  const [debitOpen, setDebitOpen] = useState(false);
  const [debitHours, setDebitHours] = useState('');
  const [debitDate, setDebitDate] = useState(new Date().toISOString().split('T')[0]);
  const [debitDescription, setDebitDescription] = useState('');

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

  const handleDebit = async () => {
    const hours = parseFloat(debitHours);
    if (!hours || hours <= 0) {
      toast.error('Informe uma quantidade de horas válida');
      return;
    }
    try {
      await addBankEntry.mutateAsync({
        date: debitDate,
        hours,
        type: 'debit',
        description: debitDescription || 'Folga / Débito',
        expires_at: null,
      });
      toast.success('Débito registrado com sucesso!');
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

  const activeCredits = autoCredits.filter(c => !isExpired(c.expiresAt));
  const expiredCredits = autoCredits.filter(c => isExpired(c.expiresAt));

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
                <Button onClick={handleDebit} className="w-full" disabled={addBankEntry.isPending}>
                  {addBankEntry.isPending ? 'Salvando...' : 'Confirmar Débito'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

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

      {/* Active credits (auto-calculated from overtime) */}
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
                  <div key={credit.month} className={`flex items-center justify-between rounded-lg p-3 text-sm
                    ${isExpiringSoon(credit.expiresAt, 7) ? 'bg-destructive/10' : isExpiringSoon(credit.expiresAt, 15) ? 'bg-warning/10' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-3">
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

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
