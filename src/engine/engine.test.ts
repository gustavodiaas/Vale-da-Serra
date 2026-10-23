import { describe, expect, it } from 'vitest';
import { computeForecast, percentile, previousMonths } from './engine';
import type { EngineInput, Tx } from './types';

const ASOF = '2026-10-23';
const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

const steady = (income = 500000, out = 300000): Tx[] =>
  MONTHS.flatMap((m) => [
    { occurredOn: `${m}-10`, kind: 'in' as const, amountCents: income, status: 'paid' as const },
    { occurredOn: `${m}-15`, kind: 'out' as const, amountCents: out, status: 'paid' as const },
  ]);

const base = (over: Partial<EngineInput> = {}): EngineInput => ({
  txs: steady(),
  cashCents: 600000,
  asOf: ASOF,
  taxRate: 0.06,
  targetRunwayMonths: 3,
  taxProvisioned: false,
  ...over,
});

describe('utilitários', () => {
  it('lista meses completos anteriores, virando o ano', () => {
    expect(previousMonths('2026-02-10', 3)).toEqual(['2026-01', '2025-12', '2025-11']);
  });
  it('percentil interpola', () => {
    expect(percentile([100, 200, 300, 400], 0.5)).toBe(250);
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe('computeForecast', () => {
  it('não quebra sem dados e marca confiança baixa', () => {
    const f = computeForecast(base({ txs: [], cashCents: 0 }));
    expect(f.confidence).toBe('baixa');
    expect(f.burnCents).toBe(0);
    expect(f.stage).not.toBe('unicornio');
  });

  it('renda estável: três cenários iguais, no azul', () => {
    const f = computeForecast(base());
    expect(f.confidence).toBe('alta');
    expect(f.burnCents).toBe(300000);
    for (const s of Object.values(f.scenarios)) {
      expect(s.netMonthlyCents).toBe(170000);
      expect(s.runwayMonths).toBeNull();
      expect(s.light).toBe('verde');
    }
    expect(f.monthsInBlack).toBe(6);
  });

  it('renda irregular: pessimista <= provável <= otimista', () => {
    const incomes = [200000, 800000, 400000, 0, 600000, 300000];
    const txs: Tx[] = MONTHS.flatMap((m, i) => [
      { occurredOn: `${m}-10`, kind: 'in' as const, amountCents: incomes[i] as number, status: 'paid' as const },
      { occurredOn: `${m}-15`, kind: 'out' as const, amountCents: 300000, status: 'paid' as const },
    ]);
    const { scenarios: s } = computeForecast(base({ txs }));
    expect(s.pessimista.incomeCents).toBeLessThanOrEqual(s.provavel.incomeCents);
    expect(s.provavel.incomeCents).toBeLessThanOrEqual(s.otimista.incomeCents);
    expect(s.pessimista.runwayMonths).not.toBeNull();
  });

  it('meses antes do primeiro lançamento não contam como zero', () => {
    const txs = steady().filter((t) => t.occurredOn >= '2026-08-01');
    const f = computeForecast(base({ txs }));
    expect(f.monthsOfData).toBe(2);
    expect(f.scenarios.pessimista.incomeCents).toBe(500000);
  });

  it('ignora lançamentos agendados no histórico', () => {
    const txs = [...steady(), { occurredOn: '2026-09-20', kind: 'out' as const, amountCents: 9000000, status: 'scheduled' as const }];
    expect(computeForecast(base({ txs })).burnCents).toBe(300000);
  });

  it('transferências e pró-labore ficam fora do custo', () => {
    const txs: Tx[] = [
      ...steady(),
      { occurredOn: '2026-09-25', kind: 'transfer', amountCents: 900000, status: 'paid', category: 'pro_labore' },
      { occurredOn: '2026-09-26', kind: 'transfer', amountCents: 700000, status: 'paid' },
    ];
    expect(computeForecast(base({ txs })).burnCents).toBe(300000);
  });

  it('aporte não operacional não vira receita', () => {
    const txs: Tx[] = [...steady(), { occurredOn: '2026-09-02', kind: 'in', amountCents: 5000000, status: 'paid', operational: false }];
    expect(computeForecast(base({ txs })).scenarios.provavel.incomeCents).toBe(500000);
  });
});

describe('estágios e pró-labore', () => {
  it('2 meses de fôlego é pré-seed', () => {
    expect(computeForecast(base({ cashCents: 600000 })).stage).toBe('pre-seed');
  });
  it('seed exige imposto separado', () => {
    expect(computeForecast(base({ cashCents: 900000, taxProvisioned: false })).stage).toBe('pre-seed');
    expect(computeForecast(base({ cashCents: 900000, taxProvisioned: true })).stage).toBe('seed');
  });
  it('série A exige 6 meses de fôlego e 3 meses no azul', () => {
    expect(computeForecast(base({ cashCents: 1800000, taxProvisioned: true })).stage).toBe('serie-a');
    const semAzul = steady(250000, 300000);
    expect(computeForecast(base({ txs: semAzul, cashCents: 1800000, taxProvisioned: true })).stage).toBe('seed');
  });
  it('unicórnio exige 12 meses e 6 meses de pró-labore', () => {
    const pl: Tx[] = MONTHS.map((m) => ({ occurredOn: `${m}-20`, kind: 'transfer', amountCents: 100000, status: 'paid', category: 'pro_labore' }));
    expect(computeForecast(base({ txs: [...steady(), ...pl], cashCents: 3600000, taxProvisioned: true })).stage).toBe('unicornio');
    expect(computeForecast(base({ cashCents: 3600000, taxProvisioned: true })).stage).toBe('serie-a');
  });
  it('pró-labore com reserva cheia é a sobra do mês ruim; nunca negativo', () => {
    const cheio = computeForecast(base({ cashCents: 900000 }));
    expect(cheio.proLaboreSugeridoCents).toBe(170000);
    const apertado = computeForecast(base({ txs: steady(250000, 300000), cashCents: 0 }));
    expect(apertado.proLaboreSugeridoCents).toBe(0);
  });
  it('reserva abaixo da meta reduz o pró-labore sugerido', () => {
    // meta 900000, caixa 300000: faltam 600000 em 6 meses = 100000 por mês
    expect(computeForecast(base({ cashCents: 300000 })).proLaboreSugeridoCents).toBe(70000);
  });
});
