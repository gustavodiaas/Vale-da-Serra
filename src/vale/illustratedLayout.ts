import { ALL_SPRINGFIELD_PLACES, type SpringfieldPlace } from './springfieldLocations';

export const ART_WIDTH = 640, ART_HEIGHT = ART_WIDTH * 2 / 3;
export const ART_URL = 'art/springfield-illustrated-v1.png';
export const ART_VIEW = { radius: 420, target: [12, 0, -12] as const };
// Normalised coordinates measured against the actual approved illustration.
// These are image-space positions, not a claim about canonical geography.
const landmarks: Record<string, [number, number, number, number]> = {
  simpsons: [.31, .345, .155, .155], flanders: [.455, .31, .09, .12],
  brown: [.12, .375, .06, .07], milhouse: [.382, .267, .05, .07],
  kwik: [.633, .325, .185, .15], krusty: [.833, .29, .12, .12],
  moe: [.468, .485, .104, .13], comic: [.553, .47, .09, .11],
  lard: [.709, .56, .12, .15], bowling: [.542, .14, .19, .14],
  mall: [.693, .096, .08, .08], school: [.244, .54, .23, .125],
  library: [.653, .039, .077, .075], music: [.276, .101, .051, .065],
  jazz: [.323, .099, .05, .06], bank: [.589, .663, .13, .16],
  townhall: [.438, .692, .14, .175], square: [.487, .833, .1, .15],
  police: [.674, .822, .117, .095], courthouse: [.465, .022, .06, .05],
  hospital: [.918, .217, .116, .12], church: [.881, .449, .12, .165],
  post: [.752, .205, .057, .07], retirement: [.957, .153, .062, .07],
  plant: [.867, .686, .22, .23], burns: [.096, .756, .19, .2],
  duff: [.747, .065, .09, .08], stadium: [.758, .021, .07, .05],
  lake: [.116, .174, .225, .21], park: [.222, .213, .07, .10],
  krustyland: [.966, .917, .056, .105], observatory: [.91, .031, .05, .06],
  cemetery: [.835, .07, .08, .10], prison: [.974, .361, .044, .055],
  airport: [.937, .404, .056, .06], port: [.849, .919, .153, .10],
  gas: [.321, .06, .06, .063], bus: [.406, .574, .09, .05],
  car: [.641, .146, .07, .057], hotel: [.22, .034, .08, .055],
  cinema: [.382, .069, .12, .138], leftorium: [.839, .211, .055, .05],
  costington: [.738, .117, .05, .06], restaurant: [.747, .909, .086, .1],
  pizza: [.518, .561, .08, .07], burger: [.658, .256, .07, .07],
  salon: [.355, .207, .06, .07],
};
const homes: [number, number][] = [
  [.036,.361],[.075,.432],[.043,.523],[.093,.469],[.104,.552],
  [.174,.353],[.21,.32],[.262,.247],[.299,.224],[.389,.22],
  [.301,.172],[.249,.149],[.208,.123],[.166,.101],[.134,.073],
  [.285,.008],[.518,.009],[.567,.041],[.617,.062],[.66,.183],
  [.704,.202],[.738,.247],[.798,.371],[.772,.431],[.795,.407],
  [.939,.301],[.978,.265],[.979,.077],[.934,.099],[.88,.117],
  [.709,.151],[.519,.23],[.525,.286],[.539,.345],[.575,.367],
  [.375,.474],[.309,.465],[.228,.42],[.157,.459],[.459,.585],
  [.409,.626],[.325,.637],[.295,.669],[.265,.697],[.28,.799],
  [.322,.873],[.359,.897],[.389,.937],[.423,.96],[.531,.935],
  [.572,.874],[.627,.888],[.665,.961],[.725,.791],[.736,.74],
  [.65,.726],[.597,.536],[.604,.442],[.924,.501],
];
const characterHomes: Record<string, string> = { homer: 'simpsons', marge: 'kwik', bart: 'school', lisa: 'library', maggie: 'simpsons', apu: 'kwik', 'krusty-person': 'krusty', ned: 'flanders', wiggum: 'police', 'burns-person': 'burns' };

export function artPoint(u: number, v: number): [number, number] { return [(u - .5) * ART_WIDTH, (v - .5) * ART_HEIGHT]; }
export function illustrationRegion(place: SpringfieldPlace) {
  if (place.isCharacter) {
    const target = landmarks[characterHomes[place.key]!] ?? landmarks.simpsons!;
    return { ...place, ...region(target[0], target[1] + target[3] * .5, .016, .025) };
  }
  const spot = landmarks[place.key];
  if (spot) return { ...place, ...region(...spot) };
  const index = Number(place.key.replace('neighbor-', '')) - 1, home = homes[index];
  if (!home) throw new Error(`No illustration region for ${place.key}`);
  return { ...place, ...region(home[0], home[1], .032, .04) };
}
function region(u: number, v: number, width: number, height: number) {
  const [x, z] = artPoint(u, v); return { x, z, width: width * ART_WIDTH, depth: height * ART_HEIGHT };
}
export const ILLUSTRATED_PLACES = ALL_SPRINGFIELD_PLACES.map(illustrationRegion);

export function fitIllustration(camera: { left: number; right: number; top: number; bottom: number; updateProjectionMatrix(): void }, radius: number, width: number, height: number) {
  const vertical = radius * .65; camera.top = vertical / 2; camera.bottom = -vertical / 2;
  camera.right = vertical * width / Math.max(1, height) / 2; camera.left = -camera.right; camera.updateProjectionMatrix();
}
