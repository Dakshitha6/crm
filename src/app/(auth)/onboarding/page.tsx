"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    job_title: "",
    timezone: "",
  });

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth/login");
        return;
      }

      if (!session.user.email_confirmed_at) {
        router.push("/auth/verify-email");
        return;
      }

      // Check if already onboarded
      const { data: userData } = await supabase
        .from("users")
        .select("is_onboarded")
        .eq("id", session.user.id)
        .single();

      if (userData?.is_onboarded) {
        router.push("/dashboard/orgs");
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Get current user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("No authenticated user found");
      }

      // Validate required fields
      if (!formData.first_name || !formData.last_name) {
        throw new Error("First name and last name are required");
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from("users")
        .update({
          ...formData,
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      toast.success("Profile updated successfully!");

      // Redirect to organization creation
      setTimeout(() => {
        router.push("/dashboard/orgs/new");
      }, 500);
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Complete your profile</CardTitle>
        <CardDescription>
          Tell us a bit about yourself to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              name="job_title"
              value={formData.job_title}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, timezone: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
