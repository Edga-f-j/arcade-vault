ALTER TABLE scores
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
