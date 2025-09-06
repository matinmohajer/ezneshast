-- Add a function to look up users by email
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_email TO service_role;
