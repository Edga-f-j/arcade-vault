"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Tables } from "@/types/database"

type Game = Tables<"games">

function GameCard({ game }: { game: Game }) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = ""
  }

  function go() { router.push(game.route) }

  return (
    <div ref={ref} className="card" onMouseMove={onMove} onMouseLeave={onLeave} onClick={go}>
      <div className="cover">
        {game.image_url
          ? <img src={game.image_url} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div className="cover-bg cover-rocas" />
        }
      </div>
      <div className="meta">
        <div className="title">{game.name}</div>
        <div className="desc">{game.description}</div>
        <div className="row">
          <button className="btn" onClick={(e) => { e.stopPropagation(); go() }}>
            JUGAR
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BibliotecaCatalog({ games }: { games: Game[] }) {
  const [q, setQ] = useState("")

  const filtered = useMemo(
    () => games.filter((g) => g.name.toLowerCase().includes(q.toLowerCase())),
    [q, games]
  )

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.slug} game={g} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 80, color: "var(--ink-faint)" }}>
            <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}>
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda.</div>
          </div>
        )}
      </div>
    </div>
  )
}
