"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/state/auth";

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { checkSession } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Initial session check
    checkSession();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/auth/login");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Refresh the auth store
        checkSession();
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [checkSession, router]);

  return <>{children}</>;
}
