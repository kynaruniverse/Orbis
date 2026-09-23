'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { getPalette, getBorder, getFrame, getType } from '../../lib/presets'

export default function WorldPage() {
  const { slug } = useParams()
  const [world, setWorld] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('worlds')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (!data || error) {
        setNotFound(true)
      } else {
        setWorld(data)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (notFound) return <p style={{ padding: 24 }}>This World doesn't exist.</p>

  const palette = getPalette(world.preset_palette)
  const border = getBorder(world.preset_border)
  const frame = getFrame(world.preset_frame)
  const type = getType(world.preset_type)

  return (
    <div style={{ minHeight: '100vh', background: palette.background, color: palette.text }}>
      <main
        style={{
          maxWidth: 600,
          margin: '0 auto',
          fontFamily: type.body,
          ...frame.style,
          ...border.style,
        }}
      >
        <h1 style={{ fontFamily: type.heading, color: palette.accent }}>{world.title}</h1>
        {world.bio && <p>{world.bio}</p>}
        <p style={{ marginTop: 24, opacity: 0.6, fontSize: 14 }}>
          Content and Experiences coming in the next build steps.
        </p>
      </main>
    </div>
  )
}