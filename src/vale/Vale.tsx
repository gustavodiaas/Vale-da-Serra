import { useEffect, useRef, useState } from 'react';
import type { StageId } from '../engine/types';
import { createVale, type LabelId, type ValeHandle, type ValeStage } from './createVale';
import { fetchWeather, type ValeWeather } from './weather';

const INDEX: Record<StageId, ValeStage> = { garagem: 1, 'pre-seed': 2, seed: 3, 'serie-a': 4, unicornio: 5 };

interface Props {
  stage: StageId;
  labels: Partial<Record<LabelId, string>>;
  onReady?: (h: ValeHandle | null) => void;
  onWeather?: (w: ValeWeather) => void;
}

/** Cena 3D em tela cheia, ligada ao estágio calculado pelo motor e ao clima real. */
export function Vale({ stage, labels, onReady, onWeather }: Props) {
  const [unavailable, setUnavailable] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const handle = useRef<ValeHandle | null>(null);
  const initial = useRef(INDEX[stage]);
  const cb = useRef({ onReady, onWeather });
  cb.current = { onReady, onWeather };
  const lastWeather = useRef<ValeWeather | null>(null);

  useEffect(() => {
    if (!ref.current || !overlay.current) return;
    const v = createVale(ref.current, overlay.current, initial.current);
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

  return (
    <div className="vale-stage">
      <canvas ref={ref} className="vale-canvas" aria-label="Mapa do Vale em 3D que cresce conforme o estágio do caixa" />
      <div ref={overlay} className="vale-overlay" />
      {unavailable && <div className="scene-fallback"><h2>Seu Vale está aqui.</h2><p>Ative a aceleração gráfica do navegador para explorar a cidade em 3D. Você pode continuar usando o caixa, os cenários e os marcos pelos menus.</p></div>}
    </div>
  );
}
