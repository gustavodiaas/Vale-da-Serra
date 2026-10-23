import { lazy, Suspense, useMemo, useState } from 'react';
import { computeForecast } from './engine/engine';
import type { Light, ScenarioId, StageId } from './engine/types';
import { demoTxs } from './demo';
import { supabase } from './lib/supabase';
const Vale = lazy(() => import('./vale/Vale').then((m) => ({ default: m.Vale })));

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const months = (n: number | null) => (n === null ? 'sem custos' : n >= 12 ? '12 meses ou mais' : `${n.toFixed(1).replace('.', ',')} meses`);

const STAGES: Record<StageId, string> = {
  garagem: 'Garagem',
  'pre-seed': 'Pré-seed',
  seed: 'Seed',
  'serie-a': 'Série A',
  unicornio: 'Unicórnio',
};
const SCENARIOS: [ScenarioId, string][] = [
  ['pessimista', 'Mês ruim'],
  ['provavel', 'Mês provável'],
  ['otimista', 'Mês bom'],
];
const LIGHT: Record<Light, string> = { verde: 'No azul', amarelo: 'Consome caixa', vermelho: 'Zona de risco' };
const CONFIDENCE = { baixa: 'baixa', media: 'média', alta: 'alta' } as const;

export default function App() {
  const asOf = new Date().toISOString().slice(0, 10);
  const txs = useMemo(() => demoTxs(asOf), [asOf]);
  const [cash, setCash] = useState(6000);
  const [tax, setTax] = useState(6);
  const [target, setTarget] = useState(3);
  const [provisioned, setProvisioned] = useState(false);

  const f = useMemo(
    () => computeForecast({ txs, cashCents: Math.round(cash * 100), asOf, taxRate: tax / 100, targetRunwayMonths: target, taxProvisioned: provisioned }),
    [txs, cash, tax, target, provisioned, asOf],
  );

  return (
    <main>
      <header>
        <h1>Garagem</h1>
        <p className="muted">
          {supabase ? 'Conectado ao Supabase.' : 'Dados de demonstração. Conecte o Supabase para usar os seus.'} Confiança da projeção: {CONFIDENCE[f.confidence]}.
        </p>
      </header>

      <div className="layout">
      <div className="vale-wrap">
        <Suspense fallback={<div className="vale-canvas" />}>
          <Vale stage={f.stage} />
        </Suspense>
        <div className="stage" aria-label="Estágio">
          <span>Estágio atual</span>
          <strong>{STAGES[f.stage]}</strong>
        </div>
      </div>
      <div className="side">

      <section className="grid">
        <div className="tile"><span>Fôlego sem nenhuma entrada</span><strong>{months(f.runwayNoIncomeMonths)}</strong></div>
        <div className="tile"><span>Custo mensal (burn)</span><strong>{brl(f.burnCents)}</strong></div>
        <div className="tile"><span>Pró-labore sugerido</span><strong>{brl(f.proLaboreSugeridoCents)}</strong></div>
        <div className="tile"><span>Meses seguidos no azul</span><strong>{f.monthsInBlack}</strong></div>
      </section>

      <h2>Previsão do próximo mês</h2>
      <section className="grid three">
        {SCENARIOS.map(([id, label]) => {
          const s = f.scenarios[id];
          return (
            <div key={id} className={`tile light-${s.light}`}>
              <span>{label}</span>
              <strong>{brl(s.projected30dCents)}</strong>
              <small>{LIGHT[s.light]} · receita {brl(s.incomeCents)}, imposto {brl(s.taxCents)}</small>
              <small>{s.runwayMonths === null ? 'Sem consumo de caixa' : `Caixa dura ${months(s.runwayMonths)} nesse ritmo`}</small>
            </div>
          );
        })}
      </section>

      {f.alerts.length > 0 && (
        <>
          <h2>Conselho</h2>
          <ul className="alerts">
            {f.alerts.map((a) => (
              <li key={a.code} className={`sev-${a.severity}`}>{a.message}</li>
            ))}
          </ul>
        </>
      )}

      <h2>Ajustes de teste</h2>
      <section className="controls">
        <label>Caixa hoje (R$)<input type="number" min="0" step="100" value={cash} onChange={(e) => setCash(Number(e.target.value) || 0)} /></label>
        <label>Imposto sobre a receita (%)<input type="number" min="0" max="60" value={tax} onChange={(e) => setTax(Number(e.target.value) || 0)} /></label>
        <label>Meta de fôlego (meses)<input type="number" min="1" max="24" value={target} onChange={(e) => setTarget(Number(e.target.value) || 1)} /></label>
        <label className="check"><input type="checkbox" checked={provisioned} onChange={(e) => setProvisioned(e.target.checked)} /> Imposto separado a cada entrada</label>
      </section>
      </div>
      </div>
    </main>
  );
}
