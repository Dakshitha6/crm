"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    isValid: false,
    message: "",
  });

  // Password strength validation
  const validatePassword = (password: string) => {
    if (password.length < 8) {
      setPasswordStrength({
        isValid: false,
        message: "Password must be at least 8 characters long",
      });
      return;
    }

    // Check for at least one special character
    const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    if (!specialChars.test(password)) {
      setPasswordStrength({
        isValid: false,
        message: "Password must include at least one special character",
      });
      return;
    }

    setPasswordStrength({
      isValid: true,
      message: "Password strength: Good",
    });
  };

  // Handle registration with email/password
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordStrength.isValid) {
      toast.error("Please use a stronger password");
      return;
    }

    try {
      setLoading(true);

      // Sign up the user first
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/onboarding`,
        },
      });

      if (error) {
        throw error;
      }

      // Only check for invitations if user signup was successful
      try {
        // Check if user was invited
        const { data: invitations, error: inviteError } = await supabase
          .from("invitations")
          .select("*")
          .eq("email", email)
          .eq("status", "pending");

        // If there's no error and we have invitations, process them
        if (!inviteError && invitations && invitations.length > 0) {
          // Accept the first invitation if there are multiple
          const invitation = invitations[0];

          try {
            // Add user to the organization
            await supabase.from("user_organizations").insert({
              user_id: data.user!.id,
              organization_id: invitation.organization_id,
              role: invitation.role,
            });

            // Update invitation status
            await supabase
              .from("invitations")
              .update({ status: "accepted" })
              .eq("id", invitation.id);
          } catch (orgError) {
            // If this fails, just log it but continue with registration
            console.error("Error processing invitation:", orgError);
          }
        }
      } catch (inviteError) {
        // If checking invitations fails (e.g., table doesn't exist),
        // just log it and continue with registration
        console.error("Error checking invitations:", inviteError);
      }

      // Ensure we have a valid session before redirecting
      const { data: session } = await supabase.auth.getSession();

      // Show success message and redirect regardless of invitation status
      toast.success(
        "Registration successful! Please check your email for verification."
      );

      // Add a small delay to ensure session is established before redirect
      setTimeout(() => {
        router.push("/auth/verify-email");
      }, 500);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/onboarding`,
        },
      });

      if (error) {
        throw error;
      }
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
          <CardTitle className="text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Register to get started with Swift CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value);
                }}
                required
              />
              {password && (
                <p
                  className={`text-sm ${
                    passwordStrength.isValid ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {passwordStrength.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
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
            Sign up with Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
