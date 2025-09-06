-- Create a function for API routes to consume credits
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION api_consume_credits TO authenticated;
GRANT EXECUTE ON FUNCTION api_consume_credits TO service_role;
