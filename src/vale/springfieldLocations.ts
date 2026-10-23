import type { CityAnchor } from './siliconValley';

export type PlaceKind = 'home' | 'food' | 'shopping' | 'salary' | 'bills' | 'savings' | 'leisure' | 'health' | 'education' | 'transport' | 'planning' | 'community';
export type SpringfieldModel = 'simpsons' | 'flanders' | 'house' | 'kwik' | 'krusty' | 'moe' | 'donuts' | 'school' | 'plant' | 'mansion' | 'civic' | 'church' | 'shop' | 'mall' | 'stadium' | 'bowling' | 'park' | 'lake' | 'airport' | 'port';
export interface SpringfieldPlace {
  key: string; name: string; district: string; kind: PlaceKind; panel: CityAnchor['id']; purpose: string;
  x: number; z: number; width: number; depth: number; model: SpringfieldModel; color: string; primary?: boolean; isCharacter?: boolean;
}
export const PLACE_KINDS: Record<PlaceKind, string> = { home: 'Casas', food: 'Alimentação', shopping: 'Compras', salary: 'Trabalho', bills: 'Contas e serviços', savings: 'Reserva', leisure: 'Lazer', health: 'Saúde', education: 'Educação', transport: 'Transporte', planning: 'Planejamento', community: 'Comunidade' };
const locations: [string, string, string, PlaceKind, SpringfieldModel, number, number, number, number, string, boolean?][] = [
  ['simpsons', 'Casa dos Simpsons', 'Evergreen Terrace', 'home', 'simpsons', -108, 110, 31, 24, '#db9f80', true],
  ['flanders', 'Casa dos Flanders', 'Evergreen Terrace', 'home', 'flanders', -82, 110, 18, 22, '#c2a9d7'],
  ['brown', 'Brown House', 'Evergreen Terrace', 'home', 'house', -117, 82, 19, 17, '#aa8063'],
  ['milhouse', 'Casa do Milhouse', 'Evergreen Terrace', 'home', 'house', -87, 82, 19, 17, '#d8c88e'],
  ['kwik', 'Kwik-E-Mart', 'Centro comercial', 'shopping', 'kwik', -49, 110, 26, 22, '#e1d3bd', true],
  ['krusty', 'Krusty Burger', 'Centro comercial', 'food', 'krusty', -19, 110, 25, 23, '#e2bc88', true],
  ['moe', "Moe's Tavern", 'Centro comercial', 'food', 'moe', -49, 40, 26, 24, '#7b978c', true],
  ['comic', 'Comic Book Guy / Android’s Dungeon', 'Centro comercial', 'shopping', 'shop', -19, 40, 24, 22, '#c5afca'],
  ['lard', 'Lard Lad Donuts', 'Centro comercial', 'food', 'donuts', 35, 110, 43, 29, '#ead4b5', true],
  ['bowling', 'Barney’s Bowlarama', 'Centro comercial', 'leisure', 'bowling', 105, 110, 45, 30, '#8dbbc3'],
  ['mall', 'Springfield Mall', 'Centro comercial', 'shopping', 'mall', 175, 105, 49, 44, '#ddcabb'],
  ['school', 'Springfield Elementary', 'Escolas e cultura', 'education', 'school', -175, 108, 48, 36, '#d8a992', true],
  ['library', 'Biblioteca de Springfield', 'Escolas e cultura', 'education', 'civic', -105, 35, 42, 30, '#d5c09e'],
  ['music', 'King Toot’s Music Store', 'Centro comercial', 'education', 'shop', -50, 17, 25, 17, '#bd8e83'],
  ['jazz', 'The Jazz Hole', 'Centro comercial', 'leisure', 'shop', -18, 16, 24, 17, '#7e9ba5'],
  ['bank', 'Banco de Springfield', 'Centro cívico', 'savings', 'civic', 35, 36, 44, 32, '#d8d2b2', true],
  ['townhall', 'Prefeitura de Springfield', 'Centro cívico', 'bills', 'civic', -35, -47, 43, 30, '#d6c4a3'],
  ['square', 'Praça Jebediah Springfield', 'Centro cívico', 'community', 'park', -35, -14, 24, 20, '#87aa6d'],
  ['police', 'Delegacia do Chefe Wiggum', 'Centro cívico', 'bills', 'civic', 35, -36, 43, 34, '#9aa9b7'],
  ['courthouse', 'Tribunal de Springfield', 'Centro cívico', 'bills', 'civic', -105, -36, 43, 34, '#d7cab3'],
  ['hospital', 'Springfield General Hospital', 'Centro cívico', 'health', 'civic', -175, 35, 45, 36, '#c5d9d8', true],
  ['church', 'First Church of Springfield', 'Centro cívico', 'community', 'church', 105, 35, 43, 35, '#dfc8c0'],
  ['post', 'Correios de Springfield', 'Centro cívico', 'bills', 'civic', 105, -35, 40, 30, '#c3bb9e'],
  ['retirement', 'Springfield Retirement Castle', 'Evergreen Terrace', 'health', 'mansion', -175, -35, 43, 34, '#bdc4ad'],
  ['plant', 'Usina Nuclear de Springfield', 'Distrito industrial', 'salary', 'plant', 164, -166, 86, 72, '#a9b8aa', true],
  ['burns', 'Mansão do Sr. Burns', 'Springfield Heights', 'planning', 'mansion', -175, -175, 49, 43, '#bdb8ae'],
  ['duff', 'Cervejaria Duff', 'Distrito industrial', 'salary', 'plant', 175, -35, 47, 36, '#bc8069'],
  ['stadium', 'Springfield Stadium', 'Lazer e natureza', 'leisure', 'stadium', -105, -105, 52, 45, '#a3aaa3'],
  ['lake', 'Lago Springfield', 'Lazer e natureza', 'leisure', 'lake', -175, -105, 52, 49, '#68a5ae'],
  ['park', 'Parque de Springfield', 'Lazer e natureza', 'leisure', 'park', -35, -105, 49, 44, '#81aa66'],
  ['krustyland', 'Krustyland', 'Lazer e natureza', 'leisure', 'park', 35, -105, 50, 45, '#e8bd75'],
  ['observatory', 'Observatório de Springfield', 'Springfield Heights', 'education', 'civic', -105, -175, 44, 34, '#abb9c1'],
  ['cemetery', 'Cemitério de Springfield', 'Springfield Heights', 'community', 'park', -35, -175, 45, 40, '#859d7b'],
  ['prison', 'Penitenciária de Springfield', 'Distrito industrial', 'bills', 'civic', 35, -175, 44, 36, '#9a9d99'],
  ['airport', 'Aeroporto de Springfield', 'Transportes e porto', 'transport', 'airport', -175, 180, 52, 43, '#c7d4d0'],
  ['port', 'Porto de Springfield', 'Transportes e porto', 'transport', 'port', 220, 180, 48, 47, '#b59672'],
  ['gas', 'Posto de gasolina', 'Transportes e porto', 'transport', 'shop', 105, 180, 44, 33, '#b8c6bd'],
  ['bus', 'Terminal do Otto', 'Transportes e porto', 'transport', 'airport', -105, 180, 45, 32, '#c7b37f'],
  ['car', 'Concessionária de Springfield', 'Transportes e porto', 'transport', 'shop', -35, 180, 45, 33, '#bad0d4'],
  ['hotel', 'Sleep-Eazy Motel', 'Centro comercial', 'leisure', 'mall', 35, 180, 44, 32, '#caa0b0'],
  ['cinema', 'Aztec Theater', 'Centro comercial', 'leisure', 'shop', 175, 35, 44, 33, '#cf9b7b'],
  ['leftorium', 'The Leftorium', 'Centro comercial', 'shopping', 'shop', 105, 83, 36, 18, '#b9b7cb'],
  ['costington', 'Costington’s', 'Centro comercial', 'shopping', 'shop', 175, 78, 40, 17, '#bc9e9b'],
  ['restaurant', 'The Frying Dutchman', 'Transportes e porto', 'food', 'shop', 175, 180, 44, 33, '#a6b8ad'],
  ['pizza', 'Luigi’s', 'Centro comercial', 'food', 'shop', 35, 82, 37, 18, '#e2c19c'],
  ['burger', 'Gulp ’N’ Blow', 'Centro comercial', 'food', 'shop', -49, 82, 25, 18, '#d8c894'],
  ['salon', 'Salão de beleza de Springfield', 'Centro comercial', 'shopping', 'shop', -19, 82, 24, 18, '#d2aabc'],
];
const panels: Record<PlaceKind, CityAnchor['id']> = { home: 'garagem', food: 'padaria', shopping: 'mercado', salary: 'coworking', bills: 'compliance', savings: 'banco', leisure: 'cafe', health: 'conselho', education: 'escritorio', transport: 'campus', planning: 'torre', community: 'conselho' };
const purposes: Record<PlaceKind, string> = { home: 'Carteira, perfil e contas da casa', food: 'Registrar alimentação e refeições', shopping: 'Registrar compras e usar o vale em alimentação', salary: 'Registrar salário e outras entradas', bills: 'Planejar contas fixas e registrar pagamentos', savings: 'Guardar, resgatar e acompanhar a meta', leisure: 'Registrar lazer e gastos do dia a dia', health: 'Registrar despesas de saúde', education: 'Planejar e registrar estudos', transport: 'Registrar combustível, transporte e viagens', planning: 'Consultar planejamento e conquistas', community: 'Consultar avisos e organizar contribuições' };
export const SPRINGFIELD_PLACES: SpringfieldPlace[] = locations.map(([key, name, district, kind, model, x, z, width, depth, color, primary]) => ({ key, name, district, kind, model, x, z, width, depth, color, primary, panel: panels[kind], purpose: purposes[kind] }));

// Infill occupies unused half-blocks; all these homes are discoverable and usable.
const occupied = (x: number, z: number) => SPRINGFIELD_PLACES.some(p => Math.abs(p.x - x) < (p.width + 17) / 2 + 3 && Math.abs(p.z - z) < (p.depth + 15) / 2 + 3);
let house = 0;
for (const cx of [-245, -175, -105, -35, 35, 105, 175]) for (const cz of [-245, -175, -105, -35, 35, 105, 175]) for (const dx of [-15, 15]) for (const dz of [-15, 15]) {
  const x = cx + dx, z = cz + dz;
  if (occupied(x, z)) continue;
  const n = ++house;
  SPRINGFIELD_PLACES.push({ key: `neighbor-${n}`, name: `Residência ${700 + n} · ${z > 60 ? 'Evergreen Terrace' : 'Springfield'}`, district: z > 60 ? 'Evergreen Terrace' : 'Bairros de Springfield', kind: 'home', model: 'house', x, z, width: 17, depth: 15, color: ['#d8c2a0', '#bbaccc', '#a9bdb4', '#c6a598', '#d5c88f'][n % 5]!, panel: 'garagem', purpose: 'Contas da casa, moradia e orçamento pessoal' });
}
export const SPRINGFIELD_ROADS = [-280, -210, -140, -70, 0, 70, 140, 210];
export const SPRINGFIELD_VIEW = { azimuth: 1.13, polar: 1.04, radius: 218, target: [-66, 5, 83] as const };
export function getPlace(key: string) { return SPRINGFIELD_PLACES.find(place => place.key === key); }
export const SPRINGFIELD_CHARACTERS = [
  ['homer', 'Homer Simpson', 'plant', 'salary'], ['marge', 'Marge Simpson', 'kwik', 'shopping'], ['bart', 'Bart Simpson', 'school', 'education'], ['lisa', 'Lisa Simpson', 'library', 'education'], ['maggie', 'Maggie Simpson', 'simpsons', 'home'], ['apu', 'Apu Nahasapeemapetilon', 'kwik', 'shopping'], ['krusty-person', 'Krusty', 'krusty', 'food'], ['ned', 'Ned Flanders', 'flanders', 'home'], ['wiggum', 'Chefe Wiggum', 'police', 'bills'], ['burns-person', 'Sr. Burns', 'burns', 'savings'],
].map(([key, name, target, kind]) => {
  const place = getPlace(target!)!;
  return { ...place, key: key!, name: name!, kind: kind as PlaceKind, panel: panels[kind as PlaceKind], purpose: `${name} · ${purposes[kind as PlaceKind]}`, isCharacter: true, primary: false } satisfies SpringfieldPlace;
});
export const ALL_SPRINGFIELD_PLACES: SpringfieldPlace[] = [...SPRINGFIELD_PLACES, ...SPRINGFIELD_CHARACTERS];
