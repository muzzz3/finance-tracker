-- Drop Plaid tables if they exist
DROP TABLE IF EXISTS plaid_accounts;
DROP TABLE IF EXISTS plaid_items;

-- Manual accounts for net worth tracking
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  institution TEXT,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'brokerage', 'retirement', 'credit', 'loan', 'other')),
  asset_class TEXT NOT NULL CHECK (asset_class IN ('cash', 'stocks', 'crypto', 'retirement', 'bonds', 'real_estate', 'other', 'liability')),
  balance DECIMAL(12,2) DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);
