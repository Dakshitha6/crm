import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Service role client for admin operations
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { name, industry } = requestData;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Create organization in the public schema
    const { data: organization, error: createError } = await supabase
      .from("organizations")
      .insert({
        name,
        industry: industry || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating organization:", createError);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    // Add the creator as an admin
    const { error: memberError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: user.id,
        organization_id: organization.id,
        role: "admin",
      });

    if (memberError) {
      console.error("Error adding user to organization:", memberError);
      // Delete the organization if adding the user fails
      await supabase.from("organizations").delete().eq("id", organization.id);

      return NextResponse.json(
        { error: "Failed to set up organization membership" },
        { status: 500 }
      );
    }

    // Create organization-specific schema using the service role client
    const schemaName = `org_${organization.id}`;

    // Create the schema
    const { error: schemaError } = await serviceRoleClient.rpc(
      "create_schema",
      {
        schema_name: schemaName,
      }
    );

    if (schemaError) {
      console.error("Error creating schema:", schemaError);
      // Clean up if schema creation fails
      await supabase
        .from("user_organizations")
        .delete()
        .eq("organization_id", organization.id);

      await supabase.from("organizations").delete().eq("id", organization.id);

      return NextResponse.json(
        { error: "Failed to create organization schema" },
        { status: 500 }
      );
    }

    // Read the organization schema SQL file
    const schemaSQL = fs.readFileSync(
      path.join(process.cwd(), "db/organization_schema.sql"),
      "utf8"
    );

    // Set the current_organization_id parameter for RLS policies
    await serviceRoleClient.rpc("set_config", {
      parameter: "app.current_organization_id",
      value: organization.id,
    });

    // Execute the schema creation SQL in the organization-specific schema
    const { error: sqlError } = await serviceRoleClient.rpc("execute_sql", {
      sql_string: `
        SET search_path TO ${schemaName};
        ${schemaSQL}
      `,
    });

    if (sqlError) {
      console.error("Error executing schema SQL:", sqlError);
      // Attempt to clean up if SQL execution fails
      await serviceRoleClient.rpc("drop_schema", {
        schema_name: schemaName,
        cascade: true,
      });

      await supabase
        .from("user_organizations")
        .delete()
        .eq("organization_id", organization.id);

      await supabase.from("organizations").delete().eq("id", organization.id);

      return NextResponse.json(
        { error: "Failed to initialize organization schema" },
        { status: 500 }
      );
    }

    // Set up real-time features for the schema
    await serviceRoleClient.rpc("execute_sql", {
      sql_string: `
        SET search_path TO ${schemaName};
        SELECT setup_realtime_publications();
      `,
    });

    return NextResponse.json({
      message: "Organization created successfully",
      organization,
    });
  } catch (error) {
    console.error("Error in organization creation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Database functions needed for this API:
/*
-- Create these functions in your Supabase SQL editor

-- Function to create a new schema
CREATE OR REPLACE FUNCTION create_schema(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to drop a schema
CREATE OR REPLACE FUNCTION drop_schema(schema_name TEXT, cascade BOOLEAN DEFAULT false)
RETURNS VOID AS $$
BEGIN
  IF cascade THEN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
  ELSE
    EXECUTE format('DROP SCHEMA IF EXISTS %I', schema_name);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute arbitrary SQL (use with caution!)
CREATE OR REPLACE FUNCTION execute_sql(sql_string TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_string;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set PostgreSQL configuration parameters
CREATE OR REPLACE FUNCTION set_config(parameter TEXT, value TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config(parameter, value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
