import { createServerClient } from "@/lib/supabase/server"
import HomeClient from "./HomeClient"

export default async function Home() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from("scores")
    .select("player_name, score, game_slug, created_at")
    .order("score", { ascending: false })
    .limit(10)

  return <HomeClient topScores={data ?? []} />
}
