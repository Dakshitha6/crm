-- Function to create organization schema
CREATE OR REPLACE FUNCTION create_org_schema(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name TEXT;
BEGIN
  -- Generate schema name
  schema_name := 'org_' || org_id::text;
  
  -- Create schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Grant usage to authenticated users
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  
  -- Grant usage to service_role (for admin functions)
  EXECUTE format('GRANT ALL ON SCHEMA %I TO service_role', schema_name);
END;
$$;

-- Function to create all tables for an organization
CREATE OR REPLACE FUNCTION create_org_tables(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_name TEXT;
BEGIN
  -- Generate schema name
  schema_name := 'org_' || org_id::text;
  
  -- Create leads table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.leads (
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
  
  -- Create companies table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.companies (
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
  
  -- Create projects table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.projects (
        project_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        company_id UUID REFERENCES %I.companies(company_id),
        status VARCHAR(50) DEFAULT ''active'',
        start_date DATE,
        end_date DATE,
        created_by UUID REFERENCES public.users(id),
        assigned_to UUID REFERENCES public.users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);
  
  -- Create contacts table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.contacts (
        contact_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone_number VARCHAR(20),
        job_title VARCHAR(100),
        company_id UUID REFERENCES %I.companies(company_id),
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        zip VARCHAR(20),
        country VARCHAR(100),
        created_by UUID REFERENCES public.users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )', schema_name, schema_name);
  
  -- Create contact_projects junction table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.contact_projects (
        contact_id UUID REFERENCES %I.contacts(contact_id),
        project_id UUID REFERENCES %I.projects(project_id),
        role VARCHAR(100),
        PRIMARY KEY (contact_id, project_id)
    )', schema_name, schema_name, schema_name);
  
  -- Enable Row Level Security on all tables
  EXECUTE format('ALTER TABLE %I.leads ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.companies ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.projects ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.contacts ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.contact_projects ENABLE ROW LEVEL SECURITY', schema_name);
  
  -- Create RLS policies for leads
  EXECUTE format('
    CREATE POLICY "Organization members can access leads" ON %I.leads
    FOR ALL USING (
      auth.uid() IN (
        SELECT user_id FROM public.user_organizations 
        WHERE organization_id = %L
      )
    )
  ', schema_name, org_id);
  
  -- Create RLS policies for companies
  EXECUTE format('
    CREATE POLICY "Organization members can access companies" ON %I.companies
    FOR ALL USING (
      auth.uid() IN (
        SELECT user_id FROM public.user_organizations 
        WHERE organization_id = %L
      )
    )
  ', schema_name, org_id);
  
  -- Create RLS policies for projects
  EXECUTE format('
    CREATE POLICY "Organization members can access projects" ON %I.projects
    FOR ALL USING (
      auth.uid() IN (
        SELECT user_id FROM public.user_organizations 
        WHERE organization_id = %L
      )
    )
  ', schema_name, org_id);
  
  -- Create RLS policies for contacts
  EXECUTE format('
    CREATE POLICY "Organization members can access contacts" ON %I.contacts
    FOR ALL USING (
      auth.uid() IN (
        SELECT user_id FROM public.user_organizations 
        WHERE organization_id = %L
      )
    )
  ', schema_name, org_id);
  
  -- Create RLS policies for contact_projects
  EXECUTE format('
    CREATE POLICY "Organization members can access contact projects" ON %I.contact_projects
    FOR ALL USING (
      auth.uid() IN (
        SELECT user_id FROM public.user_organizations 
        WHERE organization_id = %L
      )
    )
  ', schema_name, org_id);
  
  -- Create updated_at triggers for all tables
  EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  ', schema_name);
  
  EXECUTE format('
    CREATE TRIGGER set_timestamp_leads
    BEFORE UPDATE ON %I.leads
    FOR EACH ROW
    EXECUTE FUNCTION %I.update_timestamp()
  ', schema_name, schema_name);
  
  EXECUTE format('
    CREATE TRIGGER set_timestamp_companies
    BEFORE UPDATE ON %I.companies
    FOR EACH ROW
    EXECUTE FUNCTION %I.update_timestamp()
  ', schema_name, schema_name);
  
  EXECUTE format('
    CREATE TRIGGER set_timestamp_projects
    BEFORE UPDATE ON %I.projects
    FOR EACH ROW
    EXECUTE FUNCTION %I.update_timestamp()
  ', schema_name, schema_name);
  
  EXECUTE format('
    CREATE TRIGGER set_timestamp_contacts
    BEFORE UPDATE ON %I.contacts
    FOR EACH ROW
    EXECUTE FUNCTION %I.update_timestamp()
  ', schema_name, schema_name);
END;
$$; 