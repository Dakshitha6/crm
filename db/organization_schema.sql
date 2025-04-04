-- organization_schema.sql
-- This file contains the SQL to create the schema for a new organization.
-- It will be run when a new organization is created with the org_id parameter replaced.

-- Create the leads table
CREATE TABLE IF NOT EXISTS "leads" (
  "lead_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "first_name" TEXT NOT NULL,
  "last_name" TEXT,
  "email" TEXT,
  "phone_number" TEXT,
  "company_id" UUID,
  "company_name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "notes" TEXT,
  "created_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "assigned_to" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the companies table
CREATE TABLE IF NOT EXISTS "companies" (
  "company_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "industry" TEXT,
  "website" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postal_code" TEXT,
  "country" TEXT,
  "phone_number" TEXT,
  "created_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the contacts table (related to companies)
CREATE TABLE IF NOT EXISTS "contacts" (
  "contact_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "first_name" TEXT NOT NULL,
  "last_name" TEXT,
  "email" TEXT,
  "phone_number" TEXT,
  "job_title" TEXT,
  "company_id" UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  "is_primary" BOOLEAN DEFAULT false,
  "notes" TEXT,
  "created_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the projects table
CREATE TABLE IF NOT EXISTS "projects" (
  "project_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "start_date" DATE,
  "end_date" DATE,
  "status" TEXT NOT NULL DEFAULT 'new',
  "budget" DECIMAL(12, 2),
  "company_id" UUID REFERENCES companies(company_id) ON DELETE SET NULL,
  "created_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the tasks table (related to projects)
CREATE TABLE IF NOT EXISTS "tasks" (
  "task_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "due_date" TIMESTAMPTZ,
  "project_id" UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  "assigned_to" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the notes table (for adding notes to any entity)
CREATE TABLE IF NOT EXISTS "notes" (
  "note_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "content" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL, -- 'lead', 'contact', 'company', 'project', etc.
  "entity_id" UUID NOT NULL,
  "created_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the activities table (for tracking actions on entities)
CREATE TABLE IF NOT EXISTS "activities" (
  "activity_id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "action" TEXT NOT NULL, -- 'created', 'updated', 'contacted', etc.
  "entity_type" TEXT NOT NULL, -- 'lead', 'contact', 'company', 'project', etc.
  "entity_id" UUID NOT NULL,
  "entity_name" TEXT NOT NULL, -- Denormalized for quick access
  "description" TEXT,
  "performed_by" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key constraint to leads table
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_fkey" 
  FOREIGN KEY ("company_id") REFERENCES companies(company_id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_leads_company_id" ON "leads" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_contacts_company_id" ON "contacts" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_projects_company_id" ON "projects" ("company_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_project_id" ON "tasks" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_activities_entity" ON "activities" ("entity_type", "entity_id");

-- Create triggers to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON "leads"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON "companies"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON "contacts"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON "projects"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON "tasks"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON "notes"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create a function to record activities when entities are created, updated, or deleted
CREATE OR REPLACE FUNCTION record_activity()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  entity_table TEXT;
  entity_id_value UUID;
  entity_name_value TEXT;
  description_value TEXT;
  user_id UUID;
BEGIN
  -- Set the action type based on the operation
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  -- Entity type is determined by the table name
  entity_table := TG_TABLE_NAME;
  
  -- Get authenticated user ID from session if available
  user_id := auth.uid();
  
  -- Handle different entity types
  IF entity_table = 'leads' THEN
    IF TG_OP = 'DELETE' THEN
      entity_id_value := OLD.lead_id;
      entity_name_value := CONCAT(OLD.first_name, ' ', COALESCE(OLD.last_name, ''));
    ELSE
      entity_id_value := NEW.lead_id;
      entity_name_value := CONCAT(NEW.first_name, ' ', COALESCE(NEW.last_name, ''));
    END IF;
    
    -- Create descriptive text for lead status changes
    IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
      description_value := CONCAT('Status changed from "', OLD.status, '" to "', NEW.status, '"');
    END IF;
    
  ELSIF entity_table = 'companies' THEN
    IF TG_OP = 'DELETE' THEN
      entity_id_value := OLD.company_id;
      entity_name_value := OLD.name;
    ELSE
      entity_id_value := NEW.company_id;
      entity_name_value := NEW.name;
    END IF;
    
  ELSIF entity_table = 'contacts' THEN
    IF TG_OP = 'DELETE' THEN
      entity_id_value := OLD.contact_id;
      entity_name_value := CONCAT(OLD.first_name, ' ', COALESCE(OLD.last_name, ''));
    ELSE
      entity_id_value := NEW.contact_id;
      entity_name_value := CONCAT(NEW.first_name, ' ', COALESCE(NEW.last_name, ''));
    END IF;
    
  ELSIF entity_table = 'projects' THEN
    IF TG_OP = 'DELETE' THEN
      entity_id_value := OLD.project_id;
      entity_name_value := OLD.name;
    ELSE
      entity_id_value := NEW.project_id;
      entity_name_value := NEW.name;
    END IF;
    
    -- Create descriptive text for project status changes
    IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
      description_value := CONCAT('Status changed from "', OLD.status, '" to "', NEW.status, '"');
    END IF;
    
  ELSIF entity_table = 'tasks' THEN
    IF TG_OP = 'DELETE' THEN
      entity_id_value := OLD.task_id;
      entity_name_value := OLD.title;
    ELSE
      entity_id_value := NEW.task_id;
      entity_name_value := NEW.title;
    END IF;
    
    -- Create descriptive text for task status changes
    IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
      description_value := CONCAT('Status changed from "', OLD.status, '" to "', NEW.status, '"');
    END IF;
  END IF;
  
  -- Insert activity record
  INSERT INTO activities (
    action,
    entity_type,
    entity_id,
    entity_name,
    description,
    performed_by,
    created_at
  ) VALUES (
    action_type,
    entity_table,
    entity_id_value,
    entity_name_value,
    description_value,
    COALESCE(user_id, 
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.created_by
        ELSE NEW.created_by
      END
    ),
    now()
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create activity triggers for each entity
CREATE TRIGGER record_lead_activity
AFTER INSERT OR UPDATE OR DELETE ON "leads"
FOR EACH ROW EXECUTE FUNCTION record_activity();

CREATE TRIGGER record_company_activity
AFTER INSERT OR UPDATE OR DELETE ON "companies"
FOR EACH ROW EXECUTE FUNCTION record_activity();

CREATE TRIGGER record_contact_activity
AFTER INSERT OR UPDATE OR DELETE ON "contacts"
FOR EACH ROW EXECUTE FUNCTION record_activity();

CREATE TRIGGER record_project_activity
AFTER INSERT OR UPDATE OR DELETE ON "projects"
FOR EACH ROW EXECUTE FUNCTION record_activity();

CREATE TRIGGER record_task_activity
AFTER INSERT OR UPDATE OR DELETE ON "tasks"
FOR EACH ROW EXECUTE FUNCTION record_activity();

-- Create RLS (Row Level Security) policies for all tables
-- Enable RLS on all tables first
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;

-- Create policies: users can only view/edit data in organizations they belong to
-- Allow all authenticated users in the organization to view data
CREATE POLICY "Users can view all leads"
  ON "leads" FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can view all companies"
  ON "companies" FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can view all contacts"
  ON "contacts" FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can view all projects"
  ON "projects" FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can view all tasks"
  ON "tasks" FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can view all notes"
  ON "notes" FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can view all activities"
  ON "activities" FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

-- Allow all users to insert data
CREATE POLICY "Users can insert leads"
  ON "leads" FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can insert companies"
  ON "companies" FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can insert contacts"
  ON "contacts" FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can insert projects"
  ON "projects" FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can insert tasks"
  ON "tasks" FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

CREATE POLICY "Users can insert notes"
  ON "notes" FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_organizations
    WHERE organization_id = current_setting('app.current_organization_id')::UUID
  ));

-- Update policies: only admins and managers can update data that they didn't create
CREATE POLICY "Admins and managers can update any lead"
  ON "leads" FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Employees can only update leads they created"
  ON "leads" FOR UPDATE
  USING (
    (auth.uid() = created_by) AND 
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role = 'employee'
    )
  );

-- Similar update policies for other tables
CREATE POLICY "Admins and managers can update any company"
  ON "companies" FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Employees can only update companies they created"
  ON "companies" FOR UPDATE
  USING (
    (auth.uid() = created_by) AND 
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role = 'employee'
    )
  );

-- Delete policies: only admins and managers can delete data
CREATE POLICY "Admins and managers can delete leads"
  ON "leads" FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete companies"
  ON "companies" FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete contacts"
  ON "contacts" FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete projects"
  ON "projects" FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete tasks"
  ON "tasks" FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete notes"
  ON "notes" FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_organizations
      WHERE organization_id = current_setting('app.current_organization_id')::UUID
      AND role IN ('admin', 'manager')
    )
  );

-- Create a function to set up publications for real-time updates
CREATE OR REPLACE FUNCTION setup_realtime_publications()
RETURNS VOID AS $$
BEGIN
  -- Enable real-time for the schema
  PERFORM supabase_functions.extension('pg_cron');
  PERFORM supabase_functions.http_request(
    'POST',
    CONCAT('https://urjpokafzluhanxgzdxr.supabase.co/rest/v1/realtime/publish?db_schema=', current_schema()),
    ARRAY[
      CONCAT('Authorization: Bearer ', current_setting('app.api_key')),
      'Content-Type: application/json'
    ],
    '{"enabled": true}'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 