'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { getPalette, getBorder, getFrame, getType } from '../../lib/presets'

export default function WorldPage() {
  const { slug } = useParams()
  const router = useRouter()

  const [world, setWorld] = useState(null)
  const [content, setContent] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [user, setUser] = useState(null)
  const [localCount, setLocalCount] = useState(0)
  const [isLocal, setIsLocal] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [joining, setJoining] = useState(false)

  const [phase, setPhase] = useState(null)
  const [phaseCount, setPhaseCount] = useState(0)
  const [hasContributed, setHasContributed] = useState(false)
  const [contributing, setContributing] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      const { data, error } = await supabase
        .from('worlds')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (!data || error) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setWorld(data)
      setIsOwner(currentUser?.id === data.owner_id)

      const { data: contentData } = await supabase
        .from('content_posts')
        .select('*')
        .eq('world_id', data.id)
        .order('created_at', { ascending: false })
      setContent(contentData || [])

      const { count } = await supabase
        .from('locals')
        .select('*', { count: 'exact', head: true })
        .eq('world_id', data.id)
      setLocalCount(count || 0)

      if (currentUser) {
        const { data: localRow } = await supabase
          .from('locals')
          .select('*')
          .eq('world_id', data.id)
          .eq('profile_id', currentUser.id)
          .maybeSingle()
        setIsLocal(!!localRow)
      }

      const { data: phaseData } = await supabase
        .from('phases')
        .select('*')
        .eq('world_id', data.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (phaseData) {
        setPhase(phaseData)
        const { count: contribCount } = await supabase
          .from('contributions')
          .select('*', { count: 'exact', head: true })
          .eq('phase_id', phaseData.id)
        setPhaseCount(contribCount || 0)

        if (currentUser) {
          const { data: existing } = await supabase
            .from('contributions')
            .select('id')
            .eq('phase_id', phaseData.id)
            .eq('profile_id', currentUser.id)
            .maybeSingle()
          setHasContributed(!!existing)
        }
      }

      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!phase) return
    const channel = supabase
      .channel(`phase-${phase.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions', filter: `phase_id=eq.${phase.id}` }, () => {
        setPhaseCount((c) => c + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [phase])

  async function handleJoin() {
    if (!user) { router.push('/login'); return }
    setJoining(true)
    const { error } = await supabase.from('locals').insert({ world_id: world.id, profile_id: user.id })
    setJoining(false)
    if (!error) { setIsLocal(true); setLocalCount(localCount + 1) }
  }

  async function handleLeave() {
    setJoining(true)
    const { error } = await supabase.from('locals').delete().eq('world_id', world.id).eq('profile_id', user.id)
    setJoining(false)
    if (!error) { setIsLocal(false); setLocalCount(localCount - 1) }
  }

  async function handleContribute() {
    if (!user) { router.push('/login'); return }
    if (!phase || hasContributed) return
    setContributing(true)
    const { error } = await supabase.from('contributions').insert({ phase_id: phase.id, profile_id: user.id })
    setContributing(false)
    if (!error) setHasContributed(true)
  }

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (notFound) return <p style={{ padding: 24 }}>This World doesn't exist.</p>

  const palette = getPalette(world.preset_palette)
  const border = getBorder(world.preset_border)
  const frame = getFrame(world.preset_frame)
  const type = getType(world.preset_type)

  const links = content.filter((c) => c.type === 'link')
  const images = content.filter((c) => c.type === 'image')
  const phaseComplete = phase && phaseCount >= phase.goal
  const pct = phase ? Math.min(100, Math.round((phaseCount / phase.goal) * 100)) : 0

  return (
    <div style={{ minHeight: '100vh', background: palette.background, color: palette.text }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ fontFamily: type.body, ...frame.style, ...border.style }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: type.heading, color: palette.accent, fontSize: 34, margin: 0 }}>{world.title}</h1>
            {!isOwner && (
              isLocal ? (
                <button onClick={handleLeave} disabled={joining} style={{ background: 'transparent', border: `1.5px solid ${palette.text}`, color: palette.text, padding: '6px 14px', borderRadius: 6 }}>
                  {joining ? '...' : 'Leave'}
                </button>
              ) : (
                <button onClick={handleJoin} disabled={joining} style={{ background: palette.accent, color: palette.background, border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 600 }}>
                  {joining ? '...' : 'Become a Local'}
                </button>
              )
            )}
          </div>

          {world.bio && <p style={{ marginTop: 8, opacity: 0.85 }}>{world.bio}</p>}
          <p style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>{localCount} Local{localCount === 1 ? '' : 's'}</p>

          {phase && (
            <div style={{ marginTop: 28, borderLeft: `3px solid ${palette.accent}`, paddingLeft: 16 }}>
              <h2 style={{ fontFamily: type.heading, fontSize: 20 }}>{phase.title}</h2>
              <div style={{ background: 'rgba(128,128,128,0.25)', borderRadius: 8, overflow: 'hidden', height: 18 }}>
                <div style={{ width: `${pct}%`, background: palette.accent, height: '100%', transition: 'width 0.3s' }} />
              </div>
              <p style={{ marginTop: 4, fontSize: 14 }}>{phaseCount} / {phase.goal}</p>
              {phaseComplete ? (
                <p style={{ marginTop: 8 }}>Goal reached.</p>
              ) : (
                <button
                  onClick={handleContribute}
                  disabled={contributing || hasContributed}
                  style={{ marginTop: 8, background: palette.accent, color: palette.background, border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600 }}
                >
                  {hasContributed ? "You've contributed" : contributing ? '...' : 'Contribute'}
                </button>
              )}
            </div>
          )}

          {links.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontFamily: type.heading, fontSize: 18 }}>Links</h2>
              {links.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px 0', color: palette.accent }}>
                  {link.title || link.url}
                </a>
              ))}
            </div>
          )}

          {images.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontFamily: type.heading, fontSize: 18 }}>Gallery</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                {images.map((img) => (
                  <img key={img.id} src={img.url} alt="" style={{ width: '100%', borderRadius: 8, objectFit: 'cover', aspectRatio: '1' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}