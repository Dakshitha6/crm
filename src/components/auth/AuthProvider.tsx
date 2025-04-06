"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Only redirect to login if we're not already on an auth page
          if (
            !pathname.startsWith("/login") &&
            !pathname.startsWith("/register")
          ) {
            router.push("/login");
          }
          setIsAuthenticated(false);
          setUserId(null);
          return;
        }

        setIsAuthenticated(true);
        setUserId(session.user.id);

        // Check if email is verified
        if (!session.user.email_confirmed_at) {
          if (pathname !== "/verify-email") {
            router.push("/verify-email");
          }
          return;
        }

        // Check if user is onboarded
        const { data: userData } = await supabase
          .from("users")
          .select("is_onboarded")
          .eq("id", session.user.id)
          .single();

        if (!userData?.is_onboarded) {
          if (pathname !== "/onboarding") {
            router.push("/onboarding");
          }
          return;
        }

        // If we're on an auth page but we're already authenticated, redirect to dashboard
        if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
          router.push("/dashboard/orgs");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        toast.error("Error checking authentication status");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setUserId(null);
        router.push("/login");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setIsAuthenticated(true);
        setUserId(session?.user.id || null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
