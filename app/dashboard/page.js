'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { palettes, borders, frames, typePairings } from '../../lib/presets'
import { compressImage } from '../../lib/compressImage'

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const MAX_RAW_SIZE = 8 * 1024 * 1024

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [world, setWorld] = useState(null)
  const [content, setContent] = useState([])
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

  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [contentError, setContentError] = useState(null)

  const [currentPhase, setCurrentPhase] = useState(null)
  const [phaseCount, setPhaseCount] = useState(0)
  const [phaseTitle, setPhaseTitle] = useState('')
  const [phaseGoal, setPhaseGoal] = useState(50)
  const [openingPhase, setOpeningPhase] = useState(false)
  const [phaseError, setPhaseError] = useState(null)

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

        const { data: contentData } = await supabase
          .from('content_posts')
          .select('*')
          .eq('world_id', worldData.id)
          .order('created_at', { ascending: false })
        setContent(contentData || [])

        await loadCurrentPhase(worldData.id)
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function loadCurrentPhase(worldId) {
    const { data: phaseData } = await supabase
      .from('phases')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!phaseData) {
      setCurrentPhase(null)
      return
    }

    const { count } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('phase_id', phaseData.id)

    setCurrentPhase(phaseData)
    setPhaseCount(count || 0)
  }

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

  async function handleAddLink(e) {
    e.preventDefault()
    setContentError(null)
    if (!linkUrl.trim()) return
    setAddingLink(true)

    const { data, error } = await supabase
      .from('content_posts')
      .insert({ world_id: world.id, type: 'link', url: linkUrl.trim(), title: linkTitle.trim() || null })
      .select()
      .single()

    setAddingLink(false)
    if (error) {
      setContentError(error.message)
      return
    }
    setContent([data, ...content])
    setLinkUrl('')
    setLinkTitle('')
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setContentError(null)

    if (file.size > MAX_RAW_SIZE) {
      setContentError('Image is too large — please choose a file under 8MB.')
      return
    }

    setUploadingImage(true)
    try {
      const compressedBlob = await compressImage(file)
      const path = `${world.id}/${crypto.randomUUID()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('world-images')
        .upload(path, compressedBlob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('world-images')
        .getPublicUrl(path)

      const { data, error: insertError } = await supabase
        .from('content_posts')
        .insert({ world_id: world.id, type: 'image', url: publicUrlData.publicUrl })
        .select()
        .single()
      if (insertError) throw insertError

      setContent([data, ...content])
    } catch (err) {
      setContentError(err.message)
    }
    setUploadingImage(false)
    e.target.value = ''
  }

  async function handleDeleteContent(id) {
    const { error } = await supabase.from('content_posts').delete().eq('id', id)
    if (!error) setContent(content.filter((c) => c.id !== id))
  }

  async function handleOpenPhase(e) {
    e.preventDefault()
    setPhaseError(null)

    if (!phaseTitle.trim() || phaseGoal < 1) {
      setPhaseError('Enter a title and a goal of at least 1.')
      return
    }

    setOpeningPhase(true)
    const { error } = await supabase
      .from('phases')
      .insert({ world_id: world.id, title: phaseTitle.trim(), goal: phaseGoal })

    setOpeningPhase(false)
    if (error) {
      setPhaseError(error.message)
      return
    }

    setPhaseTitle('')
    setPhaseGoal(50)
    await loadCurrentPhase(world.id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>

  const phaseComplete = currentPhase && phaseCount >= currentPhase.goal

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
            <select value={presetPalette} onChange={(e) => setPresetPalette(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}>
              {palettes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            Border
            <select value={presetBorder} onChange={(e) => setPresetBorder(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}>
              {borders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            Frame
            <select value={presetFrame} onChange={(e) => setPresetFrame(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}>
              {frames.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            Typography
            <select value={presetType} onChange={(e) => setPresetType(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}>
              {typePairings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <button onClick={handleSavePresets} disabled={savingPresets} style={{ marginTop: 16, padding: '10px 20px' }}>
            {savingPresets ? 'Saving...' : 'Save appearance'}
          </button>
          {presetSaved && <p style={{ color: 'green' }}>Saved — refresh your World to see it live.</p>}

          <h2 style={{ marginTop: 32 }}>Add content</h2>
          <form onSubmit={handleAddLink} style={{ marginTop: 12 }}>
            <input type="url" placeholder="Paste a link (YouTube, Twitch, Spotify, etc.)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required style={{ display: 'block', width: '100%', padding: 10, marginBottom: 8 }} />
            <input type="text" placeholder="Label (optional)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} style={{ display: 'block', width: '100%', padding: 10, marginBottom: 8 }} />
            <button type="submit" disabled={addingLink} style={{ padding: '8px 16px' }}>
              {addingLink ? 'Adding...' : 'Add link'}
            </button>
          </form>
          <div style={{ marginTop: 16 }}>
            <label>
              Upload an image (max 8MB, auto-compressed)
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ display: 'block', marginTop: 6 }} />
            </label>
            {uploadingImage && <p>Uploading...</p>}
          </div>
          {contentError && <p style={{ color: 'red' }}>{contentError}</p>}
          <div style={{ marginTop: 24 }}>
            {content.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>{item.type === 'link' ? `🔗 ${item.title || item.url}` : '🖼️ Image'}</span>
                <button onClick={() => handleDeleteContent(item.id)} style={{ fontSize: 12 }}>Remove</button>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 32 }}>Experience</h2>
          {currentPhase && !phaseComplete ? (
            <div>
              <p><strong>{currentPhase.title}</strong></p>
              <p>{phaseCount} / {currentPhase.goal} contributions</p>
              <div style={{ background: '#eee', borderRadius: 8, overflow: 'hidden', height: 16, marginTop: 4 }}>
                <div style={{ width: `${Math.min(100, (phaseCount / currentPhase.goal) * 100)}%`, background: '#4f46e5', height: '100%' }} />
              </div>
            </div>
          ) : (
            <div>
              {phaseComplete && <p>🎉 "{currentPhase.title}" hit its goal! Open a new Phase below.</p>}
              {!currentPhase && <p>No active Phase yet.</p>}
              <form onSubmit={handleOpenPhase} style={{ marginTop: 12 }}>
                <input
                  type="text"
                  placeholder="Phase title (e.g. Help me hit 100 clips!)"
                  value={phaseTitle}
                  onChange={(e) => setPhaseTitle(e.target.value)}
                  required
                  style={{ display: 'block', width: '100%', padding: 10, marginBottom: 8 }}
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Goal"
                  value={phaseGoal}
                  onChange={(e) => setPhaseGoal(Number(e.target.value))}
                  required
                  style={{ display: 'block', width: '100%', padding: 10, marginBottom: 8 }}
                />
                {phaseError && <p style={{ color: 'red' }}>{phaseError}</p>}
                <button type="submit" disabled={openingPhase} style={{ padding: '8px 16px' }}>
                  {openingPhase ? 'Opening...' : 'Open Phase'}
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p>You haven't created your World yet.</p>
          <form onSubmit={handleCreateWorld} style={{ marginTop: 16 }}>
            <input type="text" placeholder="World title (e.g. Jamie's Corner)" value={title} onChange={(e) => handleTitleChange(e.target.value)} required style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10 }} />
            <div style={{ marginBottom: 10, fontSize: 14, color: '#666' }}>
              orbis.app/
              <input type="text" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required style={{ padding: 6, width: '60%' }} />
            </div>
            <textarea placeholder="Short bio (optional)" value={bio} onChange={(e) => setBio(e.target.value)} style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10, minHeight: 80 }} />
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