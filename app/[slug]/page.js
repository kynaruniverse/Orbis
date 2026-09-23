'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { getPalette, getBorder, getFrame, getType } from '../../lib/presets'

export default function WorldPage() {
  const { slug } = useParams()
  const [world, setWorld] = useState(null)
  const [content, setContent] = useState([])
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
        setLoading(false)
        return
      }

      setWorld(data)

      const { data: contentData } = await supabase
        .from('content_posts')
        .select('*')
        .eq('world_id', data.id)
        .order('created_at', { ascending: false })
      setContent(contentData || [])

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

  const links = content.filter((c) => c.type === 'link')
  const images = content.filter((c) => c.type === 'image')

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

        {links.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontFamily: type.heading, fontSize: 18 }}>Links</h2>
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'block', padding: '10px 0', color: palette.accent }}
              >
                {link.title || link.url}
              </a>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontFamily: type.heading, fontSize: 18 }}>Gallery</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
              {images.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  style={{ width: '100%', borderRadius: 8, objectFit: 'cover', aspectRatio: '1' }}
                />
              ))}
            </div>
          </div>
        )}

        <p style={{ marginTop: 24, opacity: 0.6, fontSize: 14 }}>
          Community and Experiences coming in the next build steps.
        </p>
      </main>
    </div>
  )
}