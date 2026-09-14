-- Monthly net worth snapshots — one row per user per month, auto-captured
-- from the current account balances (see app/(app)/net-worth/page.tsx).
-- Same shape/pattern as monthly_income.sql.
CREATE TABLE net_worth_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  total_assets DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_liabilities DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_worth DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_net_worth_snapshots" ON net_worth_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_net_worth_snapshots_user_month ON net_worth_snapshots(user_id, month);
