"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email);

        // If email is already verified, redirect appropriately
        if (session.user.email_confirmed_at) {
          const { data: userData } = await supabase
            .from("users")
            .select("is_onboarded")
            .eq("id", session.user.id)
            .single();

          if (!userData?.is_onboarded) {
            router.push("/auth/onboarding");
          } else {
            router.push("/dashboard/orgs");
          }
        }
      } else {
        // No session, redirect to login
        router.push("/auth/login");
      }
    };

    checkSession();
  }, [router]);

  useEffect(() => {
    if (!email) return;

    const interval = setInterval(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email_confirmed_at) {
        // Update the user record to mark email as verified
        await supabase
          .from("users")
          .update({ email_verified: true })
          .eq("id", session.user.id);

        toast.success("Email verified successfully!");

        // Check if user is onboarded
        const { data: userData } = await supabase
          .from("users")
          .select("is_onboarded")
          .eq("id", session.user.id)
          .single();

        if (!userData?.is_onboarded) {
          router.push("/auth/onboarding");
        } else {
          router.push("/dashboard/orgs");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [email, router]);

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email!,
      });

      if (error) throw error;

      toast.success("Verification email resent!");
    } catch (error: any) {
      console.error("Error resending email:", error);
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We've sent a verification email to {email}. Please check your inbox
          and click the verification link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-sm text-center text-gray-500">
          Waiting for email verification...
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResendEmail}
          disabled={loading}
        >
          {loading ? "Resending..." : "Resend verification email"}
        </Button>
      </CardFooter>
    </Card>
  );
}
