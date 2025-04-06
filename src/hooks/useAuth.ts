import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/state/auth";

export function useAuth() {
  const router = useRouter();
  const { setUser, setProfile, setLoading, signOut } = useAuthStore();

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);

      if (session) {
        setUser(session.user);

        // Fetch user profile
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setProfile(profile);

        // Handle auth events
        switch (event) {
          case "SIGNED_IN":
            if (!session.user.email_verified) {
              router.push("/verify-email");
            } else {
              router.push("/dashboard/orgs");
            }
            break;

          case "USER_UPDATED":
            if (session.user.email_verified) {
              router.push("/dashboard/orgs");
            }
            break;
        }
      } else {
        setUser(null);
        setProfile(null);
        router.push("/login");
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { signOut };
}
