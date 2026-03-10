import { useMemo } from 'react';
import { useHourBank } from '@/hooks/useHourBank';
import { formatHoursMinutes, daysUntilExpiration, isExpired, isExpiringSoon } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Hourglass, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const HourBank = () => {
  const { entries, balance } = useHourBank();

  const grouped = useMemo(() => {
    const active = entries.filter(e => e.type === 'credit' && e.expires_at && !isExpired(e.expires_at));
    const expired = entries.filter(e => e.type === 'credit' && e.expires_at && isExpired(e.expires_at));
    const debits = entries.filter(e => e.type === 'debit');
    return { active, expired, debits };
  }, [entries]);

  const statusBadge = (expiresAt: string) => {
    const days = daysUntilExpiration(expiresAt);
    if (days <= 7) return <Badge variant="destructive" className="text-[10px]">{days}d</Badge>;
    if (days <= 15) return <Badge className="bg-warning text-warning-foreground text-[10px]">{days}d</Badge>;
    if (days <= 30) return <Badge variant="secondary" className="text-[10px]">{days}d</Badge>;
    return <Badge variant="outline" className="text-[10px]">{days}d</Badge>;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Hourglass className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Banco de Horas</h1>
            <p className="text-sm text-muted-foreground">Controle detalhado do seu banco</p>
          </div>
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
            </div>
            {balance >= 0 ? <TrendingUp className="h-8 w-8 text-success opacity-40" /> : <TrendingDown className="h-8 w-8 text-destructive opacity-40" />}
          </CardContent>
        </Card>
      </motion.div>

      {/* Active credits */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-success" />
              Créditos Ativos ({grouped.active.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grouped.active.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum crédito ativo</p>
            ) : (
              <div className="space-y-2">
                {grouped.active.sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime()).map(entry => (
                  <div key={entry.id} className={`flex items-center justify-between rounded-lg p-3 text-sm
                    ${isExpiringSoon(entry.expires_at!, 7) ? 'bg-destructive/10' : isExpiringSoon(entry.expires_at!, 15) ? 'bg-warning/10' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-success">{formatHoursMinutes(entry.hours)}</span>
                      <span className="text-muted-foreground">
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Exp: {new Date(entry.expires_at! + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      {statusBadge(entry.expires_at!)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Debits */}
      {grouped.debits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Débitos / Folgas ({grouped.debits.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {grouped.debits.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
                    <div>
                      <span className="font-semibold text-destructive">-{formatHoursMinutes(entry.hours)}</span>
                      <span className="ml-2 text-muted-foreground">{entry.description}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Expired */}
      {grouped.expired.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Expirados ({grouped.expired.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {grouped.expired.slice(0, 10).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatHoursMinutes(entry.hours)}</span>
                    <span className="text-xs">Expirou em {new Date(entry.expires_at! + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
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
