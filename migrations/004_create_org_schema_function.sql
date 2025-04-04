-- This file defines the stored procedure that will be used by the Supabase Edge Function
-- to dynamically create organization schemas and their tables

CREATE OR REPLACE FUNCTION create_organization_schema(org_id UUID)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT := 'org_' || org_id::text;
BEGIN
    -- Create a new schema for the organization
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Create Leads table
    EXECUTE format('
        CREATE TABLE %I.leads (
            lead_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100),
            email VARCHAR(255),
            phone_number VARCHAR(20),
            company_name VARCHAR(100),
            status VARCHAR(50) DEFAULT ''new'',
            source VARCHAR(100),
            address VARCHAR(255),
            city VARCHAR(100),
            state VARCHAR(100),
            zip VARCHAR(20),
            country VARCHAR(100),
            created_by UUID REFERENCES public.users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', schema_name);
    
    -- Enable RLS on Leads table
    EXECUTE format('ALTER TABLE %I.leads ENABLE ROW LEVEL SECURITY', schema_name);
    
    -- Create Lead policies
    EXECUTE format('
        CREATE POLICY lead_read_policy ON %I.leads 
        FOR SELECT USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY lead_write_policy ON %I.leads 
        FOR INSERT WITH CHECK (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY lead_update_policy ON %I.leads 
        FOR UPDATE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY lead_delete_policy ON %I.leads 
        FOR DELETE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
    
    -- Create Projects table
    EXECUTE format('
        CREATE TABLE %I.projects (
            project_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            company_id UUID,
            status VARCHAR(50) DEFAULT ''active'',
            start_date DATE,
            end_date DATE,
            created_by UUID REFERENCES public.users(id),
            assigned_to UUID REFERENCES public.users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )', schema_name);
        
    -- Enable RLS on Projects table
    EXECUTE format('ALTER TABLE %I.projects ENABLE ROW LEVEL SECURITY', schema_name);
    
    -- Create Project policies
    EXECUTE format('
        CREATE POLICY project_read_policy ON %I.projects 
        FOR SELECT USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY project_write_policy ON %I.projects 
        FOR INSERT WITH CHECK (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY project_update_policy ON %I.projects 
        FOR UPDATE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY project_delete_policy ON %I.projects 
        FOR DELETE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role = ''admin''
            )
        )', schema_name, org_id);
    
    -- Create Companies table
    EXECUTE format('
        CREATE TABLE %I.companies (
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
        )', schema_name);
        
    -- Enable RLS on Companies table
    EXECUTE format('ALTER TABLE %I.companies ENABLE ROW LEVEL SECURITY', schema_name);
    
    -- Create Company policies
    EXECUTE format('
        CREATE POLICY company_read_policy ON %I.companies 
        FOR SELECT USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY company_write_policy ON %I.companies 
        FOR INSERT WITH CHECK (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY company_update_policy ON %I.companies 
        FOR UPDATE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY company_delete_policy ON %I.companies 
        FOR DELETE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role = ''admin''
            )
        )', schema_name, org_id);
    
    -- Create Contacts table
    EXECUTE format('
        CREATE TABLE %I.contacts (
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
        )', schema_name);
        
    -- Enable RLS on Contacts table
    EXECUTE format('ALTER TABLE %I.contacts ENABLE ROW LEVEL SECURITY', schema_name);
    
    -- Create Contact policies
    EXECUTE format('
        CREATE POLICY contact_read_policy ON %I.contacts 
        FOR SELECT USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY contact_write_policy ON %I.contacts 
        FOR INSERT WITH CHECK (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY contact_update_policy ON %I.contacts 
        FOR UPDATE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY contact_delete_policy ON %I.contacts 
        FOR DELETE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role = ''admin''
            )
        )', schema_name, org_id);
    
    -- Create Contact_Projects table (junction table)
    EXECUTE format('
        CREATE TABLE %I.contact_projects (
            contact_id UUID,
            project_id UUID,
            role VARCHAR(100),
            PRIMARY KEY (contact_id, project_id)
        )', schema_name);
        
    -- Enable RLS on Contact_Projects table
    EXECUTE format('ALTER TABLE %I.contact_projects ENABLE ROW LEVEL SECURITY', schema_name);
    
    -- Create Contact_Projects policies
    EXECUTE format('
        CREATE POLICY contact_project_read_policy ON %I.contact_projects 
        FOR SELECT USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY contact_project_write_policy ON %I.contact_projects 
        FOR INSERT WITH CHECK (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    EXECUTE format('
        CREATE POLICY contact_project_delete_policy ON %I.contact_projects 
        FOR DELETE USING (
            auth.uid() IN (
                SELECT user_id FROM public.user_organizations 
                WHERE organization_id = %L AND role IN (''admin'', ''manager'')
            )
        )', schema_name, org_id);
        
    -- Add foreign key constraints after all tables are created
    EXECUTE format('
        ALTER TABLE %I.contact_projects 
        ADD CONSTRAINT fk_contact_id 
        FOREIGN KEY (contact_id) REFERENCES %I.contacts(contact_id) ON DELETE CASCADE', 
        schema_name, schema_name);
        
    EXECUTE format('
        ALTER TABLE %I.contact_projects 
        ADD CONSTRAINT fk_project_id 
        FOREIGN KEY (project_id) REFERENCES %I.projects(project_id) ON DELETE CASCADE', 
        schema_name, schema_name);
    
    -- Add company_id foreign key constraints to contacts and projects
    EXECUTE format('
        ALTER TABLE %I.contacts 
        ADD CONSTRAINT fk_company_id 
        FOREIGN KEY (company_id) REFERENCES %I.companies(company_id) ON DELETE SET NULL', 
        schema_name, schema_name);
        
    EXECUTE format('
        ALTER TABLE %I.projects 
        ADD CONSTRAINT fk_company_id 
        FOREIGN KEY (company_id) REFERENCES %I.companies(company_id) ON DELETE SET NULL', 
        schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Example of how to invoke the function:
-- SELECT create_organization_schema('11111111-1111-1111-1111-111111111111'); 