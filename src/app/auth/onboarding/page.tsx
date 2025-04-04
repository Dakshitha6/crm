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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define timezone options
const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Anchorage", label: "Alaska (US)" },
  { value: "Pacific/Honolulu", label: "Hawaii (US)" },
  { value: "Europe/London", label: "London, Edinburgh" },
  { value: "Europe/Paris", label: "Paris, Berlin, Rome, Madrid" },
  { value: "Asia/Tokyo", label: "Tokyo, Osaka" },
  { value: "Asia/Shanghai", label: "Beijing, Shanghai" },
  { value: "Asia/Kolkata", label: "Mumbai, Delhi, Bangalore" },
  { value: "Australia/Sydney", label: "Sydney, Melbourne" },
];

export default function OnboardingPage() {
  const router = useRouter();

  // User profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  // UI state
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data?.session?.user) {
          // No session, redirect to login
          router.push("/auth/login");
          return;
        }

        setUser(data.session.user);

        // Check if user is already onboarded
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select(
            "is_onboarded, first_name, last_name, phone_number, job_title, timezone"
          )
          .eq("id", data.session.user.id)
          .single();

        if (userError) throw userError;

        if (userData?.is_onboarded) {
          // If already onboarded, redirect to dashboard
          router.push("/dashboard/orgs");
          return;
        }

        // Pre-fill form if we have data
        if (userData) {
          setFirstName(userData.first_name || "");
          setLastName(userData.last_name || "");
          setPhoneNumber(userData.phone_number || "");
          setJobTitle(userData.job_title || "");
          setTimezone(userData.timezone || "UTC");
        }

        setInitialLoading(false);
      } catch (error: any) {
        console.error("Error loading user session:", error);
        toast.error("Error checking your session. Please sign in again.");
        router.push("/auth/login");
      }
    };

    checkSession();
  }, [router]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to complete onboarding.");
      router.push("/auth/login");
      return;
    }

    try {
      setLoading(true);

      // Validate form
      if (!firstName || !lastName) {
        toast.error("First name and last name are required.");
        return;
      }

      // Update user profile in database
      const { error } = await supabase
        .from("users")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          job_title: jobTitle,
          timezone,
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile completed successfully!");

      // Redirect to organization dashboard
      router.push("/dashboard/orgs");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Show loading state until we check the session
  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            Please provide your information to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Marketing Manager"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={timezone}
                onValueChange={(value) => setTimezone(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            This information will help us personalize your experience
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
