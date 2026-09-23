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

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(182,169,206,0.25)' }}>
      <h2 style={{ fontSize: 20 }}>{title}</h2>
      {children}
    </div>
  )
}

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

  const [presetPalette, setPresetPalette] = useState('riot')
  const [presetBorder, setPresetBorder] = useState('none')
  const [presetFrame, setPresetFrame] = useState('plain')
  const [presetType, setPresetType] = useState('fanzine')
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
    <main style={{ padding: '32px 24px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>Hi, {profile?.display_name}</h1>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--orbis-muted)', color: 'var(--orbis-text)' }}>
          Log out
        </button>
      </div>

      {world ? (
        <div>
          <p style={{ marginTop: 16 }}>
            Your World: <a href={`/${world.slug}`} target="_blank" rel="noreferrer">orbis.app/{world.slug}</a>
          </p>

          <Section title="Appearance">
            <label style={{ display: 'block', marginTop: 12 }}>
              Colour palette
              <select value={presetPalette} onChange={(e) => setPresetPalette(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                {palettes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginTop: 12 }}>
              Border
              <select value={presetBorder} onChange={(e) => setPresetBorder(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                {borders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginTop: 12 }}>
              Frame
              <select value={presetFrame} onChange={(e) => setPresetFrame(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                {frames.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginTop: 12 }}>
              Typography
              <select value={presetType} onChange={(e) => setPresetType(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                {typePairings.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <button onClick={handleSavePresets} disabled={savingPresets} style={{ marginTop: 16 }}>
              {savingPresets ? 'Saving...' : 'Save appearance'}
            </button>
            {presetSaved && <p style={{ color: 'var(--orbis-accent-2)' }}>Saved — refresh your World to see it live.</p>}
          </Section>

          <Section title="Content">
            <form onSubmit={handleAddLink} style={{ marginTop: 8 }}>
              <input type="url" placeholder="Paste a link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required style={{ display: 'block', width: '100%', marginBottom: 8 }} />
              <input type="text" placeholder="Label (optional)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8 }} />
              <button type="submit" disabled={addingLink}>{addingLink ? 'Adding...' : 'Add link'}</button>
            </form>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 14 }}>
                Upload an image (max 8MB)
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ display: 'block', marginTop: 6, background: 'transparent', border: 'none', padding: 0 }} />
              </label>
              {uploadingImage && <p>Uploading...</p>}
            </div>

            {contentError && <p style={{ color: 'var(--orbis-accent)' }}>{contentError}</p>}

            <div style={{ marginTop: 16 }}>
              {content.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(182,169,206,0.2)' }}>
                  <span>{item.type === 'link' ? `🔗 ${item.title || item.url}` : '🖼️ Image'}</span>
                  <button onClick={() => handleDeleteContent(item.id)} style={{ background: 'transparent', color: 'var(--orbis-muted)', fontSize: 12, padding: '4px 8px' }}>Remove</button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Experience">
            {currentPhase && !phaseComplete ? (
              <div>
                <p><strong>{currentPhase.title}</strong></p>
                <p>{phaseCount} / {currentPhase.goal} contributions</p>
                <div style={{ background: 'rgba(182,169,206,0.25)', borderRadius: 8, overflow: 'hidden', height: 16, marginTop: 4 }}>
                  <div style={{ width: `${Math.min(100, (phaseCount / currentPhase.goal) * 100)}%`, background: 'var(--orbis-accent)', height: '100%' }} />
                </div>
              </div>
            ) : (
              <div>
                {phaseComplete && <p>"{currentPhase.title}" hit its goal. Open a new Phase below.</p>}
                {!currentPhase && <p style={{ color: 'var(--orbis-muted)' }}>No active Phase yet.</p>}
                <form onSubmit={handleOpenPhase} style={{ marginTop: 12 }}>
                  <input type="text" placeholder="Phase title" value={phaseTitle} onChange={(e) => setPhaseTitle(e.target.value)} required style={{ display: 'block', width: '100%', marginBottom: 8 }} />
                  <input type="number" min={1} placeholder="Goal" value={phaseGoal} onChange={(e) => setPhaseGoal(Number(e.target.value))} required style={{ display: 'block', width: '100%', marginBottom: 8 }} />
                  {phaseError && <p style={{ color: 'var(--orbis-accent)' }}>{phaseError}</p>}
                  <button type="submit" disabled={openingPhase}>{openingPhase ? 'Opening...' : 'Open Phase'}</button>
                </form>
              </div>
            )}
          </Section>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <p>You haven't created your World yet.</p>
          <form onSubmit={handleCreateWorld} style={{ marginTop: 16 }}>
            <input type="text" placeholder="World title" value={title} onChange={(e) => handleTitleChange(e.target.value)} required style={{ display: 'block', width: '100%', marginBottom: 10 }} />
            <div style={{ marginBottom: 10, fontSize: 14, color: 'var(--orbis-muted)' }}>
              orbis.app/
              <input type="text" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required style={{ width: '60%', display: 'inline-block' }} />
            </div>
            <textarea placeholder="Short bio (optional)" value={bio} onChange={(e) => setBio(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 10, minHeight: 80 }} />
            {error && <p style={{ color: 'var(--orbis-accent)' }}>{error}</p>}
            <button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create my World'}</button>
          </form>
        </div>
      )}
    </main>
  )
}