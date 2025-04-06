import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Combines class names with Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if a string is a valid email address
 */
export function isValidEmail(email: string): boolean {
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formats a date to a readable string in the format "Month DD, YYYY"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Truncates a string to the specified length and adds an ellipsis
 */
export function truncateString(str: string, maxLength: number = 100): string {
  if (!str || str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Formats a date as a relative time string (e.g. "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const inputDate = typeof date === "string" ? new Date(date) : date;

  // Calculate the difference in milliseconds
  const diffMs = now.getTime() - inputDate.getTime();

  // Convert to seconds, minutes, hours, days
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Format the relative time
  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else {
    // Format as date for older times
    return inputDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

/**
 * Formats a date in a standardized format
 */
export function formatDateStandard(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const inputDate = typeof date === "string" ? new Date(date) : date;

  return inputDate.toLocaleDateString(undefined, mergedOptions);
}

/**
 * Formats a date and time in a standardized format
 */
export function formatDateTime(date: string | Date): string {
  const inputDate = typeof date === "string" ? new Date(date) : date;

  return inputDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats a phone number for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // Format based on length (US phone number format)
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(
      3,
      6
    )}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly[0] === "1") {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(
      4,
      7
    )}-${digitsOnly.slice(7)}`;
  }

  // If not a standard format, return as is
  return phoneNumber;
}

/**
 * Formats a currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD"
): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Generates initials from a name
 */
export function getInitials(name: string): string {
  const names = name.trim().split(" ");
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

/**
 * Utility to retry async operations with exponential backoff
 * @param operation The async operation to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in ms between retries
 * @returns Result of the operation
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 300
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Skip retry for certain errors that are unlikely to be resolved with retry
      if (
        lastError.message.includes("permission denied") ||
        lastError.message.includes("not authorized") ||
        lastError.message.includes("network") === false // Skip if NOT a network error
      ) {
        throw lastError;
      }

      // Exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError || new Error("Operation failed after retries");
}

/**
 * Ensures a user record exists in the database
 * @param supabaseClient Supabase client instance
 * @param userId User's ID from auth
 * @param email User's email
 * @param isEmailVerified Whether the user's email is verified
 * @returns true if the user was created or already exists, false if there was an error
 */
export async function ensureUserRecord(
  supabaseClient: SupabaseClient,
  userId: string,
  email: string,
  isEmailVerified: boolean = false
): Promise<boolean> {
  try {
    // First try to get the user
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    // If the user doesn't exist (PGRST116 error), create them
    if (userError && userError.code === "PGRST116") {
      const { error: insertError } = await supabaseClient.from("users").insert({
        id: userId,
        email: email,
        email_verified: isEmailVerified,
        is_onboarded: false,
      });

      if (insertError) {
        console.error("Error creating user record:", insertError);
        return false;
      }

      return true;
    } else if (userError) {
      console.error("Error checking for user:", userError);
      return false;
    }

    // User already exists
    return true;
  } catch (error) {
    console.error("Error in ensureUserRecord:", error);
    return false;
  }
}

/**
 * Creates a default organization for a newly onboarded user if they don't have any
 * @param supabaseClient Supabase client instance
 * @param userId User's ID
 * @param firstName User's first name
 * @param lastName User's last name
 * @returns The ID of the created organization or null if there was an error
 */
export async function createDefaultOrganizationIfNeeded(
  supabaseClient: SupabaseClient,
  userId: string,
  firstName: string,
  lastName: string
): Promise<string | null> {
  try {
    // First check if the user already has any organizations
    const { data: orgData, error: orgCheckError } = await supabaseClient.rpc(
      "get_user_organizations"
    );

    if (orgCheckError) {
      // If there's an issue with the RPC, try a direct query
      const { data: directOrgData, error: directOrgError } =
        await supabaseClient
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", userId);

      if (directOrgError) {
        console.error("Error checking user organizations:", directOrgError);
      } else if (directOrgData && directOrgData.length > 0) {
        // User already has organizations, no need to create a default one
        return directOrgData[0].organization_id;
      }
    } else if (orgData && orgData.length > 0) {
      // User already has organizations from the RPC call
      return orgData[0].id;
    }

    // User has no organizations, create a default one
    console.log(
      "No organizations found for user, creating default organization"
    );

    // Create the organization
    const orgName = `${firstName}'s Organization`;
    const { data: newOrg, error: createOrgError } = await supabaseClient
      .from("organizations")
      .insert({
        name: orgName,
        description: "Default organization",
        created_by: userId,
      })
      .select("org_id")
      .single();

    if (createOrgError) {
      console.error("Error creating default organization:", createOrgError);
      return null;
    }

    // Link the user to the organization as an admin
    const { error: linkError } = await supabaseClient
      .from("user_organizations")
      .insert({
        user_id: userId,
        organization_id: newOrg.org_id,
        role: "admin",
      });

    if (linkError) {
      console.error("Error linking user to organization:", linkError);
      return null;
    }

    console.log("Successfully created default organization:", newOrg.org_id);
    return newOrg.org_id;
  } catch (error) {
    console.error("Error in createDefaultOrganizationIfNeeded:", error);
    return null;
  }
}
