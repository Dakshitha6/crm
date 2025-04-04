"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { isValidEmail } from "@/lib/utils";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  UserPlus,
  Filter,
} from "lucide-react";

// Interfaces
interface Lead {
  lead_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  company_name: string | null;
  status: string;
  created_at: string;
  company_id: string | null;
}

interface Company {
  company_id: string;
  name: string;
}

interface UserRole {
  role: string;
}

export default function LeadsPage() {
  const { orgId } = useParams();

  // State management
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state for new/edit lead
  const [currentLead, setCurrentLead] = useState<Partial<Lead>>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    company_id: null,
    company_name: "",
    status: "new",
  });

  // Lead to delete
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Check if user has permission based on role
  const hasPermission = (action: "create" | "read" | "update" | "delete") => {
    if (!userRole) return false;

    switch (action) {
      case "create":
        // All roles can create leads
        return true;
      case "read":
        // All roles can read leads
        return true;
      case "update":
      case "delete":
        // Only admin and manager can update/delete
        return userRole === "admin" || userRole === "manager";
      default:
        return false;
    }
  };

  // Fetch user role, leads, and companies
  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) return;

      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("You must be logged in to view this page");
          return;
        }

        // Get user's role in this organization
        const { data: userData, error: userError } = await supabase
          .from("user_organizations")
          .select("role")
          .eq("organization_id", orgId)
          .eq("user_id", user.id)
          .single();

        if (userError) {
          console.error("Error fetching user role:", userError);
          toast.error("You don't have access to this organization");
          return;
        }

        setUserRole(userData.role);

        // Fetch leads
        await fetchLeads();

        // Fetch companies for the company dropdown
        const { data: companiesData, error: companiesError } = await supabase
          .from(`org_${orgId}.companies`)
          .select("company_id, name")
          .order("name");

        if (companiesError) {
          console.error("Error fetching companies:", companiesError);
          toast.error("Failed to load companies");
        } else {
          setCompanies(companiesData || []);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId]);

  // Fetch leads from the database
  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from(`org_${orgId}.leads`)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLeads(data || []);
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    }
  };

  // Filter leads based on search query and status filter
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      searchQuery === "" ||
      (lead.first_name + " " + lead.last_name)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (lead.email &&
        lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.company_name &&
        lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === null || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle add/edit lead form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentLead.first_name) {
      toast.error("First name is required");
      return;
    }

    if (currentLead.email && !isValidEmail(currentLead.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setProcessing(true);

    try {
      if (currentLead.lead_id) {
        // Update existing lead
        const { error } = await supabase
          .from(`org_${orgId}.leads`)
          .update({
            first_name: currentLead.first_name,
            last_name: currentLead.last_name || null,
            email: currentLead.email || null,
            phone_number: currentLead.phone_number || null,
            company_id: currentLead.company_id || null,
            company_name: currentLead.company_name || null,
            status: currentLead.status,
            updated_at: new Date().toISOString(),
          })
          .eq("lead_id", currentLead.lead_id);

        if (error) throw error;

        toast.success("Lead updated successfully");
        setIsEditDialogOpen(false);
      } else {
        // Add new lead
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error } = await supabase.from(`org_${orgId}.leads`).insert({
          first_name: currentLead.first_name,
          last_name: currentLead.last_name || null,
          email: currentLead.email || null,
          phone_number: currentLead.phone_number || null,
          company_id: currentLead.company_id || null,
          company_name: currentLead.company_name || null,
          status: currentLead.status || "new",
          created_by: user?.id,
        });

        if (error) throw error;

        toast.success("Lead added successfully");
        setIsAddDialogOpen(false);
      }

      // Refresh leads list
      await fetchLeads();

      // Reset form
      setCurrentLead({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        company_id: null,
        company_name: "",
        status: "new",
      });
    } catch (error: any) {
      console.error("Error saving lead:", error);
      toast.error("Failed to save lead");
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete lead
  const handleDelete = async () => {
    if (!leadToDelete) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from(`org_${orgId}.leads`)
        .delete()
        .eq("lead_id", leadToDelete);

      if (error) throw error;

      toast.success("Lead deleted successfully");

      // Refresh leads list
      await fetchLeads();

      // Reset state
      setLeadToDelete(null);
      setIsDeleteAlertOpen(false);
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    } finally {
      setProcessing(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (lead: Lead) => {
    // Find the company name from the company ID if it exists
    let companyName = lead.company_name || "";
    if (lead.company_id) {
      const company = companies.find((c) => c.company_id === lead.company_id);
      if (company) {
        companyName = company.name;
      }
    }

    setCurrentLead({
      ...lead,
      company_name: companyName,
    });
    setIsEditDialogOpen(true);
  };

  // Handle company selection
  const handleCompanySelect = (companyId: string) => {
    const selectedCompany = companies.find((c) => c.company_id === companyId);
    setCurrentLead({
      ...currentLead,
      company_id: companyId,
      company_name: selectedCompany ? selectedCompany.name : "",
    });
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    let bgColor = "bg-gray-100 text-gray-800";

    switch (status.toLowerCase()) {
      case "new":
        bgColor = "bg-blue-100 text-blue-800";
        break;
      case "contacted":
        bgColor = "bg-yellow-100 text-yellow-800";
        break;
      case "qualified":
        bgColor = "bg-green-100 text-green-800";
        break;
      case "lost":
        bgColor = "bg-red-100 text-red-800";
        break;
      case "won":
        bgColor = "bg-purple-100 text-purple-800";
        break;
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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
        <h1 className="text-3xl font-bold">Leads Management</h1>

        {hasPermission("create") && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new lead for your
                  organization.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name *</Label>
                    <Input
                      id="first-name"
                      value={currentLead.first_name}
                      onChange={(e) =>
                        setCurrentLead({
                          ...currentLead,
                          first_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      value={currentLead.last_name || ""}
                      onChange={(e) =>
                        setCurrentLead({
                          ...currentLead,
                          last_name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={currentLead.email || ""}
                    onChange={(e) =>
                      setCurrentLead({ ...currentLead, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={currentLead.phone_number || ""}
                    onChange={(e) =>
                      setCurrentLead({
                        ...currentLead,
                        phone_number: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={currentLead.company_id || ""}
                    onValueChange={handleCompanySelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem
                          key={company.company_id}
                          value={company.company_id}
                        >
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={currentLead.status || "new"}
                    onValueChange={(value) =>
                      setCurrentLead({ ...currentLead, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={processing}>
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Lead
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            Manage your potential customers and opportunities
          </CardDescription>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leads..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={statusFilter || ""}
                onValueChange={(value) =>
                  setStatusFilter(value === "" ? null : value)
                }
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    {hasPermission("update") && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.lead_id}>
                      <TableCell className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </TableCell>
                      <TableCell>{lead.email || "—"}</TableCell>
                      <TableCell>{lead.company_name || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>

                      {hasPermission("update") && (
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Dialog
                              open={isEditDialogOpen}
                              onOpenChange={setIsEditDialogOpen}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditClick(lead)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Lead</DialogTitle>
                                  <DialogDescription>
                                    Update the lead information
                                  </DialogDescription>
                                </DialogHeader>

                                <form
                                  onSubmit={handleSubmit}
                                  className="space-y-4 mt-4"
                                >
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-first-name">
                                        First Name *
                                      </Label>
                                      <Input
                                        id="edit-first-name"
                                        value={currentLead.first_name}
                                        onChange={(e) =>
                                          setCurrentLead({
                                            ...currentLead,
                                            first_name: e.target.value,
                                          })
                                        }
                                        required
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="edit-last-name">
                                        Last Name
                                      </Label>
                                      <Input
                                        id="edit-last-name"
                                        value={currentLead.last_name || ""}
                                        onChange={(e) =>
                                          setCurrentLead({
                                            ...currentLead,
                                            last_name: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="edit-email">Email</Label>
                                    <Input
                                      id="edit-email"
                                      type="email"
                                      value={currentLead.email || ""}
                                      onChange={(e) =>
                                        setCurrentLead({
                                          ...currentLead,
                                          email: e.target.value,
                                        })
                                      }
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="edit-phone">
                                      Phone Number
                                    </Label>
                                    <Input
                                      id="edit-phone"
                                      value={currentLead.phone_number || ""}
                                      onChange={(e) =>
                                        setCurrentLead({
                                          ...currentLead,
                                          phone_number: e.target.value,
                                        })
                                      }
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="edit-company">
                                      Company
                                    </Label>
                                    <Select
                                      value={currentLead.company_id || ""}
                                      onValueChange={handleCompanySelect}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a company" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="">
                                          No Company
                                        </SelectItem>
                                        {companies.map((company) => (
                                          <SelectItem
                                            key={company.company_id}
                                            value={company.company_id}
                                          >
                                            {company.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="edit-status">Status</Label>
                                    <Select
                                      value={currentLead.status}
                                      onValueChange={(value) =>
                                        setCurrentLead({
                                          ...currentLead,
                                          status: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="contacted">
                                          Contacted
                                        </SelectItem>
                                        <SelectItem value="qualified">
                                          Qualified
                                        </SelectItem>
                                        <SelectItem value="lost">
                                          Lost
                                        </SelectItem>
                                        <SelectItem value="won">Won</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      type="button"
                                      onClick={() => setIsEditDialogOpen(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                      {processing ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        "Save Changes"
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>

                            {hasPermission("delete") && (
                              <AlertDialog
                                open={isDeleteAlertOpen}
                                onOpenChange={setIsDeleteAlertOpen}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                    onClick={() =>
                                      setLeadToDelete(lead.lead_id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Lead
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this lead?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      onClick={() => setLeadToDelete(null)}
                                    >
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDelete}
                                      className="bg-red-600 text-white hover:bg-red-700"
                                      disabled={processing}
                                    >
                                      {processing ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        "Delete"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-24 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No leads found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by adding your first lead"}
              </p>

              {hasPermission("create") && !(searchQuery || statusFilter) && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Lead
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
