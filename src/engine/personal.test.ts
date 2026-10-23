import { describe, expect, it } from 'vitest';
import { addMovement, createPersonalState, moneyInput, parsePersonalState, personalSummary, removeMovement, type Movement } from './personal';
const today = '2026-10-23';
const base = () => ({ ...createPersonalState(today), movements: [] });
const movement = (over: Partial<Movement> = {}): Movement => ({ id: '1', date: today, description: 'Compra', amountCents: 10000, kind: 'daily', wallet: 'cash', ...over });
describe('finanças pessoais', () => {
  it('separa compras com vale do saldo e dos gastos em dinheiro', () => {
    const s = addMovement(base(), movement({ wallet: 'food' }), today);
    const result = personalSummary(s, today);
    expect(result.food).toBe(70000); expect(result.cash).toBe(600000); expect(result.dailyCash).toBe(0); expect(result.foodSpent).toBe(10000);
  });
  it('perfil prevê salário e vale sem creditar dinheiro automaticamente', () => {
    const s = { ...base(), openingCashCents: 0, openingFoodCents: 0 };
    expect(personalSummary(s, today).income).toBe(0); expect(personalSummary(s, today).cash).toBe(0); expect(personalSummary(s, today).food).toBe(0);
  });
  it('guarda e resgata sem contar transferências como entradas ou gastos', () => {
    let s = addMovement(base(), movement({ kind: 'save', amountCents: 100000 }), today);
    s = addMovement(s, movement({ id: '2', kind: 'withdraw', amountCents: 20000 }), today);
    const result = personalSummary(s, today);
    expect(result.cash).toBe(520000); expect(result.savings).toBe(280000); expect(result.income).toBe(0); expect(result.savedThisMonth).toBe(80000); expect(result.goalRemaining).toBe(20000);
  });
  it('veda compras com vale ou resgates sem saldo e vale em conta fixa', () => {
    expect(() => addMovement(base(), movement({ wallet: 'food', amountCents: 90000 }), today)).toThrow('insuficiente');
    expect(() => addMovement(base(), movement({ kind: 'withdraw', amountCents: 300000 }), today)).toThrow('resgate');
    expect(() => addMovement(base(), movement({ kind: 'fixed', wallet: 'food' }), today)).toThrow('alimentação');
  });
  it('pagar conta baixa o caixa e tira a obrigação pendente, sem duplicá-la', () => {
    const s = addMovement(base(), movement({ kind: 'fixed', billId: 'rent', amountCents: 180000 }), today);
    const result = personalSummary(s, today);
    expect(result.cash).toBe(420000); expect(result.pendingFixed).toBe(33000); expect(result.fixedPaid).toBe(180000);
    expect(() => addMovement(s, movement({ id: '2', kind: 'fixed', billId: 'rent' }), today)).toThrow('já foi paga');
  });
  it('vira o mês mantendo saldos e renovando obrigações e meta', () => {
    const s = addMovement(base(), movement({ kind: 'save', amountCents: 100000 }), today);
    const result = personalSummary(s, '2026-11-01');
    expect(result.savings).toBe(300000); expect(result.goalRemaining).toBe(100000); expect(result.pendingFixed).toBe(213000);
  });
  it('aceita salário parcelado e outras entradas sem duplicar o mesmo id', () => {
    const s = addMovement(base(), movement({ kind: 'income', source: 'salary' }), today);
    expect(() => addMovement(s, movement({ kind: 'income', source: 'salary' }), today)).toThrow('já foi registrado');
    expect(personalSummary(addMovement(s, movement({ id: '2', kind: 'income', source: 'salary' }), today), today).income).toBe(20000);
    expect(personalSummary(addMovement(s, movement({ id: '3', kind: 'income' }), today), today).income).toBe(20000);
  });
  it('excluir pagamento restaura saldo e obrigação da conta fixa', () => {
    const s = addMovement(base(), movement({ kind: 'fixed', billId: 'rent', amountCents: 180000 }), today);
    expect(personalSummary(removeMovement(s, '1'), today).pendingFixed).toBe(213000);
    expect(personalSummary(removeMovement(s, '1'), today).cash).toBe(600000);
  });
  it('não exclui um depósito de vale já comprometido com compras', () => {
    let s = addMovement({ ...base(), openingFoodCents: 0 }, movement({ kind: 'income', wallet: 'food', source: 'benefit' }), today);
    s = addMovement(s, movement({ id: '2', wallet: 'food' }), today);
    expect(() => removeMovement(s, '1')).toThrow('histórico');
  });
  it('crédito de vale aumenta apenas a carteira de alimentação', () => {
    const result = personalSummary(addMovement(base(), movement({ kind: 'income', wallet: 'food', source: 'benefit', amountCents: 80000 }), today), today);
    expect(result.food).toBe(160000); expect(result.cash).toBe(600000); expect(result.income).toBe(0);
    expect(() => addMovement(base(), movement({ kind: 'income', wallet: 'food', source: 'salary' }), today)).toThrow('carteira');
  });
  it('meta concluída passa a aviso informativo, sem descontar a meta duas vezes', () => {
    const s = addMovement(base(), movement({ kind: 'save', amountCents: 100000 }), today);
    const result = personalSummary(s, today);
    expect(result.goalRemaining).toBe(0); expect(result.availableAfterCommitments).toBe(287000);
    expect(result.alerts.find(a => a.code === 'savings_goal')?.severity).toBe('info');
  });
  it('a data retroativa não pode gastar um vale que só entrou depois', () => {
    const s = addMovement({ ...base(), openingFoodCents: 0 }, movement({ kind: 'income', wallet: 'food', source: 'benefit' }), today);
    expect(() => addMovement(s, movement({ id: 'old', date: '2026-10-01', wallet: 'food' }), today)).toThrow('histórico');
  });
  it('recebimento do salário retira a previsão sem somar o salário duas vezes', () => {
    const s = addMovement(base(), movement({ kind: 'income', source: 'salary', amountCents: 500000 }), today);
    expect(personalSummary(s, today).salaryPending).toBe(0);
    expect(personalSummary(s, today).projectedFree).toBe(personalSummary(base(), today).projectedFree);
  });
  it('valida centavos, datas e número seguro', () => {
    for (const amountCents of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => addMovement(base(), movement({ amountCents }), today)).toThrow();
    expect(() => addMovement(base(), movement({ date: '2026-11-01' }), today)).toThrow('data');
    expect(() => addMovement(base(), movement({ date: '2026-02-30' }), today)).toThrow('data');
  });
  it('alerta quando as fixas e a meta comprometem o caixa disponível', () => {
    const result = personalSummary({ ...base(), openingCashCents: 10000 }, today);
    expect(result.availableAfterCommitments).toBe(-303000);
    expect(result.alerts.some(a => a.code === 'budget_shortfall')).toBe(true);
    expect(result.alerts.some(a => a.code === 'savings_goal')).toBe(true);
  });
  it('aceita reais em formato brasileiro e rejeita valores ambíguos', () => {
    expect(moneyInput('1.234,56')).toBe(123456); expect(moneyInput('18,50')).toBe(1850); expect(moneyInput('18.50')).toBe(1850);
    expect(moneyInput('1.234')).toBe(123400);
    expect(moneyInput('')).toBeNull(); expect(moneyInput('-1')).toBeNull(); expect(moneyInput('1,234')).toBeNull();
  });
  it('recupera dados salvos e rejeita um arquivo corrompido', () => {
    expect(parsePersonalState(JSON.stringify(base()), today)).toEqual(base());
    expect(() => parsePersonalState('{', today)).toThrow();
    expect(() => parsePersonalState(JSON.stringify({ ...base(), openingCashCents: -100 }), today)).toThrow();
  });
  it('usa o último dia do mês para contas com vencimento no dia 31', () => {
    const result = personalSummary({ ...base(), bills: [{ id: 'x', name: 'Conta', amountCents: 100, dueDay: 31 }] }, '2026-02-28');
    expect(result.alerts.some(a => a.code === 'fixed_due')).toBe(true);
  });
});
