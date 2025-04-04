-- Create Users Table
CREATE TABLE users (
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
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_access ON users FOR ALL USING (auth.uid() = id);

-- Create Organizations Table
CREATE TABLE organizations (
    org_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    website VARCHAR(255),
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_access ON organizations FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM user_organizations WHERE organization_id = org_id)
);

-- Create User_Organizations Table
CREATE TABLE user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(org_id),
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'employee')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, organization_id)
);
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_org_access ON user_organizations FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
        SELECT user_id FROM user_organizations 
        WHERE organization_id = user_organizations.organization_id AND role = 'admin'
    )
);

-- Admins can insert new members
CREATE POLICY user_org_insert ON user_organizations FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM user_organizations 
        WHERE organization_id = user_organizations.organization_id AND role = 'admin'
    )
);

-- Users can delete their own memberships
CREATE POLICY user_org_delete ON user_organizations FOR DELETE USING (
    auth.uid() = user_id
);

-- Create Invitations Table
CREATE TABLE invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(org_id),
    invited_by UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'employee')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage invitations for their organization
CREATE POLICY invite_access ON invitations FOR ALL USING (
    auth.uid() IN (
        SELECT user_id FROM user_organizations 
        WHERE organization_id = invitations.organization_id AND role = 'admin'
    )
);

-- Users can see invitations sent to their email
CREATE POLICY invite_recipient_access ON invitations FOR SELECT USING (
    email = (SELECT email FROM users WHERE id = auth.uid())
); 