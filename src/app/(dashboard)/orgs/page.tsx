"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, MoreHorizontal } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  user_role: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Verify user session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Direct session check from Supabase
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          toast.error("Session error. Please log in again.");
          router.push("/auth/login");
          return;
        }

        if (!data?.session?.user) {
          console.log("No active session found in dashboard");
          toast.error("Your session has expired. Please log in again.");
          router.push("/auth/login");
          return;
        }

        setUser(data.session.user);

        // Verify the user is properly onboarded
        try {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("is_onboarded")
            .eq("id", data.session.user.id)
            .single();

          if (userError) {
            if (userError.code === "PGRST116") {
              console.error("User record not found for authenticated user");
              toast.error(
                "Your profile is incomplete. Redirecting to onboarding."
              );
              router.push("/auth/onboarding");
              return;
            }
            throw userError;
          }

          if (!userData?.is_onboarded) {
            console.log("User not onboarded, redirecting to onboarding");
            toast.error("Please complete your profile before continuing.");
            router.push("/auth/onboarding");
            return;
          }

          // User is authenticated and onboarded, proceed to load organizations
          fetchOrganizations();
        } catch (error) {
          console.error("Error verifying user status:", error);
          toast.error("Error verifying your account status.");
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Session check error:", error);
        toast.error("Error verifying your session.");
        router.push("/auth/login");
      }
    };

    checkSession();
  }, [router]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc("get_user_organizations");

      if (error) {
        throw error;
      }

      setOrganizations(data || []);
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = () => {
    router.push("/orgs/create");
  };

  const handleOrgClick = (orgId: string) => {
    router.push(`/orgs/${orgId}`);
  };

  const renderEmptyState = () => (
    <Card className="border-dashed border-2">
      <CardContent className="pt-6 pb-10 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-blue-50 p-3 mb-4">
          <div className="rounded-full bg-blue-100 p-2">
            <Plus className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <h3 className="font-medium text-lg mb-1">No organizations yet</h3>
        <p className="text-sm text-gray-500 mb-4 max-w-md">
          Create your first organization to start managing your team, projects,
          and resources
        </p>
        <Button onClick={handleCreateOrg}>Create Organization</Button>
      </CardContent>
    </Card>
  );

  const renderOrganizationCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {organizations.map((org) => (
        <Card key={org.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle>{org.name}</CardTitle>
                <CardDescription>
                  {org.description || "No description"}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleOrgClick(org.id)}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>Invite Members</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            <div className="text-sm text-gray-500 mb-2">
              <span className="font-medium">Your role:</span> {org.user_role}
            </div>
          </CardContent>
          <CardFooter className="pt-2 border-t bg-gray-50">
            <Button
              variant="ghost"
              className="w-full text-blue-600"
              onClick={() => handleOrgClick(org.id)}
            >
              View Organization
            </Button>
          </CardFooter>
        </Card>
      ))}

      {/* Create new organization card */}
      <Card className="border-dashed border-2 hover:bg-gray-50 transition-colors">
        <CardContent
          className="pt-6 pb-6 h-full flex flex-col items-center justify-center text-center cursor-pointer"
          onClick={handleCreateOrg}
        >
          <div className="rounded-full bg-blue-50 p-3 mb-4">
            <Plus className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-medium">Create New Organization</h3>
          <p className="text-sm text-gray-500 mt-1">
            Add a new team or company
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-gray-500">Manage your companies and teams</p>
        </div>
        <Button onClick={handleCreateOrg}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>

      <div>
        {loading ? (
          <div className="text-center py-10">Loading organizations...</div>
        ) : organizations.length === 0 ? (
          renderEmptyState()
        ) : (
          renderOrganizationCards()
        )}
      </div>
    </div>
  );
}
