-- Swift CRM Database Initialization

-- Create a users table to store user information
-- Note: This will be synced with Supabase Auth users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    job_title TEXT,
    timezone TEXT DEFAULT 'UTC',
    is_onboarded BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login TIMESTAMPTZ
);

-- Add row level security to the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users table - users can only see and edit their own profiles
CREATE POLICY "Users can view and edit their own profile" 
ON public.users 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    website TEXT,
    phone_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add row level security to organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, organization_id)
);

-- Add row level security to user_organizations table
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- Policy to allow organization members to view their organizations
CREATE POLICY "Members can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE organization_id = org_id 
    AND user_id = auth.uid()
));

-- Policy to allow organization owners/admins to edit their organizations
CREATE POLICY "Owners and admins can update organizations" 
ON public.organizations 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE organization_id = org_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
));

-- Policy to allow users to view their memberships
CREATE POLICY "Users can view their memberships" 
ON public.user_organizations 
FOR SELECT 
USING (user_id = auth.uid());

-- Policy to allow users to manage their own memberships
CREATE POLICY "Users can manage their own memberships" 
ON public.user_organizations 
FOR ALL 
USING (user_id = auth.uid());

-- Create invitations table for inviting users to organizations
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES public.users(id),
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')) DEFAULT 'pending',
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
    UNIQUE (email, organization_id) WHERE status = 'pending'
);

-- Add row level security to invitations table
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policy for invitees to see their invitations
CREATE POLICY "Invitees can see their invitations" 
ON public.invitations 
FOR SELECT 
USING (email = auth.jwt()->>'email');

-- Policy for organization admins to manage invitations
CREATE POLICY "Admins can manage invitations" 
ON public.invitations 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.user_organizations 
    WHERE organization_id = invitations.organization_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
));

-- Create triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_organizations_timestamp
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_organizations_timestamp
BEFORE UPDATE ON public.user_organizations
FOR EACH ROW EXECUTE FUNCTION update_timestamp(); 