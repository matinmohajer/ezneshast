-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create credit_ledger table (append-only)
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Can be positive (credit) or negative (debit)
  reason TEXT NOT NULL,
  reference TEXT, -- Optional reference for the transaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g., 'transcription', 'summarization'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  cost INTEGER NOT NULL DEFAULT 0,
  reference TEXT, -- Optional reference for the job
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credits table
CREATE POLICY "Users can view their own credits" ON credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON credits
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for credit_ledger table
CREATE POLICY "Users can view their own credit ledger" ON credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit ledger entries" ON credit_ledger
  FOR INSERT WITH CHECK (true); -- This will be called by service role

-- RLS Policies for jobs table
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically create credits record for new users
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credits (user_id, balance)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create credits when user signs up
CREATE TRIGGER create_user_credits_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_credits();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RPC function to consume credits atomically with idempotency
CREATE OR REPLACE FUNCTION consume_credits(
  p_cost INTEGER,
  p_key TEXT,
  p_reason TEXT,
  p_ref TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_ledger_id UUID;
  v_job_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'new_balance', 0,
      'message', 'User not authenticated'
    );
  END IF;
  
  -- Check if this key has already been used (idempotency)
  SELECT id INTO v_ledger_id
  FROM credit_ledger
  WHERE reference = p_key AND user_id = v_user_id;
  
  IF v_ledger_id IS NOT NULL THEN
    -- Return current balance for idempotent call
    SELECT balance INTO v_current_balance
    FROM credits
    WHERE user_id = v_user_id;
    
    RETURN json_build_object(
      'success', true,
      'new_balance', v_current_balance,
      'message', 'Credits already consumed for this key'
    );
  END IF;
  
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM credits
  WHERE user_id = v_user_id;
  
  -- Check if user has sufficient balance
  IF v_current_balance < p_cost THEN
    RETURN json_build_object(
      'success', false,
      'new_balance', v_current_balance,
      'message', 'Insufficient credits'
    );
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance - p_cost;
  
  -- Update credits balance
  UPDATE credits
  SET balance = v_new_balance
  WHERE user_id = v_user_id;
  
  -- Insert ledger entry
  INSERT INTO credit_ledger (user_id, amount, reason, reference)
  VALUES (v_user_id, -p_cost, p_reason, p_key)
  RETURNING id INTO v_ledger_id;
  
  -- Create job record
  INSERT INTO jobs (user_id, type, status, cost, reference)
  VALUES (v_user_id, 'transcription', 'pending', p_cost, p_key)
  RETURNING id INTO v_job_id;
  
  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'message', 'Credits consumed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON credits TO authenticated;
GRANT ALL ON credit_ledger TO authenticated;
GRANT ALL ON jobs TO authenticated;
GRANT EXECUTE ON FUNCTION consume_credits TO authenticated;

-- Grant service role permissions
GRANT ALL ON credits TO service_role;
GRANT ALL ON credit_ledger TO service_role;
GRANT ALL ON jobs TO service_role;
GRANT EXECUTE ON FUNCTION consume_credits TO service_role;

