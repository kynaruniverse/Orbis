export const palettes = [
  { id: 'riot', name: 'Riot', background: '#12081F', text: '#F5EEDD', accent: '#FF3D68' },
  { id: 'meadow', name: 'Meadow', background: '#F1F7E8', text: '#1B3B2E', accent: '#3E7A4C' },
  { id: 'static', name: 'Static', background: '#E8E4FF', text: '#221A3D', accent: '#7B5CFF' },
  { id: 'amber', name: 'Amber', background: '#FFF3D6', text: '#4A2E0A', accent: '#E8890C' },
  { id: 'tide', name: 'Tide', background: '#DDF3F5', text: '#0A3B42', accent: '#16B3C4' },
  { id: 'mono', name: 'Mono', background: '#FFFFFF', text: '#101010', accent: '#101010' },
]

export const borders = [
  { id: 'none', name: 'None', style: {} },
  { id: 'sticker', name: 'Sticker', style: { border: '3px solid currentColor', boxShadow: '6px 6px 0 0 currentColor', borderRadius: 4 } },
  { id: 'tape', name: 'Tape', style: { border: '2px dashed currentColor', borderRadius: 2 } },
  { id: 'frame-thick', name: 'Double Frame', style: { border: '10px solid currentColor', boxShadow: 'inset 0 0 0 3px currentColor' } },
  { id: 'cutout', name: 'Cutout Corner', style: { border: '2px solid currentColor', clipPath: 'polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px)' } },
  { id: 'glow', name: 'Glow', style: { boxShadow: '0 0 0 2px currentColor, 0 8px 24px rgba(0,0,0,0.35)', borderRadius: 12 } },
]

export const frames = [
  { id: 'plain', name: 'Plain', style: { padding: 24 } },
  { id: 'boxed', name: 'Boxed', style: { padding: 32, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' } },
  { id: 'card', name: 'Card', style: { padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' } },
  { id: 'poster', name: 'Poster', style: { padding: 40, borderRadius: 0 } },
  { id: 'tight', name: 'Tight', style: { padding: 12, borderRadius: 8 } },
  { id: 'wide', name: 'Wide', style: { padding: '24px 48px', borderRadius: 16 } },
]

export const typePairings = [
  { id: 'fanzine', name: 'Fanzine', heading: "'Fraunces', serif", body: "'Work Sans', sans-serif" },
  { id: 'poster', name: 'Poster', heading: "'Bebas Neue', sans-serif", body: "'Karla', sans-serif" },
  { id: 'scrapbook', name: 'Scrapbook', heading: "'Caveat', cursive", body: "'Nunito Sans', sans-serif" },
  { id: 'console', name: 'Console', heading: "'Space Mono', monospace", body: "'Space Mono', monospace" },
]

function findOrFirst(list, id) {
  return list.find((item) => item.id === id) || list[0]
}

export function getPalette(id) { return findOrFirst(palettes, id) }
export function getBorder(id) { return findOrFirst(borders, id) }
export function getFrame(id) { return findOrFirst(frames, id) }
export function getType(id) { return findOrFirst(typePairings, id) }