import type { Tx } from './engine/types';

// Seis meses de renda irregular (centavos) para o app rodar antes do Supabase estar ligado.
const incomes = [320000, 610000, 180000, 450000, 520000, 280000];
const outs = [290000, 310000, 300000, 320000, 305000, 315000];

export function demoTxs(asOf: string): Tx[] {
  let y = Number(asOf.slice(0, 4));
  let m = Number(asOf.slice(5, 7));
  const txs: Tx[] = [];
  for (let i = 0; i < 6; i++) {
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    const mm = `${y}-${String(m).padStart(2, '0')}`;
    txs.push({ occurredOn: `${mm}-10`, kind: 'in', amountCents: incomes[i] as number, status: 'paid' });
    txs.push({ occurredOn: `${mm}-15`, kind: 'out', amountCents: outs[i] as number, status: 'paid' });
  }
  return txs;
}
