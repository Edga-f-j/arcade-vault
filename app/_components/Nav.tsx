"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/app/_context/AuthContext"

export default function Nav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, signOut } = useAuth()

  const isActive = (href: string) => {
    if (href === "/biblioteca") return pathname === "/biblioteca" || pathname.startsWith("/detalle") || pathname.startsWith("/player")
    return pathname === href
  }

  function close() { setOpen(false) }

  async function handleSignOut() {
    await signOut()
    close()
  }

  function goAuth() {
    close()
    router.push("/auth")
  }

  return (
    <>
      <nav className="av-nav">
        <Link href="/biblioteca" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>

        <div className="links">
          <Link href="/biblioteca" className={isActive("/biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("/salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={isActive("/about") ? "active" : ""}>
            ACERCA DE
          </Link>
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>

        {user && profile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28,
              background: "var(--cyan)",
              color: "#000",
              fontFamily: "var(--font-pixel)",
              fontSize: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {profile.username[0].toUpperCase()}
            </div>
            <span className="mono" style={{ fontSize: 12, letterSpacing: "0.1em", color: "var(--ink)" }}>
              {profile.username}
            </span>
            <button className="btn ghost auth-btn" onClick={handleSignOut}>
              SALIR
            </button>
          </div>
        ) : (
          <button className="btn auth-btn" onClick={goAuth}>
            ENTRAR
          </button>
        )}

        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/biblioteca" className={isActive("/biblioteca") ? "active" : ""} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={isActive("/salon") ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/about" className={isActive("/about") ? "active" : ""} onClick={close}>
          ACERCA DE
        </Link>
        {user && profile ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
              <div style={{
                width: 28, height: 28,
                background: "var(--cyan)",
                color: "#000",
                fontFamily: "var(--font-pixel)",
                fontSize: 11,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {profile.username[0].toUpperCase()}
              </div>
              <span className="mono" style={{ fontSize: 12, letterSpacing: "0.1em", color: "var(--ink)" }}>
                {profile.username}
              </span>
            </div>
            <button className="btn ghost" style={{ textAlign: "left", padding: "14px 12px" }} onClick={handleSignOut}>
              SALIR
            </button>
          </>
        ) : (
          <Link href="/auth" className={isActive("/auth") ? "active" : ""} onClick={close}>
            ENTRAR
          </Link>
        )}
        <div style={{ flex: 1 }} />
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  )
}
