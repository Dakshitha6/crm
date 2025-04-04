-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    job_title VARCHAR(100),
    timezone VARCHAR(50),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_access ON public.users FOR ALL USING (auth.uid() = id);

-- Trigger to sync email_verified from auth.users
CREATE OR REPLACE FUNCTION sync_email_verified()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET email_verified = NEW.email_confirmed_at IS NOT NULL
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION sync_email_verified();

-- Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    org_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    logo_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_access ON public.organizations FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.user_organizations WHERE organization_id = org_id)
);

-- User_Organizations Table
CREATE TABLE IF NOT EXISTS public.user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(org_id),
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'employee')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, organization_id)
);
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_org_access ON public.user_organizations FOR ALL USING (auth.uid() = user_id);

-- Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(org_id),
    invited_by UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'employee')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY invite_access ON public.invitations FOR ALL USING (
    auth.uid() IN (SELECT created_by FROM organizations WHERE org_id = organization_id)
    OR auth.uid() IN (SELECT invited_by FROM invitations WHERE id = id)
);

-- Helper function to get user organizations
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP,
    user_role VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.org_id,
        o.name,
        o.description,
        o.logo_url,
        o.created_at,
        uo.role AS user_role
    FROM 
        organizations o
    JOIN 
        user_organizations uo ON o.org_id = uo.organization_id
    WHERE 
        uo.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 