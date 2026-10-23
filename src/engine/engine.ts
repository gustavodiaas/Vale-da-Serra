import type { Alert, Confidence, EngineInput, Forecast, Light, ScenarioResult, StageId, Tx } from './types';

export const PRO_LABORE = 'pro_labore';
const HISTORY_MONTHS = 6;
const BURN_WEIGHTS = [3, 2, 1];
const RESERVE_REBUILD_MONTHS = 6;

export const monthOf = (date: string) => date.slice(0, 7);

/** Meses completos anteriores a asOf, do mais recente ao mais antigo. */
export function previousMonths(asOf: string, n: number): string[] {
  let y = Number(asOf.slice(0, 4));
  let m = Number(asOf.slice(5, 7));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    out.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return out;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return (s[lo] ?? 0) + ((s[hi] ?? 0) - (s[lo] ?? 0)) * (idx - lo);
}

interface Month {
  key: string;
  income: number;
  outflow: number;
  proLabore: number;
}

/** Histórico mensal (mais recente primeiro). Meses anteriores ao primeiro lançamento não contam como zero. */
export function monthlyHistory(txs: Tx[], asOf: string): Month[] {
  const paid = txs.filter((t) => t.status === 'paid');
  if (paid.length === 0) return [];
  const first = paid.map((t) => monthOf(t.occurredOn)).sort()[0] as string;
  return previousMonths(asOf, HISTORY_MONTHS)
    .filter((key) => key >= first)
    .map((key) => {
      const inMonth = paid.filter((t) => monthOf(t.occurredOn) === key);
      let income = 0;
      let outflow = 0;
      let proLabore = 0;
      for (const t of inMonth) {
        if (t.category === PRO_LABORE) proLabore += t.amountCents;
        else if (t.kind === 'in' && t.operational !== false) income += t.amountCents;
        else if (t.kind === 'out') outflow += t.amountCents;
      }
      return { key, income, outflow, proLabore };
    });
}

function weightedBurn(history: Month[]): number {
  let sum = 0;
  let weights = 0;
  history.slice(0, BURN_WEIGHTS.length).forEach((m, i) => {
    const w = BURN_WEIGHTS[i] ?? 1;
    sum += m.outflow * w;
    weights += w;
  });
  return weights === 0 ? 0 : Math.round(sum / weights);
}

function streak(history: Month[], test: (m: Month) => boolean): number {
  let n = 0;
  for (const m of history) {
    if (!test(m)) break;
    n++;
  }
  return n;
}

function scenario(income: number, burn: number, cash: number, taxRate: number, target: number): ScenarioResult {
  const incomeCents = Math.round(income);
  const taxCents = Math.round(incomeCents * taxRate);
  const net = incomeCents - taxCents - burn;
  const runwayMonths = net >= 0 ? null : cash / -net;
  const light: Light = net >= 0 ? 'verde' : (runwayMonths as number) >= target ? 'amarelo' : 'vermelho';
  return { incomeCents, taxCents, netMonthlyCents: net, projected30dCents: cash + net, runwayMonths, light };
}

export function stageFor(
  runway: number,
  o: { taxProvisioned: boolean; monthsInBlack: number; proLaboreMonths: number },
): StageId {
  if (runway < 1) return 'garagem';
  if (runway < 3 || !o.taxProvisioned) return 'pre-seed';
  if (runway < 6 || o.monthsInBlack < 3) return 'seed';
  if (runway < 12 || o.proLaboreMonths < 6) return 'serie-a';
  return 'unicornio';
}

function confidenceFor(months: number): Confidence {
  return months >= 5 ? 'alta' : months >= 3 ? 'media' : 'baixa';
}

export function computeForecast(input: EngineInput): Forecast {
  const { cashCents: cash, taxRate, targetRunwayMonths: target } = input;
  const history = monthlyHistory(input.txs, input.asOf);
  const incomes = history.map((m) => m.income);
  const burn = weightedBurn(history);

  const scenarios = {
    pessimista: scenario(percentile(incomes, 0.25), burn, cash, taxRate, target),
    provavel: scenario(percentile(incomes, 0.5), burn, cash, taxRate, target),
    otimista: scenario(percentile(incomes, 0.75), burn, cash, taxRate, target),
  };

  const runwayNoIncome = burn > 0 ? cash / burn : Infinity;
  const monthsInBlack = streak(history, (m) => m.income > m.outflow);
  const proLaboreMonths = streak(history, (m) => m.proLabore > 0);

  // pró-labore: o que sobra no mês ruim, descontando a recomposição da reserva-alvo em 6 meses
  const reserveShortfall = Math.max(0, target * burn - cash);
  const topUp = reserveShortfall / RESERVE_REBUILD_MONTHS;
  const rawWithdrawal = Math.max(0, scenarios.pessimista.netMonthlyCents - topUp);
  const proLaboreSugeridoCents = Math.floor(rawWithdrawal / 100) * 100;

  const confidence = confidenceFor(history.length);
  const alerts: Alert[] = [];
  if (runwayNoIncome < 1)
    alerts.push({ code: 'runway_critical', severity: 'critical', message: 'O caixa cobre menos de 1 mês sem entradas.' });
  else if (runwayNoIncome < target)
    alerts.push({ code: 'runway_low', severity: 'warning', message: `O fôlego do caixa está abaixo da sua meta de ${target} meses.` });
  if (burn > 0 && burn > scenarios.provavel.incomeCents - scenarios.provavel.taxCents)
    alerts.push({ code: 'burn_above_income', severity: 'warning', message: 'O custo mensal está acima da receita provável, já descontado o imposto.' });
  if (!input.taxProvisioned && scenarios.provavel.incomeCents > 0)
    alerts.push({ code: 'tax_not_provisioned', severity: 'warning', message: 'O imposto ainda não está sendo separado a cada entrada.' });
  if (confidence === 'baixa')
    alerts.push({ code: 'low_confidence', severity: 'info', message: 'Poucos meses de histórico: a projeção ainda é um chute educado.' });

  return {
    confidence,
    monthsOfData: history.length,
    burnCents: burn,
    runwayNoIncomeMonths: Number.isFinite(runwayNoIncome) ? runwayNoIncome : null,
    scenarios,
    proLaboreSugeridoCents,
    monthsInBlack,
    proLaboreMonths,
    stage: stageFor(runwayNoIncome, { taxProvisioned: input.taxProvisioned, monthsInBlack, proLaboreMonths }),
    alerts,
  };
}
