"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ResetPage() {
  const [step, setStep] = useState<"request" | "confirm">("request")
  const [email, setEmail] = useState("")
  const [pass, setPass] = useState("")
  const [passConfirm, setPassConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStep("confirm")
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMessage("Revisa tu correo — te hemos enviado un enlace para restablecer tu contraseña.")
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pass !== passConfirm) { setError("Las contraseñas no coinciden"); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pass })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push("/biblioteca")
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.16em", marginTop: 6 }}>
            {step === "request" ? "RECUPERAR CONTRASEÑA" : "NUEVA CONTRASEÑA"}
          </div>
        </div>

        {step === "request" ? (
          message ? (
            <div style={{ color: "var(--cyan)", fontSize: 13, textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
              {message}
            </div>
          ) : (
            <form onSubmit={handleRequest}>
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
              {error && (
                <div style={{ color: "var(--magenta)", fontSize: 12, marginTop: 6, letterSpacing: "0.05em" }}>
                  {error}
                </div>
              )}
              <button className="btn lg" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
                {loading ? "..." : "ENVIAR ENLACE"}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleConfirm}>
            <div className="field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={passConfirm}
                onChange={(e) => setPassConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div style={{ color: "var(--magenta)", fontSize: 12, marginTop: 6, letterSpacing: "0.05em" }}>
                {error}
              </div>
            )}
            <button className="btn lg" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
              {loading ? "..." : "GUARDAR CONTRASEÑA"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <a href="/auth" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.08em" }}>
            ← VOLVER AL LOGIN
          </a>
        </div>
      </div>
    </div>
  )
}
