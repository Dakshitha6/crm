import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  job_title: string | null;
  timezone: string | null;
  email_verified: boolean;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  currentOrg: string | null;
  error: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setCurrentOrg: (orgId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      currentOrg: null,
      error: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setProfile: (profile) => set({ profile }),

      setCurrentOrg: (orgId) => set({ currentOrg: orgId }),

      setLoading: (isLoading) => set({ isLoading }),

      signOut: async () => {
        try {
          await supabase.auth.signOut();
          set({
            user: null,
            profile: null,
            currentOrg: null,
            isAuthenticated: false,
          });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      checkSession: async () => {
        try {
          set({ isLoading: true });

          // Check current session
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          if (session?.user) {
            // Fetch user profile from our users table
            const { data: profile, error: profileError } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (profileError && profileError.code !== "PGRST116") {
              // PGRST116 is "no rows returned" error, which might happen if user exists in auth but not in users table
              throw profileError;
            }

            set({
              user: session.user,
              profile: (profile as UserProfile) || null,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: (error as Error).message,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        currentOrg: state.currentOrg,
      }),
    }
  )
);
