import { createServerClient } from "@/lib/supabase/server"
import BibliotecaCatalog from "./BibliotecaCatalog"

export default async function BibliotecaPage() {
  const supabase = createServerClient()
  const { data } = await supabase.from("games").select("*")

  return <BibliotecaCatalog games={data ?? []} />
}
