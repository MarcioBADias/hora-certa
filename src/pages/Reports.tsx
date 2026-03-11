import { useState, useMemo } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useClockPunches } from '@/hooks/useClockPunches';
import { useSettings } from '@/hooks/useSettings';
import { calculateDay, formatHoursMinutes, MONTH_NAMES } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { FileText, Download, FileSpreadsheet, Calendar } from 'lucide-react';

type PeriodType = 'week' | 'month' | 'custom' | 'year';

const PUNCH_LABELS = ['1ª Entrada', '1ª Saída', '2ª Entrada', '2ª Saída'];

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: fmt(start), end: fmt(end) };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}

function getYearRange() {
  const now = new Date();
  return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
}

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}

const Reports = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customStart, setCustomStart] = useState(fmt(new Date()));
  const [customEnd, setCustomEnd] = useState(fmt(new Date()));

  const range = useMemo(() => {
    switch (period) {
      case 'week': return getWeekRange();
      case 'month': return getMonthRange();
      case 'year': return getYearRange();
      case 'custom': return { start: customStart, end: customEnd };
    }
  }, [period, customStart, customEnd]);

  const { entries } = useTimeEntries(range.start, range.end);
  const { punches } = useClockPunches(range.start, range.end);
  const { settings } = useSettings();

  // Build unified report rows
  const reportRows = useMemo(() => {
    const dateSet = new Set<string>();
    entries.forEach(e => dateSet.add(e.date));
    punches.forEach(p => dateSet.add(p.date));

    const sorted = Array.from(dateSet).sort();

    return sorted.map(date => {
      const dayEntries = entries.filter(e => e.date === date);
      const dayPunches = punches.filter(p => p.date === date);

      let manualHours = 0;
      let manualCalc = null;
      if (dayEntries.length > 0 && settings) {
        manualCalc = calculateDay(date, dayEntries, settings);
        manualHours = manualCalc.netWorkedHours;
      }

      let punchHours = 0;
      const sortedPunches = [...dayPunches].sort((a, b) => a.punch_number - b.punch_number);
      for (let i = 0; i < sortedPunches.length - 1; i += 2) {
        const s = sortedPunches[i];
        const e = sortedPunches[i + 1];
        if (s && e) {
          const [sh, sm] = s.punch_time.split(':').map(Number);
          const [eh, em] = e.punch_time.split(':').map(Number);
          punchHours += ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        }
      }

      return {
        date,
        dateFormatted: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
        manualEntries: dayEntries.map(e => `${e.entry_time}-${e.exit_time}`).join(', '),
        punchEntries: sortedPunches.map(p => `${PUNCH_LABELS[p.punch_number - 1]}: ${p.punch_time}`).join(', '),
        manualHours: Math.round(manualHours * 100) / 100,
        punchHours: Math.round(punchHours * 100) / 100,
        totalHours: Math.round((manualHours + punchHours) * 100) / 100,
        overtime: manualCalc?.overtimeHours || 0,
      };
    });
  }, [entries, punches, settings]);

  const totals = useMemo(() => {
    return {
      totalHours: reportRows.reduce((s, r) => s + r.totalHours, 0),
      totalOvertime: reportRows.reduce((s, r) => s + r.overtime, 0),
    };
  }, [reportRows]);

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('Relatório de Marcações', 14, 20);
      doc.setFontSize(10);
      doc.text(`Período: ${new Date(range.start + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(range.end + 'T12:00:00').toLocaleDateString('pt-BR')}`, 14, 28);

      autoTable(doc, {
        startY: 35,
        head: [['Data', 'Manual', 'Marcação Auto', 'Horas Manual', 'Horas Auto', 'Total', 'Extras']],
        body: reportRows.map(r => [
          r.dateFormatted,
          r.manualEntries || '—',
          r.punchEntries || '—',
          formatHoursMinutes(r.manualHours),
          formatHoursMinutes(r.punchHours),
          formatHoursMinutes(r.totalHours),
          formatHoursMinutes(r.overtime),
        ]),
        foot: [['TOTAL', '', '', '', '', formatHoursMinutes(totals.totalHours), formatHoursMinutes(totals.totalOvertime)]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`relatorio-ponto-${range.start}-${range.end}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const data = reportRows.map(r => ({
        'Data': r.dateFormatted,
        'Registros Manuais': r.manualEntries || '—',
        'Marcações Automáticas': r.punchEntries || '—',
        'Horas Manual': r.manualHours,
        'Horas Auto': r.punchHours,
        'Total Horas': r.totalHours,
        'Horas Extras': r.overtime,
      }));

      data.push({
        'Data': 'TOTAL',
        'Registros Manuais': '',
        'Marcações Automáticas': '',
        'Horas Manual': 0,
        'Horas Auto': 0,
        'Total Horas': totals.totalHours,
        'Horas Extras': totals.totalOvertime,
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
      XLSX.writeFile(wb, `relatorio-ponto-${range.start}-${range.end}.xlsx`);
      toast.success('Excel gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar Excel');
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Exporte suas marcações por período</p>
          </div>
        </div>
      </motion.div>

      {/* Period selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">De</Label>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Até</Label>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={exportPDF} className="flex-1 gap-2" variant="outline">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button onClick={exportExcel} className="flex-1 gap-2" variant="outline">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Prévia — {reportRows.length} dia(s) com registro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro no período selecionado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2 font-medium text-muted-foreground">Data</th>
                    <th className="p-2 font-medium text-muted-foreground">Horários</th>
                    <th className="p-2 font-medium text-muted-foreground text-right">Horas</th>
                    <th className="p-2 font-medium text-muted-foreground text-right">Extras</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map(row => (
                    <tr key={row.date} className="border-b border-border/50">
                      <td className="p-2 font-medium">{row.dateFormatted}</td>
                      <td className="p-2 text-muted-foreground">
                        {row.manualEntries && <div>Manual: {row.manualEntries}</div>}
                        {row.punchEntries && <div>Auto: {row.punchEntries}</div>}
                      </td>
                      <td className="p-2 text-right font-semibold">{formatHoursMinutes(row.totalHours)}</td>
                      <td className="p-2 text-right text-primary font-semibold">{formatHoursMinutes(row.overtime)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="p-2" colSpan={2}>TOTAL</td>
                    <td className="p-2 text-right">{formatHoursMinutes(totals.totalHours)}</td>
                    <td className="p-2 text-right text-primary">{formatHoursMinutes(totals.totalOvertime)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
