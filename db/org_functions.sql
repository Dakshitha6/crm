-- SQL Functions for Organization Management

-- Function to create a new schema for an organization
CREATE OR REPLACE FUNCTION public.create_org_schema(org_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'org_' || org_id::text;
BEGIN
  -- Create schema if it doesn't exist
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Set permissions for the schema
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', schema_name);
  EXECUTE format('GRANT ALL ON SCHEMA %I TO service_role', schema_name);
  
  -- Set default privileges for future tables in the schema
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated', schema_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO service_role', schema_name);
  
  -- Create RLS policies for the schema (to be applied to all tables)
  -- These will be added when creating tables
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create base tables for an organization
CREATE OR REPLACE FUNCTION public.create_org_tables(org_id UUID)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'org_' || org_id::text;
BEGIN
  -- Create Leads table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      status TEXT NOT NULL DEFAULT ''new'',
      source TEXT,
      notes TEXT,
      assignee_id UUID REFERENCES public.users(id),
      created_by UUID NOT NULL REFERENCES public.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  ', schema_name);
  
  -- Create Projects table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT ''planning'',
      budget DECIMAL(12,2),
      start_date DATE,
      end_date DATE,
      client_id UUID,
      manager_id UUID REFERENCES public.users(id),
      created_by UUID NOT NULL REFERENCES public.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  ', schema_name);
  
  -- Create Companies table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      industry TEXT,
      website TEXT,
      phone_number TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      country TEXT,
      notes TEXT,
      created_by UUID NOT NULL REFERENCES public.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  ', schema_name);
  
  -- Create Contacts table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      job_title TEXT,
      company_id UUID,
      notes TEXT,
      created_by UUID NOT NULL REFERENCES public.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  ', schema_name);
  
  -- Apply RLS to tables
  -- Enable Row Level Security
  EXECUTE format('ALTER TABLE %I.leads ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.projects ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.companies ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.contacts ENABLE ROW LEVEL SECURITY', schema_name);
  
  -- Create policies for each table that only allow access to members of the organization
  -- Leads policies
  EXECUTE format('
    CREATE POLICY "Organization members can view leads" 
    ON %I.leads FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can insert leads" 
    ON %I.leads FOR INSERT 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can update leads" 
    ON %I.leads FOR UPDATE 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can delete leads" 
    ON %I.leads FOR DELETE 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  -- Projects policies
  EXECUTE format('
    CREATE POLICY "Organization members can view projects" 
    ON %I.projects FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can insert projects" 
    ON %I.projects FOR INSERT 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can update projects" 
    ON %I.projects FOR UPDATE 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can delete projects" 
    ON %I.projects FOR DELETE 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  -- Companies policies
  EXECUTE format('
    CREATE POLICY "Organization members can view companies" 
    ON %I.companies FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can insert companies" 
    ON %I.companies FOR INSERT 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can update companies" 
    ON %I.companies FOR UPDATE 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can delete companies" 
    ON %I.companies FOR DELETE 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  -- Contacts policies
  EXECUTE format('
    CREATE POLICY "Organization members can view contacts" 
    ON %I.contacts FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can insert contacts" 
    ON %I.contacts FOR INSERT 
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can update contacts" 
    ON %I.contacts FOR UPDATE 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id, org_id);
  
  EXECUTE format('
    CREATE POLICY "Organization members can delete contacts" 
    ON %I.contacts FOR DELETE 
    USING (EXISTS (
      SELECT 1 FROM public.user_organizations 
      WHERE organization_id = %L 
      AND user_id = auth.uid()
    ))
  ', schema_name, org_id);
  
  -- Create update triggers for timestamps
  FOR table_name IN 
    SELECT 'leads' UNION SELECT 'projects' UNION SELECT 'companies' UNION SELECT 'contacts'
  LOOP
    EXECUTE format('
      CREATE TRIGGER update_%s_timestamp
      BEFORE UPDATE ON %I.%s
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    ', table_name, schema_name, table_name);
  END LOOP;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 