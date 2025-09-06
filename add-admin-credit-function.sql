-- Create a function for admin to update credits by email
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION admin_update_credits TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_credits TO service_role;
