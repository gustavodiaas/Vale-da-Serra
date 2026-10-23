import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { computeForecast } from './engine/engine';
import type { Light, ScenarioId, StageId, Tx, TxKind } from './engine/types';
import { demoTxs } from './demo';
import { supabase } from './lib/supabase';
import type { LabelId, ValeHandle } from './vale/createVale';
import type { ValeWeather, WeatherKind } from './vale/weather';

const Vale = lazy(() => import('./vale/Vale').then((m) => ({ default: m.Vale })));

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const months = (n: number | null) => (n === null ? 'sem custos' : n >= 12 ? '12 meses ou mais' : `${n.toFixed(1).replace('.', ',')} meses`);

const STAGES: { id: StageId; name: string; rule: string; at: number }[] = [
  { id: 'garagem', name: 'Garagem', rule: 'Fôlego abaixo de 1 mês', at: 1 },
  { id: 'pre-seed', name: 'Pré-seed', rule: 'Fôlego de 1 a 2 meses', at: 3 },
  { id: 'seed', name: 'Seed', rule: '3 meses de fôlego e imposto separado', at: 6 },
  { id: 'serie-a', name: 'Série A', rule: '6 meses de fôlego e 3 meses seguidos no azul', at: 12 },
  { id: 'unicornio', name: 'Unicórnio', rule: '12 meses de fôlego e pró-labore por 6 meses seguidos', at: 12 },
];
const SCENARIOS: [ScenarioId, string][] = [
  ['pessimista', 'Mês ruim'],
  ['provavel', 'Mês provável'],
  ['otimista', 'Mês bom'],
];
const LIGHT: Record<Light, string> = { verde: 'No azul', amarelo: 'Consome caixa', vermelho: 'Zona de risco' };
const WEATHER: Record<WeatherKind, string> = { clear: 'Céu limpo', cloudy: 'Nublado', fog: 'Neblina', rain: 'Chuva', snow: 'Neve', storm: 'Tempestade' };

const ICONS = {
  wallet: 'M3 7h15a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7zm0 0 2-3h11M16 14h2',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeoff: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.7C3.9 8.5 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  swap: 'M7 4l-4 4 4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  home: 'M3 11l9-8 9 8v10H3z',
  chevron: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

type Panel = 'caixa' | 'cenarios' | 'conselho' | 'marcos' | 'ajustes';
const NAV: { id: Panel; label: string; icon: keyof typeof ICONS }[] = [
  { id: 'caixa', label: 'Caixa', icon: 'wallet' },
  { id: 'cenarios', label: 'Cenários', icon: 'chart' },
  { id: 'conselho', label: 'Conselho', icon: 'bell' },
  { id: 'marcos', label: 'Marcos', icon: 'flag' },
  { id: 'ajustes', label: 'Ajustes', icon: 'sliders' },
];
const TITLES: Record<Panel, string> = { caixa: 'Caixa e fôlego', cenarios: 'Previsão do próximo mês', conselho: 'Conselho', marcos: 'Marcos', ajustes: 'Ajustes de teste' };
const LAUNCH: Record<TxKind, string> = { out: 'Despesa', in: 'Receita', transfer: 'Transferência' };

export default function App() {
  const asOf = new Date().toISOString().slice(0, 10);
  const baseTxs = useMemo(() => demoTxs(asOf), [asOf]);
  const [extra, setExtra] = useState<Tx[]>([]);
  const [cash, setCash] = useState(6000);
  const [tax, setTax] = useState(6);
  const [target, setTarget] = useState(3);
  const [provisioned, setProvisioned] = useState(false);
  const [coins, setCoins] = useState(590);
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [launch, setLaunch] = useState<TxKind | null>(null);
  const [amount, setAmount] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [weather, setWeather] = useState<ValeWeather | null>(null);
  const [vale, setVale] = useState<ValeHandle | null>(null);

  const txs = useMemo(() => [...baseTxs, ...extra], [baseTxs, extra]);
  const f = useMemo(
    () => computeForecast({ txs, cashCents: Math.round(cash * 100), asOf, taxRate: tax / 100, targetRunwayMonths: target, taxProvisioned: provisioned }),
    [txs, cash, tax, target, provisioned, asOf],
  );

  const stageIdx = STAGES.findIndex((s) => s.id === f.stage);
  const cur = STAGES[stageIdx] ?? STAGES[0]!;
  const runway = f.runwayNoIncomeMonths ?? 12;
  const prevAt = stageIdx > 0 ? (STAGES[stageIdx - 1]?.at ?? 0) : 0;
  const progress = Math.max(0, Math.min(1, (runway - prevAt) / Math.max(0.1, cur.at - prevAt)));
  const probable = f.scenarios.provavel;

  const labels = useMemo<Partial<Record<LabelId, string>>>(
    () => ({
      garagem: `Fôlego ${months(f.runwayNoIncomeMonths)}`,
      coworking: `Burn ${brl(f.burnCents)}`,
      escritorio: `Meta ${target} meses de fôlego`,
      campus: `${f.monthsInBlack} meses no azul`,
      torre: 'Unicórnio',
      compliance: provisioned ? 'Imposto separado' : 'Imposto a separar',
      conselho: f.alerts.length === 0 ? 'Sem alertas' : `${f.alerts.length} ${f.alerts.length === 1 ? 'alerta' : 'alertas'}`,
      cafe: `Pró-labore ${brl(f.proLaboreSugeridoCents)}`,
    }),
    [f, target, provisioned],
  );

  const onReady = useCallback((h: ValeHandle | null) => setVale(h), []);
  const night = weather ? !weather.isDay : false;

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const closeLaunch = () => {
    setLaunch(null);
    setAmount('');
  };
  const confirmLaunch = () => {
    const value = Number(amount.replace(',', '.'));
    if (!launch || !Number.isFinite(value) || value <= 0) return;
    const cents = Math.round(value * 100);
    setExtra((p) => [...p, { occurredOn: asOf, kind: launch, amountCents: cents, status: 'paid' }]);
    if (launch === 'in') setCash((c) => c + value);
    if (launch === 'out') setCash((c) => Math.max(0, c - value));
    setCoins((c) => c + 10);
    setToast(`${LAUNCH[launch]} lançada: ${brl(cents)}. +10 equity`);
    closeLaunch();
  };

  return (
    <div className={`app ${night ? 'night' : 'day'}`}>
      <Suspense fallback={<div className="vale-stage" />}>
        <Vale stage={f.stage} labels={labels} onReady={onReady} onWeather={setWeather} />
      </Suspense>

      <header className="topbar glass">
        <div className="brand">Garagem</div>
        <div className="level" title={`Fôlego ${months(f.runwayNoIncomeMonths)}`}>
          <b>Nível {stageIdx + 1}</b>
          <span className="xp"><i style={{ width: `${Math.round(progress * 100)}%` }} /></span>
          <small>{cur.name}</small>
        </div>
        <div className="spacer" />
        {weather && (
          <div className="chip" title="Clima real da sua cidade">
            {WEATHER[weather.kind]}{weather.tempC !== null ? ` · ${Math.round(weather.tempC)}°C` : ''}{weather.isDay ? '' : ' · noite'}
          </div>
        )}
        <div className="chip coins" title="Equity">
          <span className="coin" />
          {coins.toLocaleString('pt-BR')}
        </div>
        <button className="icon-btn" aria-label="Conselho" onClick={() => setPanel('conselho')}>
          <Icon name="bell" />
          {f.alerts.length > 0 && <em>{f.alerts.length}</em>}
        </button>
        <button className="profile" disabled title="Em breve">
          <Icon name="user" /> Perfil
        </button>
      </header>

      <nav className="sidebar glass" aria-label="Menu">
        {NAV.map((n) => (
          <button key={n.id} className={panel === n.id ? 'on' : ''} onClick={() => setPanel(panel === n.id ? null : n.id)}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
            {n.id === 'conselho' && f.alerts.length > 0 && <em>{f.alerts.length}</em>}
          </button>
        ))}
      </nav>

      <section className="balance glass" aria-label="Saldo">
        <div className="bal-row">
          <div>
            <small>Caixa hoje</small>
            <strong>{hidden ? 'R$ ••••••' : brl(Math.round(cash * 100))}</strong>
          </div>
          <div>
            <small>Projetado em 30 dias</small>
            <strong className={`l-${probable.light}`}>{hidden ? 'R$ ••••' : brl(probable.projected30dCents)}</strong>
          </div>
          <button className="icon-btn flat" aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'} onClick={() => setHidden((h) => !h)}>
            <Icon name={hidden ? 'eye' : 'eyeoff'} />
          </button>
          <button className={`icon-btn flat chev ${open ? 'up' : ''}`} aria-label="Detalhes" onClick={() => setOpen((o) => !o)}>
            <Icon name="chevron" />
          </button>
        </div>
        {open && (
          <div className="bal-more">
            <div><small>Fôlego sem entradas</small><b>{months(f.runwayNoIncomeMonths)}</b></div>
            <div><small>Burn mensal</small><b>{hidden ? 'R$ ••••' : brl(f.burnCents)}</b></div>
            <div><small>Pró-labore sugerido</small><b>{hidden ? 'R$ ••••' : brl(f.proLaboreSugeridoCents)}</b></div>
          </div>
        )}
      </section>

      {panel && (
        <aside className="drawer glass" aria-label={TITLES[panel]}>
          <div className="drawer-head">
            <h2>{TITLES[panel]}</h2>
            <button className="icon-btn flat" aria-label="Fechar" onClick={() => setPanel(null)}><Icon name="close" /></button>
          </div>
          <div className="drawer-body">
            {panel === 'caixa' && (
              <div className="grid2">
                <div className="tile"><span>Fôlego sem nenhuma entrada</span><strong>{months(f.runwayNoIncomeMonths)}</strong></div>
                <div className="tile"><span>Custo mensal (burn)</span><strong>{brl(f.burnCents)}</strong></div>
                <div className="tile"><span>Pró-labore sugerido</span><strong>{brl(f.proLaboreSugeridoCents)}</strong></div>
                <div className="tile"><span>Meses seguidos no azul</span><strong>{f.monthsInBlack}</strong></div>
                <p className="muted full">Confiança da projeção: {f.confidence === 'media' ? 'média' : f.confidence}. {supabase ? 'Conectado ao Supabase.' : 'Dados de demonstração.'}</p>
              </div>
            )}
            {panel === 'cenarios' && (
              <div className="stack">
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
              </div>
            )}
            {panel === 'conselho' &&
              (f.alerts.length === 0 ? (
                <p className="muted">O Conselho não tem nada a reclamar hoje.</p>
              ) : (
                <ul className="alerts">
                  {f.alerts.map((a) => (
                    <li key={a.code} className={`sev-${a.severity}`}>{a.message}</li>
                  ))}
                </ul>
              ))}
            {panel === 'marcos' && (
              <ol className="ladder">
                {STAGES.map((s, i) => (
                  <li key={s.id} className={i < stageIdx ? 'done' : i === stageIdx ? 'now' : ''}>
                    <b>{s.name}</b>
                    <span>{s.rule}</span>
                  </li>
                ))}
              </ol>
            )}
            {panel === 'ajustes' && (
              <div className="stack">
                <label>Caixa hoje (R$)<input type="number" min="0" step="100" value={cash} onChange={(e) => setCash(Number(e.target.value) || 0)} /></label>
                <label>Imposto sobre a receita (%)<input type="number" min="0" max="60" value={tax} onChange={(e) => setTax(Number(e.target.value) || 0)} /></label>
                <label>Meta de fôlego (meses)<input type="number" min="1" max="24" value={target} onChange={(e) => setTarget(Number(e.target.value) || 1)} /></label>
                <label className="check"><input type="checkbox" checked={provisioned} onChange={(e) => setProvisioned(e.target.checked)} /> Imposto separado a cada entrada</label>
              </div>
            )}
          </div>
        </aside>
      )}

      <div className="dock glass" role="toolbar" aria-label="Lançar">
        <button className="out" onClick={() => setLaunch('out')}><Icon name="minus" /> Despesa</button>
        <button className="in" onClick={() => setLaunch('in')}><Icon name="plus" /> Receita</button>
        <button className="tr" onClick={() => setLaunch('transfer')}><Icon name="swap" /> Transferência</button>
      </div>

      <div className="zoom glass">
        <button aria-label="Aproximar" onClick={() => vale?.zoom(0.8)}><Icon name="plus" /></button>
        <button aria-label="Afastar" onClick={() => vale?.zoom(1.25)}><Icon name="minus" /></button>
        <button aria-label="Centralizar" onClick={() => vale?.reset()}><Icon name="home" /></button>
      </div>

      {launch && (
        <div className="modal-back" onClick={closeLaunch}>
          <form
            className="modal glass"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              confirmLaunch();
            }}
          >
            <h2>{LAUNCH[launch]}</h2>
            <label>Valor (R$)<input autoFocus inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={closeLaunch}>Cancelar</button>
              <button type="submit" className="primary">Lançar</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast glass" role="status">{toast}</div>}
    </div>
  );
}
