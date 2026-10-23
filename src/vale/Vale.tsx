import { useEffect, useRef } from 'react';
import type { StageId } from '../engine/types';
import { createVale, type ValeHandle, type ValeStage } from './createVale';
import { fetchWeather } from './weather';

const INDEX: Record<StageId, ValeStage> = { garagem: 1, 'pre-seed': 2, seed: 3, 'serie-a': 4, unicornio: 5 };

/** Cena 3D ligada ao estágio calculado pelo motor. */
export function Vale({ stage }: { stage: StageId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const handle = useRef<ValeHandle | null>(null);
  const initial = useRef(INDEX[stage]);

  useEffect(() => {
    if (!ref.current) return;
    const v = createVale(ref.current, initial.current);
    handle.current = v;
    return () => {
      v?.dispose();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    const load = () => {
      void fetchWeather(ctl.signal).then((w) => {
        if (!ctl.signal.aborted) handle.current?.setWeather(w);
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

  return <canvas ref={ref} className="vale-canvas" aria-label="Cidade em 3D que cresce conforme o estágio do caixa" />;
}
