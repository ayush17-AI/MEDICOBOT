'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function UserHeader() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  if (!user) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <header className="w-full bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md relative z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
          {user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="text-sm text-gray-300 font-medium hidden sm:inline">{user.email}</span>
      </div>
      <button
        onClick={handleLogout}
        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition cursor-pointer"
      >
        Logout
      </button>
    </header>
  )
}
