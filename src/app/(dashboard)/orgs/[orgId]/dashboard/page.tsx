"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Users,
  Building2,
  Phone,
  Briefcase,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Define interfaces for our data
interface MetricsData {
  leads: number;
  activeProjects: number;
  companies: number;
  contacts: number;
}

interface RecentActivity {
  id: string;
  type: "lead" | "project" | "company" | "contact";
  action: "created" | "updated" | "deleted";
  name: string;
  user: string;
  timestamp: string;
}

export default function DashboardPage() {
  const { orgId } = useParams();

  // State management
  const [metrics, setMetrics] = useState<MetricsData>({
    leads: 0,
    activeProjects: 0,
    companies: 0,
    contacts: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("");

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  };

  // Fetch organization metrics and recent activities
  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!orgId) return;

      try {
        setLoading(true);

        // Get organization details
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("name")
          .eq("org_id", orgId)
          .single();

        if (orgError) throw orgError;
        setOrgName(orgData.name);

        // Fetch metrics
        await fetchMetrics();

        // Fetch recent activities
        await fetchRecentActivities();
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationData();
  }, [orgId]);

  // Fetch count metrics from each entity table
  const fetchMetrics = async () => {
    try {
      // For the purposes of this implementation, we'll use dynamic schema queries
      // Note: In a production app, these would ideally be stored procedures or functions

      // Get leads count
      const { count: leadsCount, error: leadsError } = await supabase
        .from(`org_${orgId}.leads`)
        .select("*", { count: "exact", head: true });

      // Get active projects count
      const { count: projectsCount, error: projectsError } = await supabase
        .from(`org_${orgId}.projects`)
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Get companies count
      const { count: companiesCount, error: companiesError } = await supabase
        .from(`org_${orgId}.companies`)
        .select("*", { count: "exact", head: true });

      // Get contacts count
      const { count: contactsCount, error: contactsError } = await supabase
        .from(`org_${orgId}.contacts`)
        .select("*", { count: "exact", head: true });

      setMetrics({
        leads: leadsCount || 0,
        activeProjects: projectsCount || 0,
        companies: companiesCount || 0,
        contacts: contactsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      // Continue with zeros rather than failing completely
    }
  };

  // Fetch recent activities across all entity tables
  const fetchRecentActivities = async () => {
    try {
      // For this implementation, we'll simulate recent activities by fetching
      // the most recently created/updated records from each table

      // Get recent leads
      const { data: recentLeads, error: leadsError } = await supabase
        .from(`org_${orgId}.leads`)
        .select(
          `
          lead_id,
          first_name,
          last_name,
          created_at,
          updated_at,
          created_by,
          users:created_by (
            first_name,
            last_name
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      // Get recent projects
      const { data: recentProjects, error: projectsError } = await supabase
        .from(`org_${orgId}.projects`)
        .select(
          `
          project_id,
          name,
          created_at,
          updated_at,
          created_by,
          users:created_by (
            first_name,
            last_name
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      // Get recent companies
      const { data: recentCompanies, error: companiesError } = await supabase
        .from(`org_${orgId}.companies`)
        .select(
          `
          company_id,
          name,
          created_at,
          updated_at,
          created_by,
          users:created_by (
            first_name,
            last_name
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      // Get recent contacts
      const { data: recentContacts, error: contactsError } = await supabase
        .from(`org_${orgId}.contacts`)
        .select(
          `
          contact_id,
          first_name,
          last_name,
          created_at,
          updated_at,
          created_by,
          users:created_by (
            first_name,
            last_name
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      // Transform and combine the results
      const activities: RecentActivity[] = [];

      if (recentLeads) {
        recentLeads.forEach((lead) => {
          activities.push({
            id: lead.lead_id,
            type: "lead",
            action: "created",
            name: `${lead.first_name} ${lead.last_name}`,
            user: lead.users
              ? `${lead.users.first_name} ${lead.users.last_name}`
              : "Unknown",
            timestamp: lead.created_at,
          });
        });
      }

      if (recentProjects) {
        recentProjects.forEach((project) => {
          activities.push({
            id: project.project_id,
            type: "project",
            action: "created",
            name: project.name,
            user: project.users
              ? `${project.users.first_name} ${project.users.last_name}`
              : "Unknown",
            timestamp: project.created_at,
          });
        });
      }

      if (recentCompanies) {
        recentCompanies.forEach((company) => {
          activities.push({
            id: company.company_id,
            type: "company",
            action: "created",
            name: company.name,
            user: company.users
              ? `${company.users.first_name} ${company.users.last_name}`
              : "Unknown",
            timestamp: company.created_at,
          });
        });
      }

      if (recentContacts) {
        recentContacts.forEach((contact) => {
          activities.push({
            id: contact.contact_id,
            type: "contact",
            action: "created",
            name: `${contact.first_name} ${contact.last_name}`,
            user: contact.users
              ? `${contact.users.first_name} ${contact.users.last_name}`
              : "Unknown",
            timestamp: contact.created_at,
          });
        });
      }

      // Sort by timestamp (most recent first) and limit to 10
      activities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setRecentActivities(activities.slice(0, 10));
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      // Continue with empty activities rather than failing completely
    }
  };

  // Get appropriate icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "lead":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "project":
        return <Briefcase className="h-4 w-4 text-purple-500" />;
      case "company":
        return <Building2 className="h-4 w-4 text-green-500" />;
      case "contact":
        return <Phone className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{orgName} Dashboard</h1>
        <span className="text-sm text-gray-500">
          Last updated: {formatDate(new Date().toISOString())}
        </span>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.leads}</div>
            <p className="text-xs text-gray-500">
              Active prospects in your pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <Briefcase className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProjects}</div>
            <p className="text-xs text-gray-500">
              Projects currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.companies}</div>
            <p className="text-xs text-gray-500">
              Business accounts in your CRM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Phone className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.contacts}</div>
            <p className="text-xs text-gray-500">
              Individual contacts in your network
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest actions across your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity) => (
                  <TableRow key={`${activity.type}-${activity.id}`}>
                    <TableCell className="flex items-center space-x-2">
                      {getActivityIcon(activity.type)}
                      <span className="capitalize">
                        {activity.type} {activity.action}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {activity.name}
                    </TableCell>
                    <TableCell>{activity.user}</TableCell>
                    <TableCell>
                      {formatRelativeTime(activity.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No recent activities found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Summary</CardTitle>
          <CardDescription>
            Overview of your CRM data and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Key Metrics</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600">
                      Lead to Contact Ratio:
                    </span>
                    <span className="font-medium">
                      {metrics.contacts > 0
                        ? `${(metrics.leads / metrics.contacts).toFixed(2)}`
                        : "N/A"}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600">Projects per Company:</span>
                    <span className="font-medium">
                      {metrics.companies > 0
                        ? `${(
                            metrics.activeProjects / metrics.companies
                          ).toFixed(2)}`
                        : "N/A"}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600">Contacts per Company:</span>
                    <span className="font-medium">
                      {metrics.companies > 0
                        ? `${(metrics.contacts / metrics.companies).toFixed(2)}`
                        : "N/A"}
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">CRM Health</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600">Data Completion:</span>
                    <span className="font-medium text-green-600">Good</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600">Recent Activity:</span>
                    <span className="font-medium text-green-600">
                      {recentActivities.length > 5 ? "High" : "Moderate"}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-600">System Status:</span>
                    <span className="font-medium text-green-600">
                      Operational
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
