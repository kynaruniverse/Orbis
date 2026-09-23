'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { palettes, borders, frames, typePairings } from '../../lib/presets'

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [world, setWorld] = useState(null)
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [presetPalette, setPresetPalette] = useState('midnight')
  const [presetBorder, setPresetBorder] = useState('none')
  const [presetFrame, setPresetFrame] = useState('plain')
  const [presetType, setPresetType] = useState('classic')
  const [savingPresets, setSavingPresets] = useState(false)
  const [presetSaved, setPresetSaved] = useState(false)

  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: worldData } = await supabase
        .from('worlds')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (worldData) {
        setWorld(worldData)
        setPresetPalette(worldData.preset_palette)
        setPresetBorder(worldData.preset_border)
        setPresetFrame(worldData.preset_frame)
        setPresetType(worldData.preset_type)
      }

      setLoading(false)
    }
    load()
  }, [router])

  function handleTitleChange(value) {
    setTitle(value)
    setSlug(slugify(value))
  }

  async function handleCreateWorld(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const finalSlug = slugify(slug)

    if (!finalSlug) {
      setError('Please enter a valid title or slug.')
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('worlds')
      .insert({ owner_id: user.id, slug: finalSlug, title, bio })
      .select()
      .single()

    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        setError('That URL is already taken — try a different title or slug.')
      } else {
        setError(error.message)
      }
      return
    }

    setWorld(data)
  }

  async function handleSavePresets() {
    setSavingPresets(true)
    setPresetSaved(false)

    const { error } = await supabase
      .from('worlds')
      .update({
        preset_palette: presetPalette,
        preset_border: presetBorder,
        preset_frame: presetFrame,
        preset_type: presetType,
      })
      .eq('id', world.id)

    setSavingPresets(false)
    if (!error) setPresetSaved(true)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <h1>Welcome, {profile?.display_name}</h1>

      {world ? (
        <div>
          <p>Your World is live at:</p>
          <p>
            <a href={`/${world.slug}`} target="_blank" rel="noreferrer">
              orbis.app/{world.slug}
            </a>
          </p>

          <h2 style={{ marginTop: 32 }}>Customise your World</h2>

          <label style={{ display: 'block', marginTop: 12 }}>
            Colour palette
            <select
              value={presetPalette}
              onChange={(e) => setPresetPalette(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            >
              {palettes.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block', marginTop: 12 }}>
            Border
            <select
              value={presetBorder}
              onChange={(e) => setPresetBorder(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            >
              {borders.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block', marginTop: 12 }}>
            Frame
            <select
              value={presetFrame}
              onChange={(e) => setPresetFrame(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            >
              {frames.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block', marginTop: 12 }}>
            Typography
            <select
              value={presetType}
              onChange={(e) => setPresetType(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            >
              {typePairings.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>

          <button
            onClick={handleSavePresets}
            disabled={savingPresets}
            style={{ marginTop: 16, padding: '10px 20px' }}
          >
            {savingPresets ? 'Saving...' : 'Save appearance'}
          </button>
          {presetSaved && <p style={{ color: 'green' }}>Saved — refresh your World to see it live.</p>}
        </div>
      ) : (
        <div>
          <p>You haven't created your World yet.</p>
          <form onSubmit={handleCreateWorld} style={{ marginTop: 16 }}>
            <input
              type="text"
              placeholder="World title (e.g. Jamie's Corner)"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10 }}
            />
            <div style={{ marginBottom: 10, fontSize: 14, color: '#666' }}>
              orbis.app/
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                required
                style={{ padding: 6, width: '60%' }}
              />
            </div>
            <textarea
              placeholder="Short bio (optional)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, minHeight: 80 }}
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type="submit" disabled={saving} style={{ padding: '10px 20px' }}>
              {saving ? 'Creating...' : 'Create my World'}
            </button>
          </form>
        </div>
      )}

      <button onClick={handleLogout} style={{ marginTop: 24, padding: '8px 16px' }}>
        Log out
      </button>
    </main>
  )
}