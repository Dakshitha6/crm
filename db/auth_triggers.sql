-- FUNCTION TO HANDLE NEW USER SIGNUPS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (
    NEW.id,
    NEW.email
  );
  
  -- Check if there are any pending invitations for this user
  DECLARE
    invitation_record RECORD;
  BEGIN
    FOR invitation_record IN 
      SELECT * FROM public.invitations 
      WHERE email = NEW.email 
      AND status = 'pending' 
      AND expires_at > NOW()
    LOOP
      -- Add the user to the organization
      INSERT INTO public.user_organizations (
        user_id, 
        organization_id, 
        role
      ) VALUES (
        NEW.id, 
        invitation_record.organization_id, 
        invitation_record.role
      );
      
      -- Update invitation status
      UPDATE public.invitations
      SET status = 'accepted'
      WHERE id = invitation_record.id;
    END LOOP;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR NEW USER SIGNUPS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FUNCTION TO HANDLE USER DELETIONS
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- No need to delete from public.users as we have CASCADE DELETE
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR USER DELETIONS
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- FUNCTION TO UPDATE USER LOGIN TIMESTAMP
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR USER LOGINS
DROP TRIGGER IF EXISTS on_auth_user_signed_in ON auth.users;
CREATE TRIGGER on_auth_user_signed_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- FUNCTION TO SYNC USER EMAIL VERIFICATION STATUS
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- We don't need to store email_confirmed_at in our users table
  -- We can rely on auth.users for that information
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR EMAIL CONFIRMATION
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.handle_email_confirmation(); 