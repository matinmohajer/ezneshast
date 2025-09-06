-- Complete Database Setup for EzneShast
-- Run this in your Supabase SQL editor

-- 1. Create function to look up users by email
CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.email = user_email;
END;
$$;

-- 2. Create function for admin to update credits by email
CREATE OR REPLACE FUNCTION admin_update_credits(
  p_email TEXT,
  p_amount INTEGER,
  p_reason TEXT,
  p_admin_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_target_user_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_ledger_id UUID;
  v_job_id UUID;
  v_idempotency_key TEXT;
BEGIN
  -- Find user by email
  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_target_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found with email: ' || p_email
    );
  END IF;
  
  -- Get or create credits record for the user
  INSERT INTO credits (user_id, balance)
  VALUES (v_target_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM credits
  WHERE user_id = v_target_user_id;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;
  
  -- Ensure balance doesn't go negative
  IF v_new_balance < 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient credits. Current balance: ' || v_current_balance || ', Requested: ' || p_amount
    );
  END IF;
  
  -- Update credits balance
  UPDATE credits
  SET balance = v_new_balance
  WHERE user_id = v_target_user_id;
  
  -- Create idempotency key
  v_idempotency_key := 'admin_' || p_admin_user_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || random()::TEXT;
  
  -- Insert ledger entry
  INSERT INTO credit_ledger (user_id, amount, reason, reference)
  VALUES (v_target_user_id, p_amount, p_reason, v_idempotency_key)
  RETURNING id INTO v_ledger_id;
  
  -- Create job record
  INSERT INTO jobs (user_id, type, status, cost, reference)
  VALUES (v_target_user_id, 'admin_credit_update', 'completed', ABS(p_amount), v_idempotency_key)
  RETURNING id INTO v_job_id;
  
  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'job_id', v_job_id,
    'message', 'Credits updated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function for API routes to consume credits
CREATE OR REPLACE FUNCTION api_consume_credits(
  p_user_id UUID,
  p_cost INTEGER,
  p_key TEXT,
  p_reason TEXT,
  p_ref TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_ledger_id UUID;
  v_job_id UUID;
BEGIN
  -- Check if this key has already been used (idempotency)
  SELECT id INTO v_ledger_id
  FROM credit_ledger
  WHERE reference = p_key AND user_id = p_user_id;
  
  IF v_ledger_id IS NOT NULL THEN
    -- Return current balance for idempotent call
    SELECT balance INTO v_current_balance
    FROM credits
    WHERE user_id = p_user_id;
    
    RETURN json_build_object(
      'success', true,
      'new_balance', v_current_balance,
      'message', 'Credits already consumed for this key'
    );
  END IF;
  
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM credits
  WHERE user_id = p_user_id;
  
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
  WHERE user_id = p_user_id;
  
  -- Insert ledger entry
  INSERT INTO credit_ledger (user_id, amount, reason, reference)
  VALUES (p_user_id, -p_cost, p_reason, p_key)
  RETURNING id INTO v_ledger_id;
  
  -- Create job record
  INSERT INTO jobs (user_id, type, status, cost, reference)
  VALUES (p_user_id, 'transcription', 'pending', p_cost, p_key)
  RETURNING id INTO v_job_id;
  
  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'job_id', v_job_id,
    'message', 'Credits consumed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_email TO service_role;
GRANT EXECUTE ON FUNCTION admin_update_credits TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_credits TO service_role;
GRANT EXECUTE ON FUNCTION api_consume_credits TO authenticated;
GRANT EXECUTE ON FUNCTION api_consume_credits TO service_role;

-- 5. Test the functions (optional - remove these lines after testing)
-- Test admin function
-- SELECT admin_update_credits('mohamatin@gmail.com', 100, 'Test credit', '00000000-0000-0000-0000-000000000000');

-- Test API function (replace with actual user ID)
-- SELECT api_consume_credits('your-user-id-here', 10, 'test_key', 'Test transcription');
