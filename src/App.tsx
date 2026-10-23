import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { computeForecast } from './engine/engine';
import type { Light, ScenarioId, Tx } from './engine/types';
import { HOME_STAGES as STAGES, homeJourney } from './homeJourney';
import { demoTxs } from './demo';
import { addMovement, createPersonalState, localDate, moneyInput, parsePersonalState, personalSummary, removeMovement, type Movement, type MovementKind, type PersonalState, type Wallet } from './engine/personal';
import type { LabelId, ValeHandle } from './vale/createVale';
import type { ValeWeather, WeatherKind } from './vale/weather';
import type { SpringfieldPlace } from './vale/springfieldLocations';
import { destinationAction } from './vale/springfieldActions';

const Vale = lazy(() => import('./vale/Vale').then((m) => ({ default: m.Vale })));

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const months = (n: number | null) => (n === null ? 'sem custos' : n >= 12 ? '12 meses ou mais' : `${n.toFixed(1).replace('.', ',')} meses`);

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

type Panel = 'caixa' | 'cenarios' | 'conselho' | 'marcos' | 'ajustes' | 'perfil' | 'fixas' | 'banco' | 'mercado' | 'padaria';
const NAV: { id: Panel; label: string; icon: keyof typeof ICONS }[] = [
  { id: 'caixa', label: 'Carteira', icon: 'wallet' }, { id: 'fixas', label: 'Fixas', icon: 'home' },
  { id: 'banco', label: 'Banco', icon: 'flag' }, { id: 'mercado', label: 'Mercado', icon: 'plus' },
  { id: 'conselho', label: 'Avisos', icon: 'bell' }, { id: 'ajustes', label: 'Ajustes', icon: 'sliders' },
];
const TITLES: Record<Panel, string> = { caixa: 'Sua carteira', cenarios: 'Cenários e planejamento', conselho: 'Avisos da cidade', marcos: 'Conquistas do seu lar', ajustes: 'Ajustes', perfil: 'Seu perfil financeiro', fixas: 'Contas da casa', banco: 'Banco / sua reserva', mercado: 'Mercado / alimentação', padaria: 'Padaria / gastos diários' };
const KIND_LABEL = { income: 'Entrada', fixed: 'Saída fixa', daily: 'Gasto diário', save: 'Guardar', withdraw: 'Resgatar' };
const STORE = 'garagem:personal:v1';
const valueOf = (form: FormData, name: string) => String(form.get(name) ?? '');
const inputCents = (form: FormData, name: string) => {
  const result = moneyInput(valueOf(form, name));
  if (result === null) throw new Error('Preencha os valores em reais, como 1.250,50.');
  return result;
};
function readSaved() {
  try { return { state: parsePersonalState(localStorage.getItem(STORE), localDate()), error: '' }; }
  catch { return { state: createPersonalState(localDate()), error: 'Não foi possível ler seus dados salvos. Eles não serão sobrescritos automaticamente.' }; }
}

export default function App() {
  const [loaded] = useState(readSaved);
  const [data, setData] = useState<PersonalState>(loaded.state);
  const [storageError, setStorageError] = useState(loaded.error);
  const [canSave, setCanSave] = useState(!loaded.error);
  const [asOf, setAsOf] = useState(localDate());
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [destination, setDestination] = useState<{ place: SpringfieldPlace; panel: Panel } | null>(null);
  const [launch, setLaunch] = useState<MovementKind | null>(null);
  const [wallet, setWallet] = useState<Wallet>('cash');
  const [source, setSource] = useState<'other' | 'salary' | 'benefit'>('other');
  const [preset, setPreset] = useState({ description: '', value: '', billId: '' });
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [weather, setWeather] = useState<ValeWeather | null>(null);
  const [vale, setVale] = useState<ValeHandle | null>(null);
  useEffect(() => { const id = setInterval(() => setAsOf(localDate()), 60000); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!canSave) return;
    try { localStorage.setItem(STORE, JSON.stringify(data)); setStorageError(''); }
    catch { setStorageError('O navegador não conseguiu salvar. Esta sessão continua aberta, mas as alterações podem se perder ao sair.'); }
  }, [data, canSave]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 4200); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setLaunch(null); setPanel(null); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  const summary = useMemo(() => personalSummary(data, asOf), [data, asOf]);
  const txs = useMemo<Tx[]>(() => [
    ...(data.demo ? demoTxs(asOf) : []),
    ...data.movements.filter(m => m.wallet === 'cash' && ['income', 'fixed', 'daily'].includes(m.kind)).map(m => ({ occurredOn: m.date, kind: m.kind === 'income' ? 'in' as const : 'out' as const, amountCents: m.amountCents, status: 'paid' as const, category: m.kind })),
  ], [data, asOf]);
  const f = useMemo(() => computeForecast({ txs, cashCents: summary.cash, asOf, taxRate: data.tax / 100, targetRunwayMonths: data.target, taxProvisioned: data.provisioned }), [txs, summary.cash, asOf, data.tax, data.target, data.provisioned]);
  const monthlyFixed = data.bills.reduce((sum, b) => sum + b.amountCents, 0);
  const burn = Math.max(f.burnCents, monthlyFixed + summary.dailyCash);
  const runway = burn > 0 ? Math.max(0, summary.cash) / burn : 0;
  const { stage, index: stageIdx, current: cur, progress } = homeJourney(summary.cash, summary.savings, burn);
  const alerts = [...summary.alerts, ...f.alerts];
  const money = (cents: number) => hidden ? 'R$ ••••' : brl(cents);
  const labels: Partial<Record<LabelId, string>> = {
    garagem: `${cur.name} · seu lugar no vale`, coworking: 'Planeje seus próximos passos', escritorio: 'Suas conquistas', campus: 'Uma vida em comunidade', torre: 'Novos sonhos', compliance: 'Planeje as contas do mês', conselho: `${alerts.length} avisos`, cafe: 'Uma pausa na rotina',
    banco: !data.profile.savingsGoalCents ? 'Defina sua meta mensal' : summary.goalRemaining > 0 ? 'Sua meta precisa de atenção' : 'Meta do mês concluída', mercado: 'Carteira de alimentação', padaria: 'Registre o dia a dia',
  };
  const onReady = useCallback((handle: ValeHandle | null) => setVale(handle), []);
  const onSelect = useCallback((id: LabelId, place?: SpringfieldPlace) => { const map: Record<LabelId, Panel> = { garagem: 'caixa', coworking: 'cenarios', escritorio: 'marcos', campus: 'marcos', torre: 'cenarios', compliance: 'fixas', conselho: 'conselho', cafe: 'padaria', banco: 'banco', mercado: 'mercado', padaria: 'padaria' }; const target = place && ['health', 'education', 'transport', 'community'].includes(place.kind) ? 'padaria' : map[id]; setDestination(place ? { place, panel: target } : null); setPanel(target); }, []);
  function begin(kind: MovementKind, options: { wallet?: Wallet; description?: string; cents?: number; billId?: string; source?: 'salary' | 'benefit' } = {}) {
    setWallet(options.wallet ?? 'cash'); setSource(options.source ?? 'other');
    setPreset({ description: options.description ?? '', value: options.cents === undefined ? '' : (options.cents / 100).toFixed(2).replace('.', ','), billId: options.billId ?? '' });
    setFormError(''); setLaunch(kind);
  }
  function submitMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!launch) return;
    try {
      const form = new FormData(e.currentTarget);
      const movement: Movement = { id: crypto.randomUUID(), date: valueOf(form, 'date'), description: valueOf(form, 'description'), amountCents: inputCents(form, 'amount'), kind: launch, wallet: source === 'benefit' ? 'food' : wallet, ...(preset.billId ? { billId: preset.billId } : {}), ...(launch === 'income' && source !== 'other' ? { source } : {}) };
      const next = addMovement(data, movement, asOf); setData(next); setLaunch(null); setToast(`${KIND_LABEL[launch]} registrada. +10 moedas`);
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Não foi possível registrar.'); }
  }
  function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const form = new FormData(e.currentTarget);
      const profile = { name: valueOf(form, 'name').trim() || 'Você', salaryCents: inputCents(form, 'salary'), foodCents: inputCents(form, 'food'), savingsGoalCents: inputCents(form, 'goal') };
      const start = data.demo && form.get('start') === 'on';
      setData({ ...data, profile, ...(start ? { demo: false, movements: [], bills: [], openingCashCents: inputCents(form, 'openingCash'), openingFoodCents: inputCents(form, 'openingFood'), openingSavingsCents: inputCents(form, 'openingSavings') } : {}) });
      setToast(start ? 'Seu perfil está pronto. Registre suas contas fixas para começar.' : 'Perfil salvo. Valores previstos não são creditados automaticamente.');
    } catch (error) { setToast(error instanceof Error ? error.message : 'Confira os valores.'); }
  }
  function addBill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    try {
      const amountCents = inputCents(form, 'amount'); const name = valueOf(form, 'name').trim(); const dueDay = Number(form.get('day'));
      if (!amountCents || !name || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error('Informe nome, valor positivo e dia de vencimento entre 1 e 31.');
      setData({ ...data, bills: [...data.bills, { id: crypto.randomUUID(), name, amountCents, dueDay }] }); e.currentTarget.reset(); setToast('Conta fixa cadastrada. O pagamento será registrado por você.');
    } catch (error) { setToast(error instanceof Error ? error.message : 'Confira a conta.'); }
  }
  const ledger = (filter: (m: Movement) => boolean) => {
    const entries = [...data.movements].filter(filter).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
    return <div className="ledger">{entries.length ? entries.map(m => <div className="ledger-row" key={m.id}><span><b>{m.description}</b><small>{m.date.split('-').reverse().join('/')} · {KIND_LABEL[m.kind]}{m.wallet === 'food' ? ' · vale' : ''}</small></span><strong className={m.kind === 'income' ? 'l-verde' : ''}>{money(m.amountCents)}</strong><button className="remove-bill" aria-label={`Excluir lançamento ${m.description}`} title="Excluir lançamento e recalcular os saldos" onClick={() => { try { setData(removeMovement(data, m.id)); setToast('Lançamento excluído e saldos recalculados.'); } catch (error) { setToast(error instanceof Error ? error.message : 'Não foi possível excluir.'); } }}><Icon name="close" /></button></div>) : <p className="muted">Nenhum lançamento por aqui ainda.</p>}</div>;
  };
  const goalProgress = data.profile.savingsGoalCents ? Math.min(100, summary.savedThisMonth / data.profile.savingsGoalCents * 100) : 0;
  const place = destination?.panel === panel ? destination.place : null;
  const visit = (next: Panel) => { setDestination(null); setPanel(next); };
  const interaction = place ? destinationAction(place, data.profile.salaryCents) : null;
  const placeAction = () => {
    if (!interaction) return;
    if (interaction.type === 'panel') visit(interaction.panel);
    else begin(interaction.kind, interaction.options);
  };
  const placeActionLabel = interaction?.label ?? '';


  return <div className={`app ${weather && !weather.isDay ? 'night' : 'day'}`}>
    <Suspense fallback={<div className="vale-stage" />}><Vale stage={stage} labels={labels} onReady={onReady} onWeather={setWeather} onSelect={onSelect} /></Suspense>
    <header className="topbar glass">
      <div className="brand"><span className="brand-mark"><Icon name="home" /></span><div>Springfield<small>SUA CASA EM EVERGREEN TERRACE.</small></div></div>
      <button className="level" onClick={() => visit('marcos')}><b>Nível {stageIdx + 1}</b><span className="xp"><i style={{ width: `${progress * 100}%` }} /></span><small>{cur.name}</small></button>
      <div className="spacer" /><div className="location"><span className="live-dot" /> SPRINGFIELD <small>Sua cidade, suas escolhas</small></div>
      {weather && <div className="chip weather" title="Clima da sua localização">{WEATHER[weather.kind]}{weather.tempC !== null ? ` · ${Math.round(weather.tempC)}°C` : ''}</div>}
      <div className="chip coins"><span className="coin" />{(data.movements.length * 10 + (data.demo ? 590 : 0)).toLocaleString('pt-BR')}<small>moedas</small></div>
      <button className="icon-btn" aria-label="Avisos" onClick={() => visit('conselho')}><Icon name="bell" />{alerts.length > 0 && <em>{alerts.length}</em>}</button>
      <button className="profile" onClick={() => visit('perfil')}><Icon name="user" /><span>Perfil</span></button>
    </header>
    <nav className="sidebar glass" aria-label="Menu">{NAV.map(n => <button key={n.id} className={panel === n.id ? 'on' : ''} onClick={() => { setDestination(null); setPanel(panel === n.id ? null : n.id); }}><Icon name={n.icon} /><span>{n.label}</span>{n.id === 'conselho' && alerts.length > 0 && <em>{alerts.length}</em>}</button>)}</nav>
    <section className="balance glass" aria-label="Saldo">
      <div className="balance-heading"><span>SUA VIDA FINANCEIRA</span><button className="demo-tag" onClick={() => visit('perfil')}>{data.demo ? 'Demo · configurar' : data.profile.name === 'Fundador' ? 'Você' : data.profile.name}</button></div>
      <div className="bal-row"><div><small>Dinheiro disponível</small><strong>{money(summary.cash)}</strong></div><div><small>Após fixas pendentes e meta</small><strong className={summary.availableAfterCommitments >= 0 ? 'l-verde' : 'l-vermelho'}>{money(summary.availableAfterCommitments)}</strong></div><button className="icon-btn flat" aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'} onClick={() => setHidden(!hidden)}><Icon name={hidden ? 'eye' : 'eyeoff'} /></button><button className={`icon-btn flat chev ${open ? 'up' : ''}`} aria-label="Detalhes dos saldos" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="chevron" /></button></div>
      {open && <div className="bal-more"><div><small>Vale-alimentação</small><b>{money(summary.food)}</b></div><div><small>Guardado no banco</small><b>{money(summary.savings)}</b></div><div><small>Saídas fixas pendentes</small><b>{money(summary.pendingFixed)}</b></div></div>}
    </section>
    <section className="journey glass"><div className="journey-icon"><Icon name="flag" /></div><span>SEU BANCO LEMBRA POR VOCÊ</span><h1>Um futuro melhor.<br />Um mês de cada vez.</h1><p>{data.profile.savingsGoalCents ? `Meta mensal: ${money(data.profile.savingsGoalCents)}` : 'Defina quanto quer guardar no seu perfil.'}</p><div className="goal-track"><i style={{ width: `${goalProgress}%` }} /></div><p>{summary.goalRemaining ? `Faltam ${money(summary.goalRemaining)} para a meta.` : 'Meta do mês em dia.'}</p><button onClick={() => visit('banco')}>Visitar meu banco <span>↗</span></button></section>
    <div className="map-caption"><span className="live-dot" /> EXPLORE SPRINGFIELD <small>Clique nos locais e personagens · Arraste para explorar · Role para aproximar</small></div>
    {panel && <aside className="drawer glass" aria-label={place?.name ?? TITLES[panel]}><div className="drawer-head"><h2>{place?.name ?? TITLES[panel]}</h2><button className="icon-btn flat" aria-label="Fechar painel" onClick={() => { setPanel(null); setDestination(null); }}><Icon name="close" /></button></div><div className="drawer-body stack">
      {place && <section className="destination-card"><small>{place.isCharacter ? 'PERSONAGEM · ' : ''}{place.district}</small><h3>{place.name}</h3><p>{place.purpose}</p><button className="primary action" onClick={placeAction}>{placeActionLabel}</button>{place.kind === 'home' && <button className="text-link" onClick={() => visit('fixas')}>Organizar as contas da casa ↗</button>}{(place.key === 'kwik' || place.key === 'apu') && <button className="text-link" onClick={() => begin('daily', { description: 'Compras no Kwik-E-Mart', wallet: 'cash' })}>Pagar com dinheiro ↗</button>}<p className="destination-hint">O registro só acontece quando você confirma o valor e a data.</p></section>}
      {panel === 'perfil' && <form className="stack" onSubmit={saveProfile} key={String(data.demo)}><p className="muted">Salário e vale são previsões. Registre o recebimento quando o dinheiro entrar. Seus dados ficam neste navegador.</p><label>Como você se chama?<input name="name" defaultValue={data.profile.name === 'Fundador' ? 'Você' : data.profile.name} maxLength={50} required /></label><label>Salário mensal líquido (R$)<input name="salary" inputMode="decimal" defaultValue={(data.profile.salaryCents / 100).toFixed(2)} required /></label><label>Vale-alimentação mensal (R$)<input name="food" inputMode="decimal" defaultValue={(data.profile.foodCents / 100).toFixed(2)} required /></label><label>Quanto quer guardar por mês (R$)<input name="goal" inputMode="decimal" defaultValue={(data.profile.savingsGoalCents / 100).toFixed(2)} required /></label>{data.demo && <fieldset><legend>Começar com meus dados</legend><p className="muted">Ao marcar abaixo, os exemplos de contas e lançamentos serão retirados. Informe os saldos que você já tem hoje.</p><label>Saldo em dinheiro (R$)<input name="openingCash" inputMode="decimal" defaultValue="0,00" required /></label><label>Saldo atual do vale (R$)<input name="openingFood" inputMode="decimal" defaultValue="0,00" required /></label><label>Já guardado no banco (R$)<input name="openingSavings" inputMode="decimal" defaultValue="0,00" required /></label><label className="check"><input type="checkbox" name="start" /> Retirar demonstração e usar meus saldos</label></fieldset>}<button className="primary action" type="submit">Salvar perfil</button><button className="text-link" type="button" onClick={() => begin('income', { source: 'salary', description: 'Salário recebido', cents: data.profile.salaryCents })}>Registrar salário já recebido ↗</button></form>}
      {panel === 'caixa' && <><div className="grid2"><Metric label="Entradas neste mês" value={money(summary.income)} /><Metric label="Fixas pagas" value={money(summary.fixedPaid)} /><Metric label="Gastos diários em dinheiro" value={money(summary.dailyCash)} /><Metric label="Saldo livre após compromissos" value={money(summary.availableAfterCommitments)} /></div><div className="button-row"><button className="primary action" onClick={() => begin('income')}>Nova entrada</button><button className="ghost action" onClick={() => begin('daily')}>Gasto diário</button></div><button className="text-link" onClick={() => visit('cenarios')}>Ver cenários e planejamento ↗</button><h3>Seus lançamentos</h3>{ledger(() => true)}</>}
      {panel === 'fixas' && <><p className="muted">Aluguel, luz, água, condomínio, assinaturas. As contas voltam a ficar pendentes a cada mês, sem débito automático.</p><Metric label="Ainda a pagar neste mês" value={money(summary.pendingFixed)} /><div className="bill-list">{data.bills.map(b => { const paid = !summary.unpaidBills.some(u => u.id === b.id); return <div className="bill" key={b.id}><div><b>{b.name}</b><small>Todo dia {b.dueDay} · {money(b.amountCents)}</small></div><button className={paid ? 'paid-tag' : 'text-link'} disabled={paid} onClick={() => begin('fixed', { description: b.name, cents: b.amountCents, billId: b.id })}>{paid ? 'Paga' : 'Pagar'}</button><button className="remove-bill" aria-label={`Remover recorrência de ${b.name}`} title="Retirar das próximas contas; pagamentos anteriores são mantidos" onClick={() => { setData({ ...data, bills: data.bills.filter(x => x.id !== b.id) }); setToast('Recorrência removida. Os pagamentos anteriores foram mantidos.'); }}><Icon name="close" /></button></div>; })}</div><h3>Adicionar conta fixa</h3><form className="stack" onSubmit={addBill}><label>Nome<input name="name" placeholder="Ex.: aluguel" maxLength={80} required /></label><div className="grid2"><label>Valor (R$)<input name="amount" inputMode="decimal" placeholder="0,00" required /></label><label>Dia do vencimento<input name="day" type="number" min="1" max="31" defaultValue="10" required /></label></div><button className="primary action">Adicionar conta</button></form></>}
      {panel === 'banco' && <><div className="place-banner bank-banner"><small>BANCO DE SPRINGFIELD</small><h3>Seu futuro tem endereço.</h3><p>Guarde de verdade no seu controle, sem misturar a reserva com o saldo para gastar.</p></div><div className="grid2"><Metric label="Total guardado" value={money(summary.savings)} /><Metric label="Meta mensal" value={money(data.profile.savingsGoalCents)} /><Metric label="Guardado líquido neste mês" value={money(summary.savedThisMonth)} /><Metric label="Falta guardar" value={money(summary.goalRemaining)} /></div><div className="goal-track"><i style={{ width: `${goalProgress}%` }} /></div>{summary.alerts.map(a => <p key={a.code} className={`notice sev-${a.severity}`}>{a.message}</p>)}<div className="button-row"><button className="primary action" onClick={() => begin('save', { description: 'Reserva mensal', ...(summary.goalRemaining ? { cents: summary.goalRemaining } : {}) })}>Guardar dinheiro</button><button className="ghost action" onClick={() => begin('withdraw', { description: 'Resgate da reserva' })}>Resgatar</button></div><button className="text-link" onClick={() => visit('perfil')}>Editar meta no perfil ↗</button><p className="muted">Este banco é seu controle financeiro no jogo. Os registros não movimentam sua conta bancária real.</p>{ledger(m => m.kind === 'save' || m.kind === 'withdraw')}</>}
      {panel === 'mercado' && (!place || place.key === 'kwik' || place.key === 'apu') && <><div className="place-banner market-banner"><small>KWIK-E-MART</small><h3>Seu vale, bem aproveitado.</h3><p>Compras de alimentação com carteira separada.</p></div><div className="grid2"><Metric label="Saldo do vale" value={money(summary.food)} /><Metric label="Vale gasto no mês" value={money(summary.foodSpent)} /></div><p className="muted">Benefício mensal previsto: {money(data.profile.foodCents)}. O saldo acumula até você registrar as compras.</p><div className="button-row"><button className="primary action" onClick={() => begin('daily', { wallet: 'food', description: 'Compras no Kwik-E-Mart' })}>Comprar com vale</button><button className="ghost action" onClick={() => begin('daily', { description: 'Compras no Kwik-E-Mart' })}>Pagar em dinheiro</button></div><button className="text-link" onClick={() => begin('income', { wallet: 'food', source: 'benefit', description: 'Crédito do vale-alimentação', cents: data.profile.foodCents })}>Registrar recebimento do vale ↗</button>{ledger(m => m.wallet === 'food')}</>}
      {panel === 'mercado' && place && place.key !== 'kwik' && place.key !== 'apu' && <><Metric label="Gastos diários em dinheiro no mês" value={money(summary.dailyCash)} /><h3>Compras neste local</h3>{ledger(m => m.kind === 'daily' && m.description === place.name)}</>}
      {panel === 'padaria' && <><div className="place-banner bakery-banner"><small>{place?.name ?? 'DIA A DIA EM SPRINGFIELD'}</small><h3>Os pequenos gastos contam.</h3><p>{place?.purpose ?? 'Alimentação, transporte e lazer: registre o que aparece no dia a dia.'}</p></div><Metric label="Gastos diários em dinheiro no mês" value={money(summary.dailyCash)} /><button className="primary action" onClick={() => begin('daily', { description: place?.name ?? 'Gasto diário' })}>Registrar gasto diário</button>{ledger(m => m.kind === 'daily' && m.wallet === 'cash')}</>}
      {panel === 'conselho' && <>{alerts.length ? alerts.map((a, i) => <p key={`${a.code}-${i}`} className={`notice sev-${a.severity}`}>{a.message}</p>) : <p className="muted">Tudo em dia por aqui.</p>}<button className="text-link" onClick={() => visit('banco')}>Abrir banco e revisar minha meta ↗</button></>}
      {panel === 'cenarios' && <><h3>Planejamento até o fim do mês</h3><div className="grid2"><Metric label="Salário ainda previsto" value={money(summary.salaryPending)} /><Metric label="Fixas pendentes" value={money(summary.pendingFixed)} /><Metric label="Estimativa de diários restantes" value={money(summary.estimatedDailyRemaining)} /><Metric label="Livre estimado após a meta" value={money(summary.projectedFree)} /></div><p className="muted">Estimativa: saldo atual + salário ainda não recebido − fixas pendentes − meta restante − diários projetados pelo ritmo deste mês. O vale é separado.</p><h3>Histórico: próximo mês</h3>{f.monthsOfData ? SCENARIOS.map(([id, label]) => <div key={id} className={`tile light-${f.scenarios[id].light}`}><span>{label}</span><strong>{money(f.scenarios[id].projected30dCents)}</strong><small>{LIGHT[f.scenarios[id].light]} · imposto {money(f.scenarios[id].taxCents)}</small></div>) : <p className="muted">Os três cenários aparecem quando houver meses completos de histórico. Seu perfil já alimenta o planejamento acima.</p>}<p className="muted">Fôlego estimado atual: {burn ? months(runway) : 'cadastre suas contas para calcular'}. {data.demo ? 'O histórico dos cenários é demonstrativo.' : 'Projeções não garantem recebimentos.'}</p></>}
      {panel === 'marcos' && <ol className="ladder">{STAGES.map((s, i) => <li key={s.id} className={i < stageIdx ? 'done' : i === stageIdx ? 'now' : ''}><b>{s.name}</b><span>{s.rule}</span></li>)}</ol>}
      {panel === 'ajustes' && <><button className="primary action" onClick={() => visit('perfil')}>Abrir meu perfil financeiro</button><label>Imposto sobre entradas em dinheiro (%)<input type="number" min="0" max="60" value={data.tax} onChange={e => setData({ ...data, tax: Math.min(60, Math.max(0, Number(e.target.value) || 0)) })} /></label><label>Meta de fôlego (meses)<input type="number" min="1" max="24" value={data.target} onChange={e => setData({ ...data, target: Math.min(24, Math.max(1, Math.round(Number(e.target.value) || 1))) })} /></label><label className="check"><input type="checkbox" checked={data.provisioned} onChange={e => setData({ ...data, provisioned: e.target.checked })} /> Imposto provisionado</label><p className="muted">O imposto alimenta os cenários históricos. Os saldos não sofrem débitos automáticos. Dados salvos apenas neste navegador, sem sincronização ou login.</p><button className="ghost action" onClick={() => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `garagem-${asOf}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Baixar cópia dos meus dados</button></>}
    </div></aside>}
    <div className="dock glass" role="toolbar" aria-label="Lançamentos"><button className="out" onClick={() => begin('daily')}><Icon name="minus" />Saída</button><button className="in" onClick={() => begin('income')}><Icon name="plus" />Entrada</button><button className="tr" onClick={() => begin('save', { description: 'Reserva mensal' })}><Icon name="swap" />Guardar</button></div>
    <div className="zoom glass"><button aria-label="Aproximar" onClick={() => vale?.zoom(.8)}><Icon name="plus" /></button><button aria-label="Afastar" onClick={() => vale?.zoom(1.25)}><Icon name="minus" /></button><button aria-label="Centralizar" onClick={() => vale?.reset()}><Icon name="home" /></button></div>
    {launch && <div className="modal-back" onClick={() => setLaunch(null)}><form className="modal glass" role="dialog" aria-modal="true" aria-labelledby="movement-title" onClick={e => e.stopPropagation()} onSubmit={submitMovement}><h2 id="movement-title">{KIND_LABEL[launch]}</h2>{(launch === 'daily' || launch === 'fixed') && !preset.billId && <label>Tipo de saída<select value={launch} onChange={e => { setLaunch(e.target.value as MovementKind); if (e.target.value === 'fixed') setWallet('cash'); }}><option value="daily">Diário: gasto do dia a dia</option><option value="fixed">Fixa: conta planejada</option></select></label>}{launch === 'income' && <label>O que entrou?<select value={source} onChange={e => { const next = e.target.value as typeof source; setSource(next); setWallet(next === 'benefit' ? 'food' : 'cash'); }}><option value="other">Outros recebimentos em dinheiro</option><option value="salary">Salário do mês</option><option value="benefit">Vale-alimentação do mês</option></select></label>}{launch === 'daily' && <label>Forma de pagamento<select value={wallet} onChange={e => setWallet(e.target.value as Wallet)}><option value="cash">Dinheiro / conta</option><option value="food">Vale-alimentação (somente alimentação)</option></select></label>}<label>Descrição<input name="description" defaultValue={preset.description} maxLength={100} placeholder="Ex.: salário, aluguel ou mercado" required autoFocus /></label><div className="grid2"><label>Valor (R$)<input name="amount" inputMode="decimal" defaultValue={preset.value} placeholder="0,00" required /></label><label>Data<input name="date" type="date" defaultValue={asOf} max={asOf} required /></label></div>{launch === 'fixed' && !preset.billId && <p className="muted">Este é um pagamento avulso. Para cadastrar uma recorrência ou quitar uma conta cadastrada, use o painel Fixas.</p>}{formError && <p role="alert" className="form-error">{formError}</p>}<div className="modal-actions"><button type="button" className="ghost" onClick={() => setLaunch(null)}>Cancelar</button><button type="submit" className="primary">Registrar</button></div></form></div>}
    {storageError && <div className="storage-banner" role="alert">{storageError}{!canSave && <button onClick={() => { setCanSave(true); setStorageError(''); }}>Substituir dados salvos por esta sessão</button>}</div>}
    {toast && <div className="toast glass" role="status">{toast}</div>}
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="tile"><span>{label}</span><strong>{value}</strong></div>; }
