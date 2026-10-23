// Offline conversion of Kenney City Kit Suburban 2.0 CC0 models.
// Usage: node scripts/prepare-residential.mjs /absolute/path/to/unpacked/pack
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const pack = process.argv[2];
if (!pack) throw new Error('Pass the unpacked City Kit Suburban directory.');
const directory = path.join(pack, 'Models', 'GLB format');
const png = fs.readFileSync(path.join(directory, 'Textures', 'colormap.png'));
const width = png.readUInt32BE(16), height = png.readUInt32BE(20), channels = png[25] === 6 ? 4 : png[25] === 3 ? 1 : 3;
if (png[24] !== 8 || ![2, 3, 6].includes(png[25])) throw new Error('Expected an 8-bit RGB/RGBA/indexed atlas.');
let palette;
const compressed = [];
for (let offset = 8; offset < png.length;) { const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8); if (type === 'IDAT') compressed.push(png.subarray(offset + 8, offset + 8 + length)); if (type === 'PLTE') palette = png.subarray(offset + 8, offset + 8 + length); offset += length + 12; }
const raw = zlib.inflateSync(Buffer.concat(compressed)), stride = width * channels, pixels = Buffer.alloc(height * stride);
const paeth = (a, b, c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
  const filter = raw[y * (stride + 1)], value = raw[y * (stride + 1) + x + 1];
  const a = x >= channels ? pixels[y * stride + x - channels] : 0, b = y ? pixels[(y - 1) * stride + x] : 0, c = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
  pixels[y * stride + x] = (value + [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter]) & 255;
}
const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const targets = { 'house-a': 'a', 'house-b': 'b', 'house-c': 'e', lodge: 'm', market: 't' };
for (const [target, type] of Object.entries(targets)) {
  const input = fs.readFileSync(path.join(directory, `building-type-${type}.glb`)), jsonLength = input.readUInt32LE(12);
  const source = JSON.parse(input.toString('utf8', 20, 20 + jsonLength)), binary = input.subarray(jsonLength + 28);
  function read(index, vertex, dimension) {
    const accessor = source.accessors[index], view = source.bufferViews[accessor.bufferView];
    const count = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type], bytes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[accessor.componentType];
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + vertex * (view.byteStride ?? count * bytes) + dimension * bytes;
    return accessor.componentType === 5126 ? binary.readFloatLE(offset) : accessor.componentType === 5125 ? binary.readUInt32LE(offset) : accessor.componentType === 5123 ? binary.readUInt16LE(offset) : binary.readUInt8(offset);
  }
  const groups = new Map();
  for (const mesh of source.meshes) for (const primitive of mesh.primitives) {
    const indices = source.accessors[primitive.indices], positions = source.accessors[primitive.attributes.POSITION];
    const top = positions.max[1], bottom = positions.min[1];
    for (let triangle = 0; triangle < indices.count; triangle += 3) {
      const ids = [0, 1, 2].map(j => read(primitive.indices, triangle + j, 0));
      const data = ids.map(id => {
        const u = read(primitive.attributes.TEXCOORD_0, id, 0), v = read(primitive.attributes.TEXCOORD_0, id, 1);
        const pixel = (Math.min(height - 1, Math.max(0, Math.round(v * (height - 1)))) * width + Math.min(width - 1, Math.max(0, Math.round(u * (width - 1))))) * channels;
        return { id, p: [0, 1, 2].map(d => read(primitive.attributes.POSITION, id, d)), n: [0, 1, 2].map(d => read(primitive.attributes.NORMAL, id, d)), rgb: [0, 1, 2].map(d => (palette ? palette[pixels[pixel] * 3 + d] : pixels[pixel + d]) / 255) };
      });
      const [r, g, b] = data[0].rgb, y = data.reduce((sum, vertex) => sum + vertex.p[1], 0) / 3;
      const role = g > r * 1.15 && g > b * 1.07 ? (y > bottom + (top - bottom) * .48 ? 'Roof' : 'Foliage') : b > r * 1.07 && g > .4 && b > .45 ? 'Windows' : Math.min(r, g, b) > .65 ? 'Walls' : 'Trim';
      if (!groups.has(role)) groups.set(role, { positions: [], normals: [], colors: [], indices: [], vertices: new Map() });
      const group = groups.get(role);
      for (const vertex of data) {
        if (!group.vertices.has(vertex.id)) {
          group.vertices.set(vertex.id, group.positions.length / 3);
          group.positions.push(...vertex.p); group.normals.push(...vertex.n); group.colors.push(...vertex.rgb.map(linear));
        }
        group.indices.push(group.vertices.get(vertex.id));
      }
    }
  }
  const output = { asset: { version: '2.0', generator: 'Kenney CC0 atlas-to-vertex-color adaptation', copyright: 'Kenney, CC0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: target }], meshes: [{ primitives: [] }], materials: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] };
  const chunks = []; let offset = 0;
  function accessor(array, type, componentType) {
    const bytes = Buffer.from(array.buffer), padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4); bytes.copy(padded);
    const view = output.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1; chunks.push(padded); offset += padded.length;
    const item = { bufferView: view, componentType, count: array.length / (type === 'SCALAR' ? 1 : 3), type };
    if (type === 'VEC3') { item.min = [Infinity, Infinity, Infinity]; item.max = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < array.length; i++) { item.min[i % 3] = Math.min(item.min[i % 3], array[i]); item.max[i % 3] = Math.max(item.max[i % 3], array[i]); } }
    return output.accessors.push(item) - 1;
  }
  for (const [role, group] of groups) {
    const material = output.materials.push({ name: role, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], roughnessFactor: role === 'Windows' ? .35 : .85, metallicFactor: 0 }, doubleSided: true }) - 1;
    output.meshes[0].primitives.push({ attributes: { POSITION: accessor(new Float32Array(group.positions), 'VEC3', 5126), NORMAL: accessor(new Float32Array(group.normals), 'VEC3', 5126), COLOR_0: accessor(new Float32Array(group.colors), 'VEC3', 5126) }, indices: accessor(new Uint32Array(group.indices), 'SCALAR', 5125), material });
  }
  output.buffers[0].byteLength = offset;
  const text = Buffer.from(JSON.stringify(output)), json = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32); text.copy(json);
  const bin = Buffer.concat(chunks), header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
  const destination = path.resolve('public/models/nordic', `${target}.glb`);
  fs.writeFileSync(destination, Buffer.concat([header, json, binHeader, bin]));
  console.log({ target, original: `building-type-${type}`, bytes: fs.statSync(destination).size, roles: [...groups.keys()] });
}
