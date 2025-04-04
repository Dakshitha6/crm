import { supabase } from "@/lib/supabase";

export interface OrganizationData {
  name: string;
  website?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

/**
 * Creates a new organization and its schema
 *
 * @param orgData Organization data
 * @param userId The ID of the user creating the organization
 * @returns The created organization or error
 */
export async function createOrganization(
  orgData: OrganizationData,
  userId: string
) {
  try {
    // Step 1: Insert the organization into the public.organizations table
    const { data: organization, error: insertError } = await supabase
      .from("organizations")
      .insert({
        name: orgData.name,
        website: orgData.website || null,
        phone_number: orgData.phone_number || null,
        address: orgData.address || null,
        city: orgData.city || null,
        state: orgData.state || null,
        zip: orgData.zip || null,
        country: orgData.country || null,
        created_by: userId,
      })
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    // Step 2: Add the creating user as an admin in user_organizations
    const { error: membershipError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: userId,
        organization_id: organization.org_id,
        role: "admin",
      });

    if (membershipError) {
      // If adding the membership fails, we should ideally rollback the organization,
      // but for simplicity, we'll just throw the error
      throw membershipError;
    }

    // Step 3: Call the edge function to create the organization schema
    const { error: schemaError } = await createOrganizationSchema(
      organization.org_id
    );

    if (schemaError) {
      // Error creating schema - this is a critical error that should be handled
      // In a production app, you'd want to log this error and potentially retry
      // or have a cleanup process for organizations with failed schema creation
      throw schemaError;
    }

    return { organization, error: null };
  } catch (error) {
    console.error("Error creating organization:", error);
    return { organization: null, error };
  }
}

/**
 * Calls the Supabase Edge Function to create an organization schema
 *
 * @param orgId The organization ID
 * @returns Success or error response
 */
async function createOrganizationSchema(orgId: string) {
  try {
    // In development, just call the RPC function directly
    // In production, this would be replaced with a call to the Edge Function
    const { data, error } = await supabase.rpc("create_organization_schema", {
      org_id: orgId,
    });

    return { data, error };
  } catch (error) {
    console.error("Error creating organization schema:", error);
    return { data: null, error };
  }
}

/**
 * Gets a list of organizations for a user
 *
 * @param userId The user ID
 * @returns List of organizations the user belongs to
 */
export async function getUserOrganizations(userId: string) {
  const { data, error } = await supabase
    .from("user_organizations")
    .select(
      `
      id,
      role,
      organization_id,
      organizations:organization_id (
        org_id,
        name,
        website,
        phone_number,
        address,
        city,
        state,
        zip,
        country,
        created_at
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error getting user organizations:", error);
    return { organizations: null, error };
  }

  // Transform the data to a more usable format
  const organizations = data.map((item) => ({
    id: item.id,
    role: item.role,
    ...item.organizations,
  }));

  return { organizations, error: null };
}
