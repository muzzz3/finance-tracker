CREATE TABLE monthly_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  earnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  k401 DECIMAL(10,2) NOT NULL DEFAULT 0,
  roth DECIMAL(10,2) NOT NULL DEFAULT 0,
  stocks DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

ALTER TABLE monthly_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_monthly_income" ON monthly_income FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_monthly_income_user_month ON monthly_income(user_id, month);
