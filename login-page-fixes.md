# Login Page Fixes

Make these changes to `src/app/auth/login/page.tsx` to fix the session expiry error:

1. Update the imports at the top of the file:

```tsx
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
```

2. Add the search params and session expired state:

```tsx
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
      toast.error("Your session has expired. Please log in again.");
    }
  }, [searchParams]);
```

3. Update the error handling in the login function:

```tsx
  // Handle login with email/password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

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
        toast.error(error.message || "Failed to login. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };
```

4. Add the session expired alert to the UI:

```tsx
<CardContent>
  {sessionExpired && (
    <div className="p-3 mb-4 text-sm border border-red-200 rounded-md bg-red-50 text-red-600 flex items-center">
      <AlertCircle className="h-4 w-4 mr-2" />
      <span>Your session has expired or is invalid. Please log in again.</span>
    </div>
  )}

  <form onSubmit={handleLogin} className="space-y-4">