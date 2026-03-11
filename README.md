# Hora Certa ⏱️

Uma aplicação completa para gestão de jornada de trabalho, projetada para simplificar o controle de horas extras, escalas, horários de serviço, banco de horas e marcação de pontos. Construída com foco em performance, experiência do usuário e arquitetura escalável.

Você pode conferir a aplicação em produção aqui: [Hora Certa](https://hora-certa.netlify.app)

---

## 🚀 Funcionalidades Principais

* **Marcação de Ponto:** Registro ágil e preciso de entradas e saídas.
* **Gestão de Banco de Horas:** Acompanhamento detalhado de saldo positivo e negativo de horas.
* **Controle de Horas Extras:** Cálculo automatizado de horas trabalhadas além da jornada regular.
* **Escalas e Horários de Serviço:** Planejamento e visualização clara das escalas da equipe.
* **Dashboard Analítico:** Visão geral com gráficos e indicadores de desempenho utilizando Recharts.
* **Autenticação Segura:** Sistema de login e gestão de usuários integrado ao Supabase.

---

## 🛠️ Tecnologias e Bibliotecas

Este projeto foi desenvolvido utilizando as tecnologias mais modernas do ecossistema front-end:

* **Core:** React 18, Vite e TypeScript.
* **UI e Estilização:** Tailwind CSS, Shadcn UI (Radix UI) para componentes acessíveis e Framer Motion para animações fluidas.
* **Gerenciamento de Estado e Mutação:** React Query (TanStack Query) para comunicação com o backend e cache.
* **Formulários e Validação:** React Hook Form integrado com Zod.
* **Backend as a Service (BaaS):** Supabase (Banco de dados, Autenticação e Edge Functions).
* **Roteamento:** React Router DOM.
* **Testes:** * Testes Unitários: Vitest
  * Testes E2E (End-to-End): Playwright

---

## 🏗️ Arquitetura e Padrões de Código

Para manter a consistência, legibilidade e facilitar a manutenção e escalabilidade da aplicação, adotamos rigorosamente os seguintes padrões arquiteturais:

1. **Exportações:** Utilizamos **apenas exportações nomeadas** (`export const Component = ...`). O uso de exportações padrão (`export default`) é expressamente proibido para evitar inconsistências de nomenclatura durante as importações e facilitar a refatoração.

2. **Gerenciamento de Estado Complexo:** Priorizamos o hook `useReducer` em vez de múltiplos `useState` para gerenciar estados que possuem lógicas de transição complexas.
   * **Regra de Separação:** O `Reducer` e o `initialState` devem **sempre** ser declarados e mantidos em um arquivo ou módulo externo ao componente visual (ex: em um arquivo dedicado na pasta de *hooks* ou *reducers*). Isso isola a regra de negócios e facilita a criação de testes unitários.

---

## ⚙️ Como Executar o Projeto Localmente

### Pré-requisitos
* Node.js (versão 18 ou superior recomendada)
* Gerenciador de pacotes (npm, yarn, pnpm ou bun)
* Uma conta no [Supabase](https://supabase.com/) (para configurar o ambiente de desenvolvimento)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/MarcioBADias/hora-certa.git](https://github.com/MarcioBADias/hora-certa.git)
   cd hora-certa
