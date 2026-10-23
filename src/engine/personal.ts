export type Wallet = 'cash' | 'food';
export type MovementKind = 'income' | 'fixed' | 'daily' | 'save' | 'withdraw';
export interface Movement {
  id: string; date: string; description: string; amountCents: number;
  kind: MovementKind; wallet: Wallet; billId?: string; source?: 'salary' | 'benefit';
}
export interface FixedBill { id: string; name: string; amountCents: number; dueDay: number }
export interface Profile { name: string; salaryCents: number; foodCents: number; savingsGoalCents: number }
export interface PersonalState {
  version: 1; demo: boolean; profile: Profile;
  openingCashCents: number; openingFoodCents: number; openingSavingsCents: number;
  movements: Movement[]; bills: FixedBill[]; tax: number; target: number; provisioned: boolean;
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function moneyInput(value: string): number | null {
  const input = value.trim().replace(/\s|R\$/g, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(input) && !/^\d+(?:\.\d{1,2})?$/.test(input)) return null;
  const number = Number(input.includes(',') ? input.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(?:\.\d{3})+$/.test(input) ? input.replace(/\./g, '') : input);
  const cents = Math.round(number * 100);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}
const validCents = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function personalSummary(state: PersonalState, asOf: string) {
  const month = asOf.slice(0, 7);
  const all = state.movements.filter((m) => m.date <= asOf);
  const current = all.filter((m) => m.date.startsWith(month));
  let cash = state.openingCashCents, food = state.openingFoodCents, savings = state.openingSavingsCents;
  for (const m of all) {
    if (m.kind === 'save') { cash -= m.amountCents; savings += m.amountCents; }
    else if (m.kind === 'withdraw') { cash += m.amountCents; savings -= m.amountCents; }
    else if (m.wallet === 'food') food += (m.kind === 'income' ? 1 : -1) * m.amountCents;
    else cash += (m.kind === 'income' ? 1 : -1) * m.amountCents;
  }
  const total = (kind: MovementKind, wallet?: Wallet) => current.filter((m) => m.kind === kind && (!wallet || m.wallet === wallet)).reduce((s, m) => s + m.amountCents, 0);
  const savedThisMonth = Math.max(0, total('save') - total('withdraw'));
  const goalRemaining = Math.max(0, state.profile.savingsGoalCents - savedThisMonth);
  const unpaidBills = state.bills.filter((bill) => !current.some((m) => m.billId === bill.id && m.kind === 'fixed'));
  const pendingFixed = unpaidBills.reduce((s, b) => s + b.amountCents, 0);
  const dailyCash = total('daily', 'cash');
  const income = total('income', 'cash');
  const fixedPaid = total('fixed', 'cash');
  const availableAfterCommitments = cash - pendingFixed - goalRemaining;
  const dayOfMonth = Number(asOf.slice(8, 10));
  const monthDays = new Date(Number(asOf.slice(0, 4)), Number(asOf.slice(5, 7)), 0).getDate();
  const salaryReceived = current.filter(m => m.source === 'salary' && m.kind === 'income').reduce((sum, m) => sum + m.amountCents, 0);
  const salaryPending = Math.max(0, state.profile.salaryCents - salaryReceived);
  const estimatedDailyRemaining = Math.round(dailyCash / dayOfMonth * (monthDays - dayOfMonth));
  const projectedFree = availableAfterCommitments + salaryPending - estimatedDailyRemaining;
  const alerts: { code: string; message: string; severity: 'info' | 'warning' | 'critical' }[] = [];
  const format = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (state.profile.savingsGoalCents > 0) alerts.push({ code: 'savings_goal', severity: goalRemaining === 0 ? 'info' : availableAfterCommitments < 0 ? 'critical' : 'warning', message: goalRemaining === 0 ? 'Meta de guardar dinheiro atingida neste mês.' : `Banco: faltam ${format(goalRemaining)} para sua meta de guardar ${format(state.profile.savingsGoalCents)} neste mês.` });
  const day = Number(asOf.slice(8, 10));
  const daysInMonth = new Date(Number(asOf.slice(0, 4)), Number(asOf.slice(5, 7)), 0).getDate();
  const due = unpaidBills.filter((bill) => Math.min(bill.dueDay, daysInMonth) <= day);
  if (due.length) alerts.push({ code: 'fixed_due', severity: 'warning', message: `${due.length} conta(s) fixa(s) vencida(s) ou com vencimento hoje aguardam registro de pagamento.` });
  if (availableAfterCommitments < 0) alerts.push({ code: 'budget_shortfall', severity: 'critical', message: `Faltam ${format(-availableAfterCommitments)} no saldo atual para cobrir as fixas pendentes e completar sua meta. Entradas previstas ainda não foram creditadas.` });
  if (food < 0) alerts.push({ code: 'food_overdraw', severity: 'critical', message: 'Revise os lançamentos: o saldo do vale-alimentação ficou negativo.' });
  return { cash, food, savings, income, fixedPaid, dailyCash, foodSpent: total('daily', 'food'), savedThisMonth, goalRemaining, pendingFixed, unpaidBills, availableAfterCommitments, alerts, current, salaryPending, estimatedDailyRemaining, projectedFree };
}
export function addMovement(state: PersonalState, movement: Movement, asOf: string): PersonalState {
  if (!validCents(movement.amountCents) || movement.amountCents === 0) throw new Error('Informe um valor maior que zero, com até duas casas decimais.');
  if (!movement.description.trim() || !validDate(movement.date) || movement.date > asOf) throw new Error('Preencha a descrição e uma data válida até hoje.');
  if (state.movements.some((m) => m.id === movement.id)) throw new Error('Esse lançamento já foi registrado.');
  if (movement.source && (movement.kind !== 'income' || (movement.source === 'salary' && movement.wallet !== 'cash') || (movement.source === 'benefit' && movement.wallet !== 'food'))) throw new Error('Selecione a carteira correta para esse recebimento.');
  if (movement.wallet === 'food' && movement.kind !== 'income' && movement.kind !== 'daily') throw new Error('Use o vale-alimentação apenas para entradas de benefício ou compras de alimentação.');
  const summary = personalSummary(state, asOf);
  if (movement.wallet === 'food' && movement.kind === 'daily' && movement.amountCents > summary.food) throw new Error('Saldo insuficiente no vale-alimentação.');
  if (movement.kind === 'save' && movement.amountCents > summary.cash) throw new Error('Saldo disponível insuficiente para guardar esse valor.');
  if (movement.kind === 'withdraw' && movement.amountCents > summary.savings) throw new Error('O resgate não pode superar o dinheiro guardado.');
  if (movement.billId) {
    if (movement.kind !== 'fixed' || !state.bills.some((b) => b.id === movement.billId)) throw new Error('Conta fixa inválida.');
    if (state.movements.some((m) => m.billId === movement.billId && m.date.slice(0, 7) === movement.date.slice(0, 7))) throw new Error('Essa conta já foi paga neste mês.');
  }
  const result = { ...state, movements: [...state.movements, { ...movement, description: movement.description.trim() }] };
  assertRestrictedBalances(result);
  return result;
}
function assertRestrictedBalances(result: PersonalState) {
  // Backdated entries cannot make a restricted wallet negative at any later date.
  let food = result.openingFoodCents, savings = result.openingSavingsCents;
  for (const m of [...result.movements].sort((a, b) => a.date.localeCompare(b.date))) {
    if (m.wallet === 'food') food += m.kind === 'income' ? m.amountCents : -m.amountCents;
    if (m.kind === 'save') savings += m.amountCents;
    if (m.kind === 'withdraw') savings -= m.amountCents;
    if (food < 0 || savings < 0) throw new Error('Essa data deixaria o vale ou a reserva negativos no histórico.');
  }
}
export function removeMovement(state: PersonalState, id: string): PersonalState {
  const result = { ...state, movements: state.movements.filter(m => m.id !== id) };
  assertRestrictedBalances(result);
  return result;
}
export function createPersonalState(asOf: string): PersonalState {
  return { version: 1, demo: true, profile: { name: 'Fundador', salaryCents: 500000, foodCents: 80000, savingsGoalCents: 100000 }, openingCashCents: 600000, openingFoodCents: 80000, openingSavingsCents: 200000, movements: [{ id: 'demo-coffee', date: asOf, description: 'Padaria da esquina', amountCents: 1850, kind: 'daily', wallet: 'cash' }, { id: 'demo-market', date: asOf, description: 'Compras da semana', amountCents: 12490, kind: 'daily', wallet: 'food' }], bills: [{ id: 'rent', name: 'Aluguel', amountCents: 180000, dueDay: 10 }, { id: 'energy', name: 'Luz', amountCents: 18000, dueDay: 20 }, { id: 'internet', name: 'Internet e assinaturas', amountCents: 15000, dueDay: 15 }], tax: 0, target: 3, provisioned: true };
}
export function parsePersonalState(raw: string | null, asOf: string): PersonalState {
  if (!raw) return createPersonalState(asOf);
  const s = JSON.parse(raw) as PersonalState;
  if (s.version !== 1 || typeof s.demo !== 'boolean' || !s.profile || typeof s.profile.name !== 'string' || ![s.openingCashCents, s.openingFoodCents, s.openingSavingsCents, s.profile.salaryCents, s.profile.foodCents, s.profile.savingsGoalCents].every(validCents) || !Array.isArray(s.movements) || !Array.isArray(s.bills) || typeof s.tax !== 'number' || !Number.isFinite(s.tax) || s.tax < 0 || s.tax > 60 || !Number.isInteger(s.target) || s.target < 1 || s.target > 24 || typeof s.provisioned !== 'boolean') throw new Error('Dados salvos inválidos.');
  for (const m of s.movements) if (!m || typeof m.id !== 'string' || typeof m.description !== 'string' || !validDate(m.date) || !validCents(m.amountCents) || !['income', 'fixed', 'daily', 'save', 'withdraw'].includes(m.kind) || !['cash', 'food'].includes(m.wallet) || (m.wallet === 'food' && !['income', 'daily'].includes(m.kind))) throw new Error('Lançamentos salvos inválidos.');
  for (const b of s.bills) if (!b || typeof b.id !== 'string' || typeof b.name !== 'string' || !validCents(b.amountCents) || !Number.isInteger(b.dueDay) || b.dueDay < 1 || b.dueDay > 31) throw new Error('Contas salvas inválidas.');
  return s;
}
