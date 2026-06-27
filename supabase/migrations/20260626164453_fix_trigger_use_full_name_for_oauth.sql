CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  derived_username text;
BEGIN
  derived_username := COALESCE(
    -- 1. username explícito (registro email/password)
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    -- 2. primer nombre del full_name de OAuth (Google / GitHub)
    NULLIF(trim(split_part(COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ), ' ', 1)), ''),
    -- 3. fallback: prefijo del email
    left(split_part(NEW.email, '@', 1), 10)
  );

  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    left(regexp_replace(upper(derived_username), '[^A-Z0-9_]', '', 'g'), 10)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
