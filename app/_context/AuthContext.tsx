"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@/lib/data"

interface AuthContextValue {
  user: User | null
  login: (u: User) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("av_user")
      if (stored) setUser(JSON.parse(stored))
    } catch {}
  }, [])

  function login(u: User) {
    setUser(u)
    localStorage.setItem("av_user", JSON.stringify(u))
  }

  function signOut() {
    setUser(null)
    localStorage.removeItem("av_user")
  }

  return (
    <AuthContext.Provider value={{ user, login, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
