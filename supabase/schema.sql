-- Categories (expenses and savings, with optional parent for sub-categories like Food)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'saving')),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Income configuration (recurring paycheck)
CREATE TABLE income_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pay_days INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (expenses and savings entries)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'saving')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plaid connected institutions
CREATE TABLE plaid_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL,
  item_id TEXT NOT NULL,
  institution_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plaid accounts (balances synced from Plaid)
CREATE TABLE plaid_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plaid_item_id UUID REFERENCES plaid_items(id) ON DELETE CASCADE NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  official_name TEXT,
  type TEXT NOT NULL,
  subtype TEXT,
  current_balance DECIMAL(12,2) DEFAULT 0,
  available_balance DECIMAL(12,2),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_income_config" ON income_config FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_plaid_items" ON plaid_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_plaid_accounts" ON plaid_accounts FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_plaid_accounts_user ON plaid_accounts(user_id);
CREATE INDEX idx_plaid_items_user ON plaid_items(user_id);
