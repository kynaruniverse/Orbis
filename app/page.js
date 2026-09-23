import { palettes, borders, frames, typePairings } from '../lib/presets'

function MiniWorld({ paletteId, borderId, frameId, typeId, title, bio }) {
  const palette = palettes.find((p) => p.id === paletteId)
  const border = borders.find((b) => b.id === borderId)
  const frame = frames.find((f) => f.id === frameId)
  const type = typePairings.find((t) => t.id === typeId)

  return (
    <div style={{ background: palette.background, color: palette.text, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ fontFamily: type.body, ...frame.style, ...border.style, margin: frame.style.padding ? undefined : 0 }}>
        <h3 style={{ fontFamily: type.heading, color: palette.accent, marginBottom: 8 }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>{bio}</p>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 42, maxWidth: 560 }}>A World, not a profile.</h1>
      <p style={{ fontSize: 18, color: 'var(--orbis-muted)', maxWidth: 480 }}>
        Build a place for your community — your own colours, your own type, your own shape. Not another identical feed.
      </p>
      <a href="/signup" className="btn" style={{ display: 'inline-block', marginTop: 16 }}>
        Build your World
      </a>

      <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <MiniWorld paletteId="riot" borderId="sticker" frameId="boxed" typeId="poster" title="THE RIOT ROOM" bio="Live gigs every Friday. 340 Locals." />
        <MiniWorld paletteId="meadow" borderId="tape" frameId="card" typeId="scrapbook" title="quiet corner" bio="a small place for slow crafts and tea" />
        <MiniWorld paletteId="tide" borderId="glow" frameId="wide" typeId="console" title="signal.log" bio="dev streams, weekly builds, open bugs" />
      </div>
    </main>
  )
}