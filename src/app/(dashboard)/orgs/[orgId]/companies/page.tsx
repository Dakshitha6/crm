"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Building,
  ExternalLink,
  User,
} from "lucide-react";
import Link from "next/link";

// Interfaces
interface Company {
  company_id: string;
  name: string;
  industry: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone_number: string | null;
  created_at: string;
}

interface Contact {
  contact_id: string;
  first_name: string;
  last_name: string | null;
}

interface UserRole {
  role: string;
}

export default function CompaniesPage() {
  const { orgId } = useParams();

  // State management
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyContacts, setCompanyContacts] = useState<
    Record<string, Contact[]>
  >({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState(false);

  // Form state for new/edit company
  const [currentCompany, setCurrentCompany] = useState<Partial<Company>>({
    name: "",
    industry: "",
    website: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone_number: "",
  });

  // Company to delete
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

  // Check if user has permission based on role
  const hasPermission = (action: "create" | "read" | "update" | "delete") => {
    if (!userRole) return false;

    switch (action) {
      case "create":
        // All roles can create companies
        return true;
      case "read":
        // All roles can read companies
        return true;
      case "update":
      case "delete":
        // Only admin and manager can update/delete
        return userRole === "admin" || userRole === "manager";
      default:
        return false;
    }
  };

  // Fetch user role and companies
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

        // Fetch companies
        await fetchCompanies();
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId]);

  // Fetch companies from the database
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from(`org_${orgId}.companies`)
        .select("*")
        .order("name");

      if (error) throw error;

      setCompanies(data || []);

      // Fetch contacts for each company
      const contactsData: Record<string, Contact[]> = {};

      for (const company of data || []) {
        const { data: contacts, error: contactsError } = await supabase
          .from(`org_${orgId}.contacts`)
          .select("contact_id, first_name, last_name")
          .eq("company_id", company.company_id)
          .limit(5);

        if (!contactsError) {
          contactsData[company.company_id] = contacts || [];
        }
      }

      setCompanyContacts(contactsData);
    } catch (error: any) {
      console.error("Error fetching companies:", error);
      toast.error("Failed to load companies");
    }
  };

  // Filter companies based on search query
  const filteredCompanies = companies.filter((company) => {
    return (
      searchQuery === "" ||
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (company.industry &&
        company.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (company.city &&
        company.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (company.country &&
        company.country.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Handle add/edit company form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCompany.name) {
      toast.error("Company name is required");
      return;
    }

    setProcessing(true);

    try {
      if (currentCompany.company_id) {
        // Update existing company
        const { error } = await supabase
          .from(`org_${orgId}.companies`)
          .update({
            name: currentCompany.name,
            industry: currentCompany.industry || null,
            website: currentCompany.website || null,
            address: currentCompany.address || null,
            city: currentCompany.city || null,
            state: currentCompany.state || null,
            postal_code: currentCompany.postal_code || null,
            country: currentCompany.country || null,
            phone_number: currentCompany.phone_number || null,
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", currentCompany.company_id);

        if (error) throw error;

        toast.success("Company updated successfully");
        setIsEditDialogOpen(false);
      } else {
        // Add new company
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error } = await supabase.from(`org_${orgId}.companies`).insert({
          name: currentCompany.name,
          industry: currentCompany.industry || null,
          website: currentCompany.website || null,
          address: currentCompany.address || null,
          city: currentCompany.city || null,
          state: currentCompany.state || null,
          postal_code: currentCompany.postal_code || null,
          country: currentCompany.country || null,
          phone_number: currentCompany.phone_number || null,
          created_by: user?.id,
        });

        if (error) throw error;

        toast.success("Company added successfully");
        setIsAddDialogOpen(false);
      }

      // Refresh companies list
      await fetchCompanies();

      // Reset form
      setCurrentCompany({
        name: "",
        industry: "",
        website: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
        phone_number: "",
      });
    } catch (error: any) {
      console.error("Error saving company:", error);
      toast.error("Failed to save company");
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete company
  const handleDelete = async () => {
    if (!companyToDelete) return;

    setProcessing(true);

    try {
      // Check if company has contacts before deleting
      const { count, error: countError } = await supabase
        .from(`org_${orgId}.contacts`)
        .select("contact_id", { count: "exact", head: true })
        .eq("company_id", companyToDelete);

      if (countError) throw countError;

      if (count && count > 0) {
        // Confirm deletion with warning about contacts
        const confirmed = window.confirm(
          `This company has ${count} contacts that will also be deleted. Do you want to continue?`
        );

        if (!confirmed) {
          setProcessing(false);
          setCompanyToDelete(null);
          setIsDeleteAlertOpen(false);
          return;
        }
      }

      const { error } = await supabase
        .from(`org_${orgId}.companies`)
        .delete()
        .eq("company_id", companyToDelete);

      if (error) throw error;

      toast.success("Company deleted successfully");

      // Refresh companies list
      await fetchCompanies();

      // Reset state
      setCompanyToDelete(null);
      setIsDeleteAlertOpen(false);
    } catch (error: any) {
      console.error("Error deleting company:", error);
      toast.error("Failed to delete company");
    } finally {
      setProcessing(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (company: Company) => {
    setCurrentCompany(company);
    setIsEditDialogOpen(true);
  };

  // Format URL for display
  const formatUrl = (url: string | null) => {
    if (!url) return null;
    return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  };

  // Company Form component to avoid duplication
  const CompanyForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? "edit-" : ""}name`}>Company Name *</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}name`}
          value={currentCompany.name}
          onChange={(e) =>
            setCurrentCompany({ ...currentCompany, name: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? "edit-" : ""}industry`}>Industry</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}industry`}
          value={currentCompany.industry || ""}
          onChange={(e) =>
            setCurrentCompany({ ...currentCompany, industry: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? "edit-" : ""}website`}>Website</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}website`}
          value={currentCompany.website || ""}
          onChange={(e) =>
            setCurrentCompany({ ...currentCompany, website: e.target.value })
          }
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? "edit-" : ""}phone`}>Phone Number</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}phone`}
          value={currentCompany.phone_number || ""}
          onChange={(e) =>
            setCurrentCompany({
              ...currentCompany,
              phone_number: e.target.value,
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? "edit-" : ""}address`}>Address</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}address`}
          value={currentCompany.address || ""}
          onChange={(e) =>
            setCurrentCompany({ ...currentCompany, address: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? "edit-" : ""}city`}>City</Label>
          <Input
            id={`${isEdit ? "edit-" : ""}city`}
            value={currentCompany.city || ""}
            onChange={(e) =>
              setCurrentCompany({ ...currentCompany, city: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? "edit-" : ""}state`}>
            State/Province
          </Label>
          <Input
            id={`${isEdit ? "edit-" : ""}state`}
            value={currentCompany.state || ""}
            onChange={(e) =>
              setCurrentCompany({ ...currentCompany, state: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? "edit-" : ""}postal_code`}>
            Postal Code
          </Label>
          <Input
            id={`${isEdit ? "edit-" : ""}postal_code`}
            value={currentCompany.postal_code || ""}
            onChange={(e) =>
              setCurrentCompany({
                ...currentCompany,
                postal_code: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? "edit-" : ""}country`}>Country</Label>
          <Input
            id={`${isEdit ? "edit-" : ""}country`}
            value={currentCompany.country || ""}
            onChange={(e) =>
              setCurrentCompany({ ...currentCompany, country: e.target.value })
            }
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          type="button"
          onClick={() =>
            isEdit ? setIsEditDialogOpen(false) : setIsAddDialogOpen(false)
          }
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
              {isEdit ? (
                "Save Changes"
              ) : (
                <>
                  <Building className="mr-2 h-4 w-4" />
                  Add Company
                </>
              )}
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );

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
        <h1 className="text-3xl font-bold">Companies</h1>

        {hasPermission("create") && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
                <DialogDescription>
                  Fill in the details to add a new company to your organization.
                </DialogDescription>
              </DialogHeader>

              <CompanyForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>
            Manage your company database and their associated contacts
          </CardDescription>

          <div className="relative mt-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search companies..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredCompanies.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Contacts</TableHead>
                    {hasPermission("update") && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.company_id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/orgs/${orgId}/companies/${company.company_id}`}
                          className="hover:underline text-blue-600 hover:text-blue-800"
                        >
                          {company.name}
                        </Link>
                      </TableCell>
                      <TableCell>{company.industry || "—"}</TableCell>
                      <TableCell>
                        {[company.city, company.state, company.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        {company.website ? (
                          <a
                            href={
                              company.website.startsWith("http")
                                ? company.website
                                : `https://${company.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                          >
                            {formatUrl(company.website)}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {companyContacts[company.company_id]?.length > 0 ? (
                          <div className="flex flex-col">
                            {companyContacts[company.company_id].map(
                              (contact) => (
                                <Link
                                  key={contact.contact_id}
                                  href={`/orgs/${orgId}/contacts/${contact.contact_id}`}
                                  className="hover:underline text-sm flex items-center py-0.5"
                                >
                                  <User className="mr-1 h-3 w-3" />
                                  {contact.first_name} {contact.last_name}
                                </Link>
                              )
                            )}

                            <Link
                              href={`/orgs/${orgId}/companies/${company.company_id}/contacts`}
                              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                            >
                              View all contacts
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={`/orgs/${orgId}/contacts/new?company_id=${company.company_id}`}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            + Add contact
                          </Link>
                        )}
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
                                  onClick={() => handleEditClick(company)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Company</DialogTitle>
                                  <DialogDescription>
                                    Update the company information
                                  </DialogDescription>
                                </DialogHeader>

                                <CompanyForm isEdit />
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
                                      setCompanyToDelete(company.company_id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Company
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this
                                      company? This will also delete all
                                      contacts associated with this company.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      onClick={() => setCompanyToDelete(null)}
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
                No companies found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "Get started by adding your first company"}
              </p>

              {hasPermission("create") && !searchQuery && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Company
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
