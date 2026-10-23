import { useEffect, useRef, useState } from 'react';
import type { StageId } from '../engine/types';
import { createVale, type LabelId, type ValeHandle, type ValeStage, type SceneTime } from './createVale';
import type { QualityMode } from './desktopQuality';
import type { VisualQuality } from './valeFinish';
import { fetchWeather, type ValeWeather } from './weather';
import { ALL_SPRINGFIELD_PLACES, PLACE_KINDS, type SpringfieldPlace } from './springfieldLocations';

const INDEX: Record<StageId, ValeStage> = { garagem: 1, 'pre-seed': 2, seed: 3, 'serie-a': 4, unicornio: 5 };

interface Props {
  stage: StageId;
  labels: Partial<Record<LabelId, string>>;
  onReady?: (h: ValeHandle | null) => void;
  onWeather?: (w: ValeWeather) => void;
  onSelect?: (id: LabelId, place?: SpringfieldPlace) => void;
}

/** Cena 3D em tela cheia, ligada ao estágio calculado pelo motor e ao clima real. */
export function Vale({ stage, labels, onReady, onWeather, onSelect }: Props) {
  const [unavailable, setUnavailable] = useState(false);
  const [assets, setAssets] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<QualityMode>('auto');
  const [tier, setTier] = useState<VisualQuality>('high');
  const [time, setTime] = useState<SceneTime>('real');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const directory = useRef<HTMLDetailsElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const handle = useRef<ValeHandle | null>(null);
  const initial = useRef(INDEX[stage]);
  const cb = useRef({ onReady, onWeather, onSelect });
  cb.current = { onReady, onWeather, onSelect };
  const lastWeather = useRef<ValeWeather | null>(null);

  useEffect(() => {
    if (!ref.current || !overlay.current) return;
    setAssets('loading');
    const v = createVale(ref.current, overlay.current, initial.current, (id, place) => cb.current.onSelect?.(id, place), setAssets, setProgress, setTier);
    setUnavailable(!v);
    handle.current = v;
    if (v && lastWeather.current) v.setWeather(lastWeather.current);
    cb.current.onReady?.(v);
    return () => {
      v?.dispose();
      handle.current = null;
      cb.current.onReady?.(null);
    };
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    const load = () => {
      void fetchWeather(ctl.signal).then((w) => {
        if (ctl.signal.aborted) return;
        lastWeather.current = w;
        handle.current?.setWeather(w);
        cb.current.onWeather?.(w);
      });
    };
    load();
    const id = window.setInterval(load, 20 * 60 * 1000);
    return () => {
      ctl.abort();
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    handle.current?.setStage(INDEX[stage]);
  }, [stage]);

  useEffect(() => {
    for (const [id, text] of Object.entries(labels)) handle.current?.setLabel(id as LabelId, text);
  }, [labels]);

  useEffect(() => { handle.current?.setQuality?.(quality); }, [quality]);
  useEffect(() => { handle.current?.setTimeOfDay?.(time); }, [time]);

  return (
    <div className="vale-stage">
      <canvas ref={ref} className="vale-canvas" aria-label="Springfield em 3D: arraste para explorar, use a roda para aproximar e clique nos locais e personagens" />
      <div ref={overlay} className="vale-overlay" />
      <details className="city-directory" ref={directory}><summary>Explorar Springfield <span>{ALL_SPRINGFIELD_PLACES.length} destinos</span></summary><div className="city-directory-body"><button className="city-overview" onClick={() => { handle.current?.overview?.(); if (directory.current) directory.current.open = false; }}>Ver a cidade inteira ↗</button><label>Buscar local ou personagem<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Ex.: Simpsons, usina, Apu…" /></label><label>O que você procura?<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">Todos os destinos</option><option value="characters">Personagens</option>{Object.entries(PLACE_KINDS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label><div className="city-destinations">{ALL_SPRINGFIELD_PLACES.filter(place => (category === 'all' || (category === 'characters' ? place.isCharacter : place.kind === category && !place.isCharacter)) && `${place.name} ${place.district}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(search.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, ''))).map(place => <button key={place.key} onClick={() => { handle.current?.focusLocation?.(place.key); cb.current.onSelect?.(place.panel, place); if (directory.current) directory.current.open = false; }}><b>{place.name}</b><small>{place.isCharacter ? 'Personagem · ' : ''}{place.district}</small></button>)}</div></div></details>
      {!unavailable && assets === 'ready' && <details className="vale-settings"><summary>Visual do vale</summary><label>Qualidade<select value={quality} onChange={event => setQuality(event.target.value as QualityMode)}><option value="auto">Automática · {tier === 'high' ? 'Alta' : tier === 'medium' ? 'Média' : 'Baixa'}</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label><label>Iluminação<select value={time} onChange={event => setTime(event.target.value as SceneTime)}><option value="real">Horário local</option><option value="day">Dia</option><option value="night">Noite</option></select></label></details>}
      {!unavailable && assets !== 'ready' && <div className="vale-loading" role="status">{assets === 'loading' ? <><b>Bem-vindo a Springfield</b><span>Montando a cidade · {progress}%</span><progress max={100} value={progress} aria-label="Montagem da cidade" /></> : 'Não foi possível preparar a cidade. Recarregue a página para tentar novamente.'}</div>}
      {unavailable && <div className="scene-fallback"><h2>Seu Vale está aqui.</h2><p>Ative a aceleração gráfica do navegador para explorar a cidade em 3D. Você pode continuar usando o caixa, os cenários e os marcos pelos menus.</p></div>}
    </div>
  );
}
