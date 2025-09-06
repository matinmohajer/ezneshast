-- Enhanced Database Schema for Ezneshast
-- Remove the problematic JWT secret line
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create enhanced credits table with better constraints
CREATE TABLE IF NOT EXISTS credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create enhanced credit_ledger table with better tracking
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Can be positive (credit) or negative (debit)
  reason TEXT NOT NULL,
  reference TEXT, -- Optional reference for the transaction
  admin_user_id UUID REFERENCES auth.users(id), -- Track which admin made the change
  metadata JSONB DEFAULT '{}', -- Additional metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enhanced jobs table with better status tracking
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('transcription', 'summarization', 'meeting_minutes')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  cost INTEGER NOT NULL DEFAULT 0,
  reference TEXT, -- Optional reference for the job
  input_metadata JSONB DEFAULT '{}', -- Store input file info, duration, etc.
  output_metadata JSONB DEFAULT '{}', -- Store output info, word count, etc.
  error_message TEXT, -- Store error details if failed
  processing_time_ms INTEGER, -- Track processing time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table for better file management
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in storage
  storage_provider TEXT DEFAULT 'local', -- local, s3, etc.
  checksum TEXT, -- File integrity check
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table for extended user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  company TEXT,
  role TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create system_settings table for configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_log table for admin actions
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON credit_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_job_id ON files(job_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_user_id ON audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Enable RLS on all tables
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Enhanced RLS Policies for credits table
CREATE POLICY "Users can view their own credits" ON credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" ON credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Enhanced RLS Policies for credit_ledger table
CREATE POLICY "Users can view their own credit ledger" ON credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit ledger entries" ON credit_ledger
  FOR INSERT WITH CHECK (true); -- This will be called by service role

-- Enhanced RLS Policies for jobs table
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for files table
CREATE POLICY "Users can view their own files" ON files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON files
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_profiles table
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for system_settings (admin only)
CREATE POLICY "Admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
    )
  );

-- RLS Policies for audit_log (admin only)
CREATE POLICY "Admins can view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
    )
  );

-- Function to automatically create credits record for new users
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credits (user_id, balance)
  VALUES (NEW.id, 0);
  
  INSERT INTO user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create credits and profile when user signs up
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

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enhanced RPC function to consume credits atomically with idempotency
CREATE OR REPLACE FUNCTION consume_credits(
  p_cost INTEGER,
  p_key TEXT,
  p_reason TEXT,
  p_ref TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
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
  
  -- Insert ledger entry with metadata
  INSERT INTO credit_ledger (user_id, amount, reason, reference, metadata)
  VALUES (v_user_id, -p_cost, p_reason, p_key, p_metadata)
  RETURNING id INTO v_ledger_id;
  
  -- Create job record
  INSERT INTO jobs (user_id, type, status, cost, reference, input_metadata)
  VALUES (v_user_id, 'transcription', 'pending', p_cost, p_key, p_metadata)
  RETURNING id INTO v_job_id;
  
  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'job_id', v_job_id,
    'message', 'Credits consumed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_log (admin_user_id, action, target_user_id, details)
  VALUES (auth.uid(), p_action, p_target_user_id, p_details)
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON credits TO authenticated;
GRANT ALL ON credit_ledger TO authenticated;
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON files TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION consume_credits TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- Grant service role permissions
GRANT ALL ON credits TO service_role;
GRANT ALL ON credit_ledger TO service_role;
GRANT ALL ON jobs TO service_role;
GRANT ALL ON files TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON system_settings TO service_role;
GRANT ALL ON audit_log TO service_role;
GRANT EXECUTE ON FUNCTION consume_credits TO service_role;
GRANT EXECUTE ON FUNCTION log_admin_action TO service_role;

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('transcription_cost', '10', 'Cost in credits for transcription'),
('summarization_cost', '5', 'Cost in credits for summarization'),
('meeting_minutes_cost', '15', 'Cost in credits for meeting minutes'),
('max_file_size_mb', '100', 'Maximum file size in MB'),
('supported_formats', '["mp3", "wav", "m4a", "ogg", "webm"]', 'Supported audio formats'),
('default_language', 'fa', 'Default transcription language')
ON CONFLICT (key) DO NOTHING;
