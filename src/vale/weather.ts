export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

export interface ValeWeather {
  kind: WeatherKind;
  isDay: boolean;
  tempC: number | null;
}

export const DEFAULT_WEATHER: ValeWeather = { kind: 'clear', isDay: true, tempC: null };

/** Fallback quando o navegador nega a localização: Porto Alegre. */
const FALLBACK = { lat: -30.03, lon: -51.23 };

/** Códigos WMO do Open-Meteo para as categorias do Vale. */
export function kindFromWmo(code: number): WeatherKind {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

function position(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(FALLBACK);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(FALLBACK),
      { timeout: 6000, maximumAge: 60 * 60 * 1000 },
    );
  });
}

/** Clima atual da vida real via Open-Meteo (sem chave). Nunca lança: em falha, devolve o padrão. */
export async function fetchWeather(signal?: AbortSignal): Promise<ValeWeather> {
  try {
    const { lat, lon } = await position();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=weather_code,is_day,temperature_2m`;
    const r = await fetch(url, { signal });
    if (!r.ok) return DEFAULT_WEATHER;
    const j = (await r.json()) as { current?: { weather_code: number; is_day: number; temperature_2m: number } };
    if (!j.current) return DEFAULT_WEATHER;
    return { kind: kindFromWmo(j.current.weather_code), isDay: j.current.is_day === 1, tempC: j.current.temperature_2m };
  } catch {
    return DEFAULT_WEATHER;
  }
}
