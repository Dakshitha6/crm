-- This is a template for creating organization-specific schemas
-- This will be used by the Edge Function to dynamically create schemas for each organization
-- Replace {org_id} with the actual organization UUID in the Edge Function

-- Template for creating a new organization schema
-- CREATE SCHEMA org_{org_id};

-- Leads Table Template
/*
CREATE TABLE org_{org_id}.leads (
    lead_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone_number VARCHAR(20),
    company_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE org_{org_id}.leads ENABLE ROW LEVEL SECURITY;

-- Lead Read Policy (All organization members can read)
CREATE POLICY lead_read_policy ON org_{org_id}.leads 
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}'
        )
    );

-- Lead Write Policy (Admin and Manager roles only)
CREATE POLICY lead_write_policy ON org_{org_id}.leads 
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}'
        )
    );

-- Lead Update Policy (Admin and Manager roles only)
CREATE POLICY lead_update_policy ON org_{org_id}.leads 
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );

-- Lead Delete Policy (Admin and Manager roles only)
CREATE POLICY lead_delete_policy ON org_{org_id}.leads 
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );
*/

-- Projects Table Template
/*
CREATE TABLE org_{org_id}.projects (
    project_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    company_id UUID,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES public.users(id),
    assigned_to UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE org_{org_id}.projects ENABLE ROW LEVEL SECURITY;

-- Project Read Policy (All organization members can read)
CREATE POLICY project_read_policy ON org_{org_id}.projects 
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}'
        )
    );

-- Project Write Policy (Admin and Manager roles only)
CREATE POLICY project_write_policy ON org_{org_id}.projects 
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );

-- Project Update Policy (Admin and Manager roles only)
CREATE POLICY project_update_policy ON org_{org_id}.projects 
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );

-- Project Delete Policy (Admin role only)
CREATE POLICY project_delete_policy ON org_{org_id}.projects 
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role = 'admin'
        )
    );
*/

-- Companies Table Template
/*
CREATE TABLE org_{org_id}.companies (
    company_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    website VARCHAR(255),
    industry VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE org_{org_id}.companies ENABLE ROW LEVEL SECURITY;

-- Company Read Policy (All organization members can read)
CREATE POLICY company_read_policy ON org_{org_id}.companies 
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}'
        )
    );

-- Company Write Policy (Admin and Manager roles only)
CREATE POLICY company_write_policy ON org_{org_id}.companies 
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );

-- Company Update Policy (Admin and Manager roles only)
CREATE POLICY company_update_policy ON org_{org_id}.companies 
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );

-- Company Delete Policy (Admin role only)
CREATE POLICY company_delete_policy ON org_{org_id}.companies 
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role = 'admin'
        )
    );
*/

-- Contacts Table Template
/*
CREATE TABLE org_{org_id}.contacts (
    contact_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone_number VARCHAR(20),
    job_title VARCHAR(100),
    company_id UUID,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100),
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE org_{org_id}.contacts ENABLE ROW LEVEL SECURITY;

-- Contact Read Policy (All organization members can read)
CREATE POLICY contact_read_policy ON org_{org_id}.contacts 
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}'
        )
    );

-- Contact Write Policy (Admin and Manager roles only)
CREATE POLICY contact_write_policy ON org_{org_id}.contacts 
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );

-- Contact Update Policy (Admin and Manager roles only)
CREATE POLICY contact_update_policy ON org_{org_id}.contacts 
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );

-- Contact Delete Policy (Admin role only)
CREATE POLICY contact_delete_policy ON org_{org_id}.contacts 
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role = 'admin'
        )
    );
*/

-- Contact-Projects Relationship Table Template
/*
CREATE TABLE org_{org_id}.contact_projects (
    contact_id UUID REFERENCES org_{org_id}.contacts(contact_id) ON DELETE CASCADE,
    project_id UUID REFERENCES org_{org_id}.projects(project_id) ON DELETE CASCADE,
    role VARCHAR(100),
    PRIMARY KEY (contact_id, project_id)
);
ALTER TABLE org_{org_id}.contact_projects ENABLE ROW LEVEL SECURITY;

-- Contact_Projects Read Policy (All organization members can read)
CREATE POLICY contact_project_read_policy ON org_{org_id}.contact_projects 
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}'
        )
    );

-- Contact_Projects Write Policy (Admin and Manager roles only)
CREATE POLICY contact_project_write_policy ON org_{org_id}.contact_projects 
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );

-- Contact_Projects Delete Policy (Admin and Manager roles only)
CREATE POLICY contact_project_delete_policy ON org_{org_id}.contact_projects 
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_organizations 
            WHERE organization_id = '{org_id}' AND role IN ('admin', 'manager')
        )
    );
*/ 