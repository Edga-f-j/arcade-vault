'use client'

import { useState } from "react"
import type { ScoreRow } from "./page"

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface Props {
  games: { slug: string; name: string }[]
  scoresBySlug: Record<string, ScoreRow[]>
}

export default function SalonTabs({ games, scoresBySlug }: Props) {
  const [activeTab, setActiveTab] = useState(games[0]?.slug ?? "")

  if (games.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--ink-faint)" }}>
        <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}>
          AÚN NO HAY JUEGOS REGISTRADOS
        </div>
      </div>
    )
  }

  const scores = scoresBySlug[activeTab] ?? []

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {games.map((g) => (
          <button
            key={g.slug}
            onClick={() => setActiveTab(g.slug)}
            className={"btn" + (activeTab === g.slug ? " active" : "")}
            style={{
              opacity: activeTab === g.slug ? 1 : 0.5,
              borderBottom: activeTab === g.slug ? "2px solid var(--cyan)" : "2px solid transparent",
            }}
          >
            {g.name.toUpperCase()}
          </button>
        ))}
      </div>

      {scores.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-faint)" }}>
          <div className="pixel" style={{ fontSize: 12, color: "var(--magenta)", marginBottom: 12 }}>
            AÚN NO HAY PARTIDAS REGISTRADAS
          </div>
        </div>
      ) : (
        <div className="hall-table">
          <div className="th">
            <div>POSICIÓN</div>
            <div>JUGADOR</div>
            <div>PUNTUACIÓN</div>
            <div>FECHA</div>
          </div>
          {scores.map((r, i) => (
            <div
              key={r.player_name + i}
              className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
              <div className="pl">{r.player_name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{fmtDate(r.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
