-- Trigger function to sync email_verified from auth.users
CREATE OR REPLACE FUNCTION sync_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new user or if email_verified status changed
    IF (TG_OP = 'INSERT') THEN
        -- Insert a new user into the public.users table
        INSERT INTO public.users (id, email, email_verified, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            NEW.email_confirmed_at IS NOT NULL,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If user already exists, update email_verified status
        UPDATE public.users
        SET 
            email = NEW.email,
            email_verified = NEW.email_confirmed_at IS NOT NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_changes ON auth.users;
CREATE TRIGGER on_auth_user_changes
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION sync_user_data(); 