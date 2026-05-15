CREATE TABLE wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,2),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'purchased')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_wishlist" ON wishlist_items FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_wishlist_user ON wishlist_items(user_id);
