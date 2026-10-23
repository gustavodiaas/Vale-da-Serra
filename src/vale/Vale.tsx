import { useEffect, useRef, useState } from 'react';
import type { StageId } from '../engine/types';
import { createVale, type LabelId, type ValeHandle, type ValeStage, type SceneTime } from './createVale';
import type { QualityMode } from './desktopQuality';
import type { VisualQuality } from './valeFinish';
import { fetchWeather, type ValeWeather } from './weather';

const INDEX: Record<StageId, ValeStage> = { garagem: 1, 'pre-seed': 2, seed: 3, 'serie-a': 4, unicornio: 5 };

interface Props {
  stage: StageId;
  labels: Partial<Record<LabelId, string>>;
  onReady?: (h: ValeHandle | null) => void;
  onWeather?: (w: ValeWeather) => void;
  onSelect?: (id: LabelId) => void;
}

/** Cena 3D em tela cheia, ligada ao estágio calculado pelo motor e ao clima real. */
export function Vale({ stage, labels, onReady, onWeather, onSelect }: Props) {
  const [unavailable, setUnavailable] = useState(false);
  const [assets, setAssets] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<QualityMode>('auto');
  const [tier, setTier] = useState<VisualQuality>('high');
  const [time, setTime] = useState<SceneTime>('real');
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
    const v = createVale(ref.current, overlay.current, initial.current, id => cb.current.onSelect?.(id), setAssets, setProgress, setTier);
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
      <canvas ref={ref} className="vale-canvas" aria-label="Mapa do Vale em 3D que cresce conforme o estágio do caixa" />
      <div ref={overlay} className="vale-overlay" />
      {!unavailable && assets === 'ready' && <details className="vale-settings"><summary>Visual do vale</summary><label>Qualidade<select value={quality} onChange={event => setQuality(event.target.value as QualityMode)}><option value="auto">Automática · {tier === 'high' ? 'Alta' : tier === 'medium' ? 'Média' : 'Baixa'}</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label><label>Iluminação<select value={time} onChange={event => setTime(event.target.value as SceneTime)}><option value="real">Horário local</option><option value="day">Dia</option><option value="night">Noite</option></select></label></details>}
      {!unavailable && assets !== 'ready' && <div className="vale-loading" role="status">{assets === 'loading' ? <><b>Preparando seu vale</b><span>Carregando modelos · {progress}%</span><progress max={100} value={progress} aria-label="Modelos da vila carregados" /></> : 'Não foi possível carregar a vila. Recarregue a página para tentar novamente.'}</div>}
      {unavailable && <div className="scene-fallback"><h2>Seu Vale está aqui.</h2><p>Ative a aceleração gráfica do navegador para explorar a cidade em 3D. Você pode continuar usando o caixa, os cenários e os marcos pelos menus.</p></div>}
    </div>
  );
}
