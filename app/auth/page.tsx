"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthPage() {
  const [tab, setTab] = useState<"in" | "up">("in")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [pass, setPass] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setLoading(false)
    if (error) { setError(error.message || 'Credenciales incorrectas. Intenta de nuevo.'); return }
    router.push("/biblioteca")
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!username.trim()) { setError("El nombre de usuario es obligatorio"); return }
    if (username.length > 10) { setError("El nombre de usuario no puede tener más de 10 caracteres"); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { username: username.toUpperCase().slice(0, 10) } },
    })
    setLoading(false)
    if (error) {
      const msg = error.message && error.message !== '{}' ? error.message : 'Error al crear la cuenta. Intenta de nuevo.'
      setError(msg)
      return
    }
    router.push("/biblioteca")
  }

  async function handleOAuth(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const isLogin = tab === "in"

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.16em", marginTop: 6 }}>
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button className={isLogin ? "on" : ""} onClick={() => { setTab("in"); setError(null) }}>
            INICIAR SESIÓN
          </button>
          <button className={!isLogin ? "on" : ""} onClick={() => { setTab("up"); setError(null) }}>
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          {!isLogin && (
            <div className="field slide-in">
              <label>Usuario (máx. 10 caracteres)</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="px_kai"
                maxLength={10}
                required
              />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
              required
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{ color: "var(--magenta)", fontSize: 12, marginTop: 6, letterSpacing: "0.05em" }}>
              {error}
            </div>
          )}

          {isLogin && (
            <div style={{ textAlign: "right", marginTop: 4 }}>
              <a href="/auth/reset" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.08em" }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}

          <button className="btn lg" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
            {loading ? "..." : isLogin ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button" onClick={() => handleOAuth("google")}>◆ GOOGLE</button>
          <button className="btn ghost" type="button" onClick={() => handleOAuth("github")}>▣ GITHUB</button>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  )
}
