import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default async function SalonPage() {
  const supabase = createServerClient()
  const { data: rows } = await supabase
    .from("scores")
    .select("player_name, score, game_slug, created_at")
    .order("score", { ascending: false })
    .limit(10)

  const scores = rows ?? []

  function slot(i: number) {
    return scores[i] ?? null
  }

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      {scores.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--ink-faint)" }}>
          <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}>
            AÚN NO HAY PUNTUACIONES
          </div>
          <div>Juega una partida para aparecer aquí.</div>
        </div>
      ) : (
        <>
          <div className="podium">
            {[1, 0, 2].map((idx, pos) => {
              const cls = ["silver", "gold", "bronze"][pos]
              const s = slot(idx)
              return (
                <div key={idx} className={`podium-slot ${cls}`}>
                  {idx === 0 && (
                    <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>CAMPEÓN</div>
                  )}
                  <div className="rank-num" style={idx === 0 ? { fontSize: 36, marginTop: 4 } : undefined}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="name">{s?.player_name ?? "—"}</div>
                  <div className="score" style={idx === 0 ? { fontSize: 20 } : undefined}>
                    {s ? s.score.toLocaleString("es-ES") : "—"}
                  </div>
                  <div className="date">{s ? fmtDate(s.created_at) : ""}</div>
                </div>
              )
            })}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
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
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  )
}
