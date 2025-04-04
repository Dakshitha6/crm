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
import { Textarea } from "@/components/ui/textarea";
import { Building } from "lucide-react";

export default function NewOrganizationPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");

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
          toast.error("You must be logged in to create an organization.");
          router.push("/auth/login");
          return;
        }

        if (!data.session.user.email_confirmed_at) {
          // Email not verified
          toast.error(
            "Please verify your email before creating an organization."
          );
          router.push("/auth/verify-email");
          return;
        }

        setUser(data.session.user);

        // Check if user is onboarded
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_onboarded")
          .eq("id", data.session.user.id)
          .single();

        if (userError) throw userError;

        if (!userData?.is_onboarded) {
          // Not onboarded yet
          toast.error(
            "Please complete your profile before creating an organization."
          );
          router.push("/auth/onboarding");
          return;
        }

        setInitialLoading(false);
      } catch (error: any) {
        console.error("Error checking session:", error);
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
      toast.error("You must be logged in to create an organization.");
      router.push("/auth/login");
      return;
    }

    try {
      setLoading(true);

      // Validate form
      if (!name) {
        toast.error("Organization name is required.");
        return;
      }

      // Create organization in database
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name,
          website,
          phone_number: phoneNumber,
          address,
          city,
          state,
          zip: zipCode,
          country,
          created_by: user.id,
        })
        .select("org_id")
        .single();

      if (orgError) throw orgError;

      // Add user as admin of organization
      const { error: memberError } = await supabase
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: orgData.org_id,
          role: "admin", // First user is always admin
        });

      if (memberError) throw memberError;

      toast.success("Organization created successfully!");

      // Redirect to organization dashboard
      router.push(`/orgs/${orgData.org_id}/dashboard`);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(
        error.message || "Failed to create organization. Please try again."
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
    <div className="container max-w-4xl py-10">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 rounded-full bg-blue-50">
              <Building className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            Create a New Organization
          </CardTitle>
          <CardDescription className="text-center">
            Set up your organization to start using Swift CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.example.com"
              />
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
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Suite 100"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CA"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                <Input
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="94103"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-6">
          <p className="text-sm text-gray-600">
            You can complete additional organization settings after creation.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
