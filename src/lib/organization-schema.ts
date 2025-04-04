import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sets the current organization ID as a PostgreSQL session parameter
 * This is used for Row Level Security policies that need to know the current organization
 */
export async function setOrganizationContext(
  supabase: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("set_config", {
      parameter: "app.current_organization_id",
      value: organizationId,
    });

    if (error) {
      console.error("Error setting organization context:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error setting organization context:", error);
    return false;
  }
}

/**
 * Creates a Supabase query builder for the organization-specific schema
 * This is a helper that makes it easier to query tables in the organization's schema
 */
export function fromOrganization<T = any>(
  supabase: SupabaseClient,
  organizationId: string,
  table: string
) {
  return supabase.from<T>(`org_${organizationId}.${table}`);
}

/**
 * Helper function to ensure organization context is set before executing a callback
 * This is useful when you need to make multiple queries to the same organization
 */
export async function withOrganizationContext<T>(
  supabase: SupabaseClient,
  organizationId: string,
  callback: () => Promise<T>
): Promise<T> {
  const success = await setOrganizationContext(supabase, organizationId);

  if (!success) {
    throw new Error("Failed to set organization context");
  }

  return callback();
}

/**
 * Prepares a table name for an organization-specific schema
 */
export function getOrganizationTableName(
  organizationId: string,
  table: string
): string {
  return `org_${organizationId}.${table}`;
}

/**
 * Helper to check if a user belongs to an organization
 */
export async function userBelongsToOrganization(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Helper to get a user's role in an organization
 */
export async function getUserOrganizationRole(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

/**
 * Helper to check if a user has a specific permission in an organization
 */
export async function hasPermission(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  action: "create" | "read" | "update" | "delete"
): Promise<boolean> {
  const role = await getUserOrganizationRole(supabase, userId, organizationId);

  if (!role) {
    return false;
  }

  switch (action) {
    case "create":
      // All roles can create
      return true;
    case "read":
      // All roles can read
      return true;
    case "update":
      // Only admin and manager can update data they didn't create
      // Normal employees can only update their own data (handled at DB level)
      return ["admin", "manager"].includes(role);
    case "delete":
      // Only admin and manager can delete
      return ["admin", "manager"].includes(role);
    default:
      return false;
  }
}
