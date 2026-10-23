import type { MovementKind, Wallet } from '../engine/personal';
import type { SpringfieldPlace } from './springfieldLocations';

export type DestinationAction =
  | { type: 'panel'; panel: 'perfil' | 'cenarios'; label: string }
  | { type: 'movement'; kind: MovementKind; label: string; options: { description: string; wallet?: Wallet; cents?: number; source?: 'salary' } };

/** A visit prepares a real form; only the existing submit handler writes money. */
export function destinationAction(place: SpringfieldPlace, salaryCents: number): DestinationAction {
  if (place.kind === 'home') return { type: 'panel', panel: 'perfil', label: 'Configurar minha casa e perfil' };
  if (place.kind === 'planning') return { type: 'panel', panel: 'cenarios', label: 'Revisar meu planejamento' };
  if (place.kind === 'salary') return { type: 'movement', kind: 'income', label: 'Registrar salário recebido', options: { source: 'salary', description: `Salário · ${place.name}`, cents: salaryCents } };
  if (place.kind === 'savings') return { type: 'movement', kind: 'save', label: 'Guardar na minha reserva', options: { description: `Reserva · ${place.name}` } };
  if (place.kind === 'bills') return { type: 'movement', kind: 'fixed', label: 'Registrar pagamento', options: { description: `Pagamento · ${place.name}` } };
  const food = place.key === 'kwik' || place.key === 'apu';
  const label = { shopping: food ? 'Registrar compra com vale' : 'Registrar compra', food: 'Registrar refeição', leisure: 'Registrar gasto de lazer', health: 'Registrar despesa de saúde', education: 'Registrar gasto com estudos', transport: 'Registrar gasto de transporte', community: 'Registrar contribuição' }[place.kind];
  return { type: 'movement', kind: 'daily', label, options: { description: place.name, wallet: food ? 'food' : 'cash' } };
}
