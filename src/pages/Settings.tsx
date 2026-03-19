import { useState, useEffect, useRef } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { WorkDay, DAY_NAMES_FULL, PunchValidationMethod } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, Fingerprint, Camera, ShieldOff, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();
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
  const [closingDay, setClosingDay] = useState<string>('');
  const [validationMethod, setValidationMethod] = useState<PunchValidationMethod>('none');
  const [referencePhotoUrl, setReferencePhotoUrl] = useState<string | null>(null);
  const [capturingRef, setCapturingRef] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      setClosingDay(settings.closing_day ? String(settings.closing_day) : '');
      setValidationMethod(settings.punch_validation_method || 'none');
    }
  }, [settings]);

  // Load reference photo
  useEffect(() => {
    if (user && validationMethod === 'face_capture') {
      const { data } = supabase.storage
        .from('punch-photos')
        .getPublicUrl(`${user.id}/reference.jpg`);
      // Check if file exists by trying to fetch it
      fetch(data.publicUrl, { method: 'HEAD' })
        .then(res => {
          if (res.ok) setReferencePhotoUrl(data.publicUrl + '?t=' + Date.now());
          else setReferencePhotoUrl(null);
        })
        .catch(() => setReferencePhotoUrl(null));
    }
  }, [user, validationMethod]);

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

  const startFaceCapture = async () => {
    setCapturingRef(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      toast.error('Não foi possível acessar a câmera');
      setCapturingRef(false);
    }
  };

  const captureReferencePhoto = async () => {
    if (!videoRef.current || !user) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);

    // Stop stream
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const { error } = await supabase.storage
        .from('punch-photos')
        .upload(`${user.id}/reference.jpg`, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (error) {
        toast.error('Erro ao salvar foto de referência');
      } else {
        const { data } = supabase.storage
          .from('punch-photos')
          .getPublicUrl(`${user.id}/reference.jpg`);
        setReferencePhotoUrl(data.publicUrl + '?t=' + Date.now());
        toast.success('Foto de referência salva!');
      }
      setCapturingRef(false);
    }, 'image/jpeg', 0.85);
  };

  const cancelCapture = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCapturingRef(false);
  };

  const handleSave = async () => {
    try {
      const computedRate = calculatedHourlyRate !== null
        ? Math.round(calculatedHourlyRate * 100) / 100
        : (hourlyRate ? parseFloat(hourlyRate) : null);

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
        hourly_rate: computedRate,
        monthly_salary: monthlySalary ? parseFloat(monthlySalary) : null,
        closing_day: closingDay ? parseInt(closingDay) : null,
        punch_validation_method: validationMethod,
      } as any);
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dia de fechamento do ponto</Label>
                <Input
                  type="number"
                  placeholder="Vazio = mês normal"
                  value={closingDay}
                  onChange={e => setClosingDay(e.target.value)}
                  min={1}
                  max={28}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {closingDay ? `O mês fecha no dia ${closingDay}. Ex: Março = dia ${parseInt(closingDay) + 1} de Fev a ${closingDay} de Mar.` : 'Deixe vazio para usar o mês normal (1 a 30/31).'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Validation method */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Fingerprint className="h-5 w-5" />
              Validação de Marcação Automática
            </CardTitle>
            <CardDescription>Escolha como validar a identidade ao marcar o ponto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Método de validação</Label>
              <Select value={validationMethod} onValueChange={(v) => setValidationMethod(v as PunchValidationMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <ShieldOff className="h-4 w-4 text-muted-foreground" />
                      <span>Nenhum — apenas apertar o botão</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="biometric">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-primary" />
                      <span>Biometria do dispositivo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="face_capture">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      <span>Captura de imagem facial</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {validationMethod === 'biometric' && (
              <div className="rounded-lg bg-accent/50 p-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Fingerprint className="mt-0.5 h-4 w-4 text-primary" />
                  <p>O dispositivo solicitará sua biometria (impressão digital, Face ID, PIN do dispositivo) antes de registrar cada marcação.</p>
                </div>
              </div>
            )}

            {validationMethod === 'face_capture' && (
              <div className="space-y-3">
                <div className="rounded-lg bg-accent/50 p-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Camera className="mt-0.5 h-4 w-4 text-primary" />
                    <p>Uma foto será capturada a cada marcação e salva como registro. Configure abaixo a foto de referência.</p>
                  </div>
                </div>

                {/* Reference photo */}
                <div>
                  <Label className="mb-2 block">Foto de referência</Label>
                  {referencePhotoUrl && !capturingRef ? (
                    <div className="space-y-2">
                      <div className="relative mx-auto w-48 overflow-hidden rounded-xl border border-border">
                        <img src={referencePhotoUrl} alt="Referência facial" className="w-full" />
                      </div>
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={startFaceCapture}>
                        <Camera className="h-4 w-4" />
                        Atualizar foto de referência
                      </Button>
                    </div>
                  ) : capturingRef ? (
                    <div className="space-y-2">
                      <div className="relative mx-auto overflow-hidden rounded-xl border border-border" style={{ maxWidth: 320 }}>
                        <video ref={videoRef} className="w-full" autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1 gap-2" onClick={captureReferencePhoto}>
                          <ImageIcon className="h-4 w-4" />
                          Capturar
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={cancelCapture}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" onClick={startFaceCapture}>
                      <Camera className="h-4 w-4" />
                      Tirar foto de referência
                    </Button>
                  )}
                </div>
              </div>
            )}
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
