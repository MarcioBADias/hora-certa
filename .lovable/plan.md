

# Painel de Controle de Ponto e Banco de Horas

## Visão Geral
Aplicação web para controle de ponto, cálculo automático de horas extras (remuneradas e banco de horas), e gestão de banco de horas com alerta de expiração.

## Páginas e Funcionalidades

### 1. Login e Configuração Inicial
- Tela de login com email/senha (Supabase Auth)
- Após primeiro login, formulário de configuração:
  - Carga horária semanal (ex: 20h)
  - Dias de trabalho e distribuição de horas por dia (ex: Qua 7h, Qui 7h, Sex 6h)
  - Horário de funcionamento do local (ex: 07:00–21:00)
  - Limite de horas extras diárias (ex: 6h)
  - Limite de horas extras remuneradas/mês (ex: 44h)
  - Prazo de expiração do banco de horas (ex: 90 dias)
  - Desconto automático de intervalo (1h se >= 7h trabalhadas)
  - Valor/hora (opcional, para cálculo de remuneração)

### 2. Registro de Ponto (Tela Principal)
- Calendário mensal com visualização dos dias de trabalho
- Para cada dia: campos de entrada e saída (pode ter múltiplos registros por dia)
- Marcação de faltas e folgas (banco de horas negativo)
- Cálculo automático por dia:
  - Horas trabalhadas (com desconto de intervalo)
  - Horas regulares vs. horas extras
- Animações suaves ao registrar ponto

### 3. Dashboard com Resumos
- **Filtros**: por mês e por período personalizado
- **Cards resumo** (com animações):
  - Horas trabalhadas no período
  - Horas extras remuneradas (até o limite de 44h/mês)
  - Valor a receber de horas extras (se configurado)
  - Saldo atual do banco de horas
  - Horas do banco próximas a expirar (com alerta visual)
- **Gráfico** de horas trabalhadas por dia/semana
- **Lista de alertas**: banco de horas por vencer nos próximos 15/30 dias

### 4. Banco de Horas Detalhado
- Tabela com todas as entradas e saídas do banco
- Cada entrada mostra: data de origem, quantidade de horas, data de expiração
- Indicador visual (cores) para proximidade de expiração
- Saldo total disponível
- Sugestão de folgas em meses com 5 quartas/quintas

## Regras de Negócio (Automáticas)
- Desconto de 1h de intervalo quando jornada ≥ 7h
- Horas extras = horas trabalhadas – horas regulares do dia
- Até 44h extras/mês são remuneradas; excedente vai para banco de horas
- Banco de horas expira em 90 dias (configurável)
- Banco negativo (folgas tiradas) é descontado do saldo

## Backend (Supabase/Lovable Cloud)
- Tabela de perfil/configurações do usuário
- Tabela de registros de ponto (dia, entrada, saída)
- Tabela de banco de horas (entradas, saídas, expiração)
- Autenticação com email/senha

## Design
- Interface limpa e moderna com Tailwind CSS
- Animações de fade/scale nos cards e transições
- Cores para status: verde (ok), amarelo (atenção), vermelho (urgente/expirado)
- Responsivo para mobile e desktop
- Navegação lateral simples com ícones

