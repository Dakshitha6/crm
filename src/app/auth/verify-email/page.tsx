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
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();

  // State management
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Polling state to check verification status
  const [polling, setPolling] = useState(false);

  // Check authentication status on mount and handle URL token verification
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a token in the URL first
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          const token = url.searchParams.get("token");
          const type = url.searchParams.get("type");

          if (token && type === "signup") {
            // We'll handle this in the verifyFromURL effect
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data?.session?.user) {
          // No session, redirect to login - but don't show error for users just landing here
          router.push("/auth/login");
          return;
        }

        // We have a user but need to check verification status
        setUser(data.session.user);

        // If already verified, redirect to onboarding
        if (data.session.user.email_confirmed_at) {
          // Check if user is onboarded
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("is_onboarded")
            .eq("id", data.session.user.id)
            .single();

          if (!userError && userData) {
            if (userData.is_onboarded) {
              router.push("/dashboard/orgs");
            } else {
              router.push("/auth/onboarding");
            }
            return;
          }
        }

        // User is logged in but email not verified - this is the correct state for this page
        // Automatically resend verification email if it hasn't been sent yet
        if (!verificationSent && !polling) {
          // Start verification polling when we first load with an unverified user
          setPolling(true);
        }

        setInitialLoading(false);
      } catch (error: any) {
        console.error("Error checking session:", error);
        toast.error("Error checking your session. Please sign in again.");
        router.push("/auth/login");
      }
    };

    checkSession();
  }, [router, verificationSent, polling]);

  // Start polling for verification status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkVerificationStatus = async () => {
      if (!user || !polling) return;

      try {
        // Refresh the session to check if email_confirmed_at is set
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error refreshing session:", error);
          setPolling(false);
          return;
        }

        // If email is verified, redirect to onboarding
        if (data?.session?.user?.email_confirmed_at) {
          toast.success("Email verified successfully!");

          // Check if user is onboarded
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("is_onboarded")
            .eq("id", data.session.user.id)
            .single();

          setPolling(false);

          if (!userError && userData) {
            if (userData.is_onboarded) {
              router.push("/dashboard/orgs");
            } else {
              router.push("/auth/onboarding");
            }
          } else {
            router.push("/auth/onboarding");
          }
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
        setPolling(false);
      }
    };

    if (polling) {
      // Check immediately on first poll
      checkVerificationStatus();

      // Then check every 5 seconds
      intervalId = setInterval(checkVerificationStatus, 5000);
    }

    // Cleanup on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [polling, router, user]);

  // Send verification email
  const sendVerificationEmail = async () => {
    if (!user) {
      toast.error("You must be logged in to verify your email.");
      router.push("/auth/login");
      return;
    }

    try {
      setLoading(true);

      // Send verification email
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });

      if (error) throw error;

      toast.success("Verification email sent. Please check your inbox.");
      setVerificationSent(true);

      // Start polling for verification status
      setPolling(true);
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      toast.error(
        error.message || "Failed to send verification email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify using token from URL (if present)
  useEffect(() => {
    const verifyFromURL = async () => {
      // Check for token in URL (in the case of a link click)
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("token");
        const type = url.searchParams.get("type");

        if (token && type === "signup") {
          setVerifying(true);

          try {
            // Verify the token
            const { error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: "signup",
            });

            if (error) throw error;

            toast.success("Email verified successfully!");

            // Check if user is onboarded
            const { data: sessionData } = await supabase.auth.getSession();

            if (sessionData?.session?.user) {
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("is_onboarded")
                .eq("id", sessionData.session.user.id)
                .single();

              if (!userError && userData) {
                if (userData.is_onboarded) {
                  router.push("/dashboard/orgs");
                } else {
                  router.push("/auth/onboarding");
                }
              } else {
                router.push("/auth/onboarding");
              }
            } else {
              // No session after verification, go to login
              router.push("/auth/login");
            }
          } catch (error: any) {
            console.error("Error verifying email:", error);
            toast.error(
              error.message || "Failed to verify email. Please try again."
            );
            setVerifying(false);
          }
        }
      }
    };

    verifyFromURL();
  }, [router]);

  // Show loading state
  if (initialLoading || verifying) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">
          {verifying ? "Verifying your email..." : "Loading..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Verify Your Email</CardTitle>
          <CardDescription className="text-center">
            Please verify your email address to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <div className="bg-blue-50 p-6 rounded-full">
            <Mail className="h-16 w-16 text-blue-500" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">Check your inbox</h3>
            <p className="text-gray-600">
              We've sent a verification email to <strong>{user?.email}</strong>.
              Please check your inbox and click the verification link.
            </p>
          </div>

          <div className="p-4 border rounded-md bg-yellow-50 border-yellow-200 w-full">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Important</h4>
                <p className="text-sm text-yellow-700">
                  You must verify your email before you can access the
                  dashboard. If you can't find the email, check your spam
                  folder.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={sendVerificationEmail}
            className="w-full"
            disabled={loading || polling}
          >
            {loading ? "Sending..." : "Resend Verification Email"}
          </Button>

          {polling && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Waiting for verification...</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already verified?{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={async () => {
                // Refresh session to check if already verified
                const { data } = await supabase.auth.getSession();
                if (data?.session?.user?.email_confirmed_at) {
                  router.push("/auth/onboarding");
                } else {
                  toast.info(
                    "Your email is not verified yet. Please check your inbox."
                  );
                }
              }}
            >
              Continue to dashboard
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
