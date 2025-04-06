"use client";

import { createClient } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";
import { toast } from "sonner";

/**
 * Checks the user's status (onboarded, verified, etc.) and returns the appropriate redirect path
 */
export async function checkUserStatusAndGetRedirect(
  request: NextRequest
): Promise<string> {
  const supabase = createClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return "/login";
  }

  // Check email verification
  if (!session.user.email_confirmed_at) {
    return "/verify-email";
  }

  // Check if user is onboarded
  const { data: userData } = await supabase
    .from("users")
    .select("is_onboarded")
    .eq("id", session.user.id)
    .single();

  if (!userData?.is_onboarded) {
    return "/onboarding";
  }

  // Check if user has an organization
  const { data: orgsData } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", session.user.id);

  if (!orgsData || orgsData.length === 0) {
    return "/dashboard/orgs/new";
  }

  // Redirect to the first organization's dashboard
  return `/dashboard/orgs/${orgsData[0].organization_id}/dashboard`;
}

export async function getRedirectPath(request: NextRequest): Promise<string> {
  const supabase = createClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return "/login";
  }

  // Check email verification
  if (!session.user.email_confirmed_at) {
    return "/verify-email";
  }

  // Check if user is onboarded
  const { data: userData } = await supabase
    .from("users")
    .select("is_onboarded")
    .eq("id", session.user.id)
    .single();

  if (!userData?.is_onboarded) {
    return "/onboarding";
  }

  // Check if user has an organization
  const { data: orgsData } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", session.user.id);

  if (!orgsData || orgsData.length === 0) {
    return "/dashboard/orgs/new";
  }

  // Redirect to the first organization's dashboard
  return `/dashboard/orgs/${orgsData[0].organization_id}/dashboard`;
}
