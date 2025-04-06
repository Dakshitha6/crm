"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Check URL parameters for session expiry
  useEffect(() => {
    const expired = searchParams.get("sessionExpired");
    if (expired === "true") {
      setSessionExpired(true);
      const toastShown = sessionStorage.getItem("session_expired_toast_shown");
      if (!toastShown) {
        toast.error("Your session has expired. Please log in again.");
        sessionStorage.setItem("session_expired_toast_shown", "true");
      }
    } else {
      sessionStorage.removeItem("session_expired_toast_shown");
    }
  }, [searchParams]);

  // Check if we have a session already on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (searchParams.get("sessionExpired") === "true") {
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        if (data?.session?.user && !error) {
          if (data.session.user.email_confirmed_at) {
            router.push("/dashboard/orgs");
          } else {
            router.push("/auth/verify-email");
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    checkSession();
  }, [router, searchParams]);

  // Handle login with email/password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      sessionStorage.removeItem("session_expired_toast_shown");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.session) {
        console.log("Login successful with session");

        // Store auth state in localStorage for reliability
        localStorage.setItem("sb-access-token", data.session.access_token);
        localStorage.setItem("sb-refresh-token", data.session.refresh_token);

        // Store in Supabase internal storage format
        localStorage.setItem(
          "supabase.auth.token",
          JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          })
        );

        // Set session cookies for middleware
        document.cookie = `sb-access-token=${
          data.session.access_token
        }; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        document.cookie = `sb-refresh-token=${
          data.session.refresh_token
        }; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;

        // Check if user is onboarded
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_onboarded")
          .eq("id", data.session.user.id)
          .single();

        if (userError) {
          if (userError.code === "PGRST116") {
            const { error: insertError } = await supabase.from("users").insert({
              id: data.session.user.id,
              email: data.session.user.email,
              email_verified: data.session.user.email_confirmed_at !== null,
              is_onboarded: false,
            });

            if (insertError) {
              console.error("Error creating user record:", insertError);
              toast.error("Error setting up your account");
            } else {
              console.log("Created new user record, redirecting to onboarding");
              toast.success(
                "Login successful! Complete your profile to continue"
              );
              setTimeout(() => {
                window.location.href = "/auth/onboarding";
              }, 500);
              return;
            }
          } else {
            console.error("Error fetching user data:", userError);
          }
        }

        // Handle onboarded users
        if (userData?.is_onboarded) {
          const { data: orgsData, error: orgsError } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", data.session.user.id);

          if (orgsError) {
            console.error("Error checking organizations:", orgsError);
          }

          if (orgsData && orgsData.length > 0) {
            console.log("User has organization, redirecting to org dashboard");
            toast.success("Logged in successfully!");
            const orgId = orgsData[0].organization_id;
            setTimeout(() => {
              window.location.href = `/dashboard/orgs/${orgId}/dashboard`;
            }, 500);
          } else {
            console.log("User needs to create an organization");
            toast.success("Please create your organization to continue");
            setTimeout(() => {
              window.location.href = "/dashboard/orgs/new";
            }, 500);
          }
        } else {
          console.log("User needs onboarding, redirecting");
          toast.success("Please complete your profile to continue");
          setTimeout(() => {
            window.location.href = "/auth/onboarding";
          }, 500);
        }
      } else {
        toast.error("Login failed - no session data returned");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to log in");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center">
            <Link
              href="/auth/forgot-password"
              className="text-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <div className="text-sm text-center">
            Don't have an account?{" "}
            <Link
              href="/auth/register"
              className="text-primary hover:underline"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
