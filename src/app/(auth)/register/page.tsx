"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validate password strength
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        throw new Error("Password must contain at least one special character");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) throw error;

      if (data?.user) {
        // Create user record
        const { error: insertError } = await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email,
          email_verified: false,
          is_onboarded: false,
        });

        if (insertError) {
          console.error("Error creating user record:", insertError);
          toast.error("Error setting up your account");
        } else {
          toast.success(
            "Registration successful! Please check your email to verify your account."
          );
          router.push("/auth/verify-email");
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Sign up to get started with Swift CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
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
            <p className="text-sm text-gray-500">
              Password must be at least 8 characters long and contain one
              special character
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-center w-full">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
