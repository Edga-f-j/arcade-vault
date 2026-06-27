DROP POLICY IF EXISTS "public insert scores" ON public.scores;

CREATE POLICY "authenticated insert own scores"
  ON public.scores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
