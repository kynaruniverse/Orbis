export const palettes = [
  { id: 'midnight', name: 'Midnight', background: '#0f172a', text: '#f1f5f9', accent: '#6366f1' },
  { id: 'sunset', name: 'Sunset', background: '#fff7ed', text: '#7c2d12', accent: '#f97316' },
  { id: 'forest', name: 'Forest', background: '#f0fdf4', text: '#14532d', accent: '#22c55e' },
  { id: 'blossom', name: 'Blossom', background: '#fdf2f8', text: '#831843', accent: '#ec4899' },
  { id: 'ocean', name: 'Ocean', background: '#f0f9ff', text: '#0c4a6e', accent: '#0ea5e9' },
  { id: 'mono', name: 'Mono', background: '#ffffff', text: '#111111', accent: '#111111' },
]

export const borders = [
  { id: 'none', name: 'None', style: {} },
  { id: 'thin', name: 'Thin', style: { border: '1px solid currentColor' } },
  { id: 'thick', name: 'Thick', style: { border: '4px solid currentColor' } },
  { id: 'dashed', name: 'Dashed', style: { border: '2px dashed currentColor' } },
  { id: 'double', name: 'Double', style: { border: '6px double currentColor' } },
  { id: 'rounded', name: 'Rounded Thick', style: { border: '3px solid currentColor', borderRadius: 16 } },
]

export const frames = [
  { id: 'plain', name: 'Plain', style: { padding: 24 } },
  { id: 'boxed', name: 'Boxed', style: { padding: 32, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' } },
  { id: 'card', name: 'Card', style: { padding: 32, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' } },
  { id: 'poster', name: 'Poster', style: { padding: 40, borderRadius: 4 } },
  { id: 'tight', name: 'Tight', style: { padding: 12, borderRadius: 8 } },
  { id: 'wide', name: 'Wide', style: { padding: '24px 48px', borderRadius: 16 } },
]

export const typePairings = [
  { id: 'classic', name: 'Classic', heading: 'Georgia, serif', body: 'Arial, sans-serif' },
  { id: 'modern', name: 'Modern', heading: '"Helvetica Neue", Arial, sans-serif', body: '"Helvetica Neue", Arial, sans-serif' },
  { id: 'friendly', name: 'Friendly', heading: '"Comic Sans MS", cursive', body: 'Verdana, sans-serif' },
  { id: 'techy', name: 'Techy', heading: '"Courier New", monospace', body: '"Courier New", monospace' },
  { id: 'elegant', name: 'Elegant', heading: '"Times New Roman", serif', body: '"Times New Roman", serif' },
  { id: 'bold', name: 'Bold', heading: '"Trebuchet MS", sans-serif', body: '"Trebuchet MS", sans-serif' },
]

function findOrFirst(list, id) {
  return list.find((item) => item.id === id) || list[0]
}

export function getPalette(id) { return findOrFirst(palettes, id) }
export function getBorder(id) { return findOrFirst(borders, id) }
export function getFrame(id) { return findOrFirst(frames, id) }
export function getType(id) { return findOrFirst(typePairings, id) }