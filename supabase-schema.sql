-- ============================================================
-- LaLa Hub - Esquema de Supabase
-- Ejecutar esto en el SQL Editor de Supabase
-- ============================================================

-- 1. Tabla de perfiles (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabla de slots (juegos del usuario)
CREATE TABLE IF NOT EXISTS public.slots (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own slots" ON public.slots;
CREATE POLICY "Users can view own slots"
  ON public.slots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own slots" ON public.slots;
CREATE POLICY "Users can insert own slots"
  ON public.slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own slots" ON public.slots;
CREATE POLICY "Users can update own slots"
  ON public.slots FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own slots" ON public.slots;
CREATE POLICY "Users can delete own slots"
  ON public.slots FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Tabla de playtime
CREATE TABLE IF NOT EXISTS public.playtime (
  slot_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, slot_id)
);

ALTER TABLE public.playtime ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own playtime" ON public.playtime;
CREATE POLICY "Users can view own playtime"
  ON public.playtime FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own playtime" ON public.playtime;
CREATE POLICY "Users can upsert own playtime"
  ON public.playtime FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own playtime" ON public.playtime;
CREATE POLICY "Users can update own playtime"
  ON public.playtime FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Tabla de settings de interfaz
CREATE TABLE IF NOT EXISTS public.interface_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interface_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.interface_settings;
CREATE POLICY "Users can view own settings"
  ON public.interface_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own settings" ON public.interface_settings;
CREATE POLICY "Users can upsert own settings"
  ON public.interface_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.interface_settings;
CREATE POLICY "Users can update own settings"
  ON public.interface_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Tabla de juegos/consolas (compartida, reemplaza LaLa-API)
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
CREATE POLICY "Anyone can view games"
  ON public.games FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can insert games" ON public.games;
CREATE POLICY "Auth users can insert games"
  ON public.games FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can update games" ON public.games;
CREATE POLICY "Auth users can update games"
  ON public.games FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can delete games" ON public.games;
CREATE POLICY "Auth users can delete games"
  ON public.games FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.consoles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.consoles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view consoles" ON public.consoles;
CREATE POLICY "Anyone can view consoles"
  ON public.consoles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can insert consoles" ON public.consoles;
CREATE POLICY "Auth users can insert consoles"
  ON public.consoles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can update consoles" ON public.consoles;
CREATE POLICY "Auth users can update consoles"
  ON public.consoles FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can delete consoles" ON public.consoles;
CREATE POLICY "Auth users can delete consoles"
  ON public.consoles FOR DELETE
  USING (auth.role() = 'authenticated');

-- 6. Storage bucket para imágenes de juegos
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-images', 'game-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'game-images');

DROP POLICY IF EXISTS "Service role upload access" ON storage.objects;
CREATE POLICY "Service role upload access"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'game-images');

DROP POLICY IF EXISTS "Service role update access" ON storage.objects;
CREATE POLICY "Service role update access"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'game-images');

-- 7. Tabla de assets (imágenes/videos organizados por tipo)
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_url TEXT,
  igdb_image_id TEXT,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  sort_order INTEGER DEFAULT 0,
  label TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view assets" ON public.assets;
CREATE POLICY "Anyone can view assets"
  ON public.assets FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can insert assets" ON public.assets;
CREATE POLICY "Auth users can insert assets"
  ON public.assets FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can update assets" ON public.assets;
CREATE POLICY "Auth users can update assets"
  ON public.assets FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can delete assets" ON public.assets;
CREATE POLICY "Auth users can delete assets"
  ON public.assets FOR DELETE
  USING (auth.role() = 'authenticated');

-- 8. Índices
CREATE INDEX IF NOT EXISTS idx_slots_user_id ON public.slots(user_id);
CREATE INDEX IF NOT EXISTS idx_playtime_user_id ON public.playtime(user_id);
CREATE INDEX IF NOT EXISTS idx_games_name ON public.games(name);
CREATE INDEX IF NOT EXISTS idx_assets_game_id ON public.assets(game_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(type);
