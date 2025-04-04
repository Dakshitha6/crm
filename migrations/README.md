# Database Migration Files

This directory contains the SQL migration files required to set up the Swift Next CRM database in Supabase.

## Migration Files

1. **001_create_public_schema.sql**: Creates the basic tables in the public schema (users, organizations, user_organizations, invitations) and sets up Row Level Security policies.

2. **002_auth_sync_trigger.sql**: Creates a trigger function to automatically sync user data from auth.users to the public.users table.

3. **003_org_schema_template.sql**: A template with comments showing the structure of organization-specific schemas (for reference only, not to be executed directly).

4. **004_create_org_schema_function.sql**: Creates a stored procedure for dynamically generating organization-specific schemas when a new organization is created.

## Applying Migrations

### Option 1: Supabase Dashboard

1. Log in to the [Supabase Dashboard](https://app.supabase.io)
2. Navigate to the SQL Editor
3. Copy and paste each migration file in sequence
4. Execute each SQL query

### Option 2: Supabase CLI

1. Install the Supabase CLI: `npm install -g supabase`
2. Link your project: 
   ```
   supabase link --project-ref <project-id>
   ```
3. Apply migrations: 
   ```
   supabase db push
   ```

## Dynamic Schema Creation

The organization schema creation is designed to happen via an Edge Function after a new organization is inserted. This function should be called during the organization creation process using the `create_organization_schema` stored procedure.

### Edge Function Implementation

Create a new Edge Function in Supabase that calls the `create_organization_schema` procedure:

```js
// Example Edge Function for creating organization schema
// Location: /supabase/functions/create_org_schema/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { org_id } = await req.json()
    
    if (!org_id) {
      return new Response(
        JSON.stringify({ error: 'org_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Call the stored procedure to create the organization schema
    const { data, error } = await supabase
      .rpc('create_organization_schema', { org_id })
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

This Edge Function would be called after creating a new organization record in the `organizations` table. 