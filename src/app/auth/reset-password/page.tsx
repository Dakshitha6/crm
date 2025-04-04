"use client";

import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");

  // Validate the password and update strength indicator
  const validatePassword = (password: string) => {
    let strength = 0;
    let feedback = "";

    if (password.length >= 8) {
      strength += 25;
    } else {
      feedback = "Password should be at least 8 characters long";
      setPasswordFeedback(feedback);
      setPasswordStrength(strength);
      return false;
    }

    if (/[A-Z]/.test(password)) {
      strength += 25;
    } else {
      feedback = "Password should contain at least one uppercase letter";
    }

    if (/[0-9]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = "Password should contain at least one number";
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      strength += 25;
    } else if (!feedback) {
      feedback = "Password should contain at least one special character";
    }

    setPasswordStrength(strength);
    setPasswordFeedback(
      feedback ||
        (strength === 100 ? "Strong password" : "Keep improving your password")
    );

    return strength >= 75; // Consider the password valid if it meets at least 3 criteria
  };

  const getProgressColor = () => {
    if (passwordStrength < 50) return "bg-red-500";
    if (passwordStrength < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Handle form submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password match
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate password strength
    if (!validatePassword(password)) {
      toast.error("Please create a stronger password");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      toast.success("Password updated successfully!");
      router.push("/auth/login");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(
        error.message || "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authenticated to access this page
  useEffect(() => {
    const checkUserSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        // If no session exists, redirect to login
        toast.error("Invalid or expired password reset link");
        router.push("/auth/login");
      }
    };

    checkUserSession();
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Set New Password</CardTitle>
          <CardDescription className="text-center">
            Create a strong password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
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
                <>
                  <Progress
                    value={passwordStrength}
                    className={getProgressColor()}
                  />
                  <p className="text-xs text-gray-500">{passwordFeedback}</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? "Updating Password..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Make sure to remember your new password!
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
