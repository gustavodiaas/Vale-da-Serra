import type { StageId } from './engine/types';

// Legacy IDs stay internal so saved data and the scene API remain compatible.
export const HOME_STAGES: { id: StageId; name: string; rule: string; at: number }[] = [
  { id: 'garagem', name: 'Novo lar', rule: 'Comece a organizar a vida da sua casa', at: 1 },
  { id: 'pre-seed', name: 'Lar acolhedor', rule: 'Cubra pelo menos 1 mês das suas despesas', at: 3 },
  { id: 'seed', name: 'Casa com jardim', rule: 'Cubra pelo menos 3 meses das suas despesas', at: 6 },
  { id: 'serie-a', name: 'Lar completo', rule: 'Cubra pelo menos 6 meses das suas despesas', at: 12 },
  { id: 'unicornio', name: 'Vida tranquila', rule: 'Cubra pelo menos 12 meses das suas despesas', at: 12 },
];

export function homeJourney(cash: number, savings: number, monthlyExpenses: number) {
  const coverage = monthlyExpenses > 0 ? Math.max(0, cash + savings) / monthlyExpenses : 0;
  const found = HOME_STAGES.findIndex(stage => coverage < stage.at);
  const index = found < 0 ? HOME_STAGES.length - 1 : found;
  const current = HOME_STAGES[index]!, previousAt = index ? HOME_STAGES[index - 1]!.at : 0;
  const progress = index === HOME_STAGES.length - 1 ? 1 : Math.min(1, Math.max(0, (coverage - previousAt) / (current.at - previousAt)));
  return { stage: current.id, index, current, progress, coverage };
}
