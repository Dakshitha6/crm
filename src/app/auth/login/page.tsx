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

  // Check URL parameters for session expiry - only on initial mount to avoid repeated toasts
  useEffect(() => {
    const expired = searchParams.get("sessionExpired");
    if (expired === "true") {
      setSessionExpired(true);
      // Only show toast if this is the first render
      const toastShown = sessionStorage.getItem("session_expired_toast_shown");
      if (!toastShown) {
        toast.error("Your session has expired. Please log in again.");
        // Mark toast as shown to avoid duplicate notifications
        sessionStorage.setItem("session_expired_toast_shown", "true");
      }
    } else {
      // Clear the flag if we're not on a session expired page
      sessionStorage.removeItem("session_expired_toast_shown");
    }
  }, [searchParams]);

  // Check if we have a session already on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // If we're coming to login with sessionExpired param, skip this check
        if (searchParams.get("sessionExpired") === "true") {
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        // Only redirect if we actually have a valid session
        if (data?.session?.user && !error) {
          // Check if email is verified
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

      // Clear previous errors if any
      sessionStorage.removeItem("session_expired_toast_shown");

      // Sign in with password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Check if email is verified
      if (data.user?.email_confirmed_at) {
        // If verified, redirect to dashboard
        toast.success("Logged in successfully!");
        router.push("/dashboard/orgs");
      } else {
        // If not verified, redirect to verification page
        toast.info("Please verify your email before proceeding.");
        router.push("/auth/verify-email");
      }
    } catch (error: any) {
      console.error("Login error:", error);

      // Show more specific error messages
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Please verify your email before logging in.");
        router.push("/auth/verify-email");
      } else {
        toast.error(
          error.message || "Failed to login. Please check your credentials."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      // Clear previous errors if any
      sessionStorage.removeItem("session_expired_toast_shown");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard/orgs`,
        },
      });

      if (error) {
        throw error;
      }

      // No need to redirect - OAuth will handle it
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      toast.error(error.message || "Google Sign-In failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Log in to your Swift CRM account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionExpired && (
            <div className="p-3 mb-4 text-sm border border-red-200 rounded-md bg-red-50 text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>
                Your session has expired or is invalid. Please log in again.
              </span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 186.69 190.5"
              className="mr-2"
            >
              <g transform="translate(1184.583 765.171)">
                <path
                  clip-path="none"
                  mask="none"
                  d="M-1089.333-687.239v-36.888h51.262c2.251 11.863 1.124 29.125-4.502 40.951-5.626 13.801-18.027 26.102-46.76 26.102-55.77 0-72.047-48.526-72.047-81.071 0-35.245 19.052-80.459 72.047-80.459 48.526 0 66.55 42.341 66.55 65.724l-27.092 3.376c6.763-33.44-14.003-36.064-39.458-36.888-37.421-1.189-43.897 42.896-43.897 49.1 0 39.921 19.538 57.386 41.233 57.386 16.887 0 35.998-8.414 39.462-27.222l-36.798-.111z"
                  fill="#4285f4"
                ></path>
              </g>
            </svg>
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/auth/register"
              className="text-blue-600 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
