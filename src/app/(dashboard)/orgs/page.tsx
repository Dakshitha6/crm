"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

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
import { Building2, Settings, Plus, Users, ArrowUpRight } from "lucide-react";

// Types
interface Organization {
  org_id: string;
  name: string;
  created_at: string;
  role: string;
  memberCount: number;
}

export default function OrganizationsPage() {
  const router = useRouter();

  // State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);

        // Get the current user's organizations with their role
        const { data: userOrgs, error: userOrgsError } = await supabase.from(
          "user_organizations"
        ).select(`
            organization_id,
            role,
            organizations (
              org_id,
              name,
              created_at
            )
          `);

        if (userOrgsError) throw userOrgsError;

        // Get member count for each organization
        const orgsWithMemberCount = await Promise.all(
          userOrgs.map(async (userOrg) => {
            const { count, error: countError } = await supabase
              .from("user_organizations")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", userOrg.organization_id);

            if (countError) {
              console.error("Error fetching member count:", countError);
              return {
                org_id: userOrg.organizations.org_id,
                name: userOrg.organizations.name,
                created_at: userOrg.organizations.created_at,
                role: userOrg.role,
                memberCount: 0, // Default if count fails
              };
            }

            return {
              org_id: userOrg.organizations.org_id,
              name: userOrg.organizations.name,
              created_at: userOrg.organizations.created_at,
              role: userOrg.role,
              memberCount: count || 0,
            };
          })
        );

        setOrganizations(orgsWithMemberCount);
      } catch (error: any) {
        console.error("Error fetching organizations:", error);
        toast.error("Failed to load your organizations");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  // Render role badge with appropriate color
  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-blue-50 text-blue-700 border-blue-200",
      manager: "bg-green-50 text-green-700 border-green-200",
      member: "bg-gray-50 text-gray-700 border-gray-200",
    };

    const style = styles[role as keyof typeof styles] || styles.member;

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${style}`}
      >
        {role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Your Organizations</h1>
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold">Your Organizations</h1>
        <Button
          onClick={() => router.push("/orgs/new")}
          className="mt-4 md:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>

      {organizations.length === 0 ? (
        <Card className="text-center p-10">
          <CardContent className="pt-10 pb-10">
            <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Organizations Found</h3>
            <p className="text-gray-500 mb-6">
              You don't have any organizations yet. Create your first
              organization to get started.
            </p>
            <Button onClick={() => router.push("/orgs/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.org_id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="font-bold">{org.name}</CardTitle>
                <CardDescription>
                  Created {formatDate(org.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  {getRoleBadge(org.role)}
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    <span>
                      {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orgs/${org.org_id}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/orgs/${org.org_id}/dashboard`}>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Open
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
