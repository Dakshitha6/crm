import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const getStorageKey = () => {
  const hostname =
    typeof window !== "undefined"
      ? new URL(supabaseUrl).hostname.split(".")[0]
      : "local";
  return `sb-${hostname}-auth-token`;
};

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Using implicit flow is more reliable in browser environments
    // especially when dealing with redirects
    flowType: "implicit",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      // This custom implementation ensures tokens are accessible
      // to both the client and our middleware
      getItem: (key) => {
        if (typeof window === "undefined") return null;
        // First try direct access tokens
        if (key === "access_token")
          return localStorage.getItem("sb-access-token");
        if (key === "refresh_token")
          return localStorage.getItem("sb-refresh-token");

        // Then try the auth token object
        const value =
          localStorage.getItem(key) || localStorage.getItem(getStorageKey());
        return value;
      },
      setItem: (key, value) => {
        if (typeof window === "undefined") return;

        // Store in both formats for redundancy
        localStorage.setItem(key, value);

        // Also store individual tokens for middleware access
        if (key.includes("auth-token")) {
          try {
            const data = JSON.parse(value);
            if (data.access_token) {
              localStorage.setItem("sb-access-token", data.access_token);
              // Also set in cookie for middleware
              document.cookie = `sb-access-token=${
                data.access_token
              }; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
            }
            if (data.refresh_token) {
              localStorage.setItem("sb-refresh-token", data.refresh_token);
              // Also set in cookie for middleware
              document.cookie = `sb-refresh-token=${
                data.refresh_token
              }; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
            }
          } catch (e) {
            // Ignore JSON parse errors
            console.error("Error parsing auth token:", e);
          }
        }
      },
      removeItem: (key) => {
        if (typeof window === "undefined") return;
        localStorage.removeItem(key);

        // Also remove individual tokens
        if (key.includes("auth-token")) {
          localStorage.removeItem("sb-access-token");
          localStorage.removeItem("sb-refresh-token");
          // Clear cookies
          document.cookie = "sb-access-token=; path=/; max-age=0";
          document.cookie = "sb-refresh-token=; path=/; max-age=0";
        }
      },
    },
  },
});
