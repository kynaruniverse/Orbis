'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Welcome, {profile?.display_name}</h1>
      <p>This is your dashboard. World creation comes in Step 2.</p>
      <button onClick={handleLogout} style={{ marginTop: 16, padding: '8px 16px' }}>
        Log out
      </button>
    </main>
  )
}