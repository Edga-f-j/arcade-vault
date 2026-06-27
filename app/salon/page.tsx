import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import SalonTabs from "./SalonTabs"

// Los scores cambian con cada partida: renderizar siempre fresco, sin cachear.
export const dynamic = "force-dynamic"

export interface ScoreRow {
  player_name: string
  score: number
  created_at: string
}

export default async function SalonPage() {
  const supabase = createServerClient()

  const { data: gamesData } = await supabase
    .from("games")
    .select("slug, name")
    .order("name")

  const games = gamesData ?? []

  const entries = await Promise.all(
    games.map(async (g) => {
      const { data } = await supabase
        .from("scores")
        .select("player_name, score, created_at")
        .eq("game_slug", g.slug)
        .order("score", { ascending: false })
        .limit(10)
      return [g.slug, data ?? []] as [string, ScoreRow[]]
    })
  )

  const scoresBySlug: Record<string, ScoreRow[]> = Object.fromEntries(entries)

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <SalonTabs games={games} scoresBySlug={scoresBySlug} />

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  )
}
