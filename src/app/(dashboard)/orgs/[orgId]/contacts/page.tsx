"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { isValidEmail, formatPhoneNumber } from "@/lib/utils";

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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  User,
  Mail,
  Phone,
  Building,
  Star,
  Filter,
} from "lucide-react";
import Link from "next/link";

// Interfaces
interface Contact {
  contact_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  job_title: string | null;
  company_id: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

interface Company {
  company_id: string;
  name: string;
}

interface UserRole {
  role: string;
}

export default function ContactsPage() {
  const { orgId } = useParams();
  const searchParams = useSearchParams();
  const companyIdParam = searchParams.get("company_id");

  // State management
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string | null>(
    companyIdParam
  );
  const [processing, setProcessing] = useState(false);

  // Form state for new/edit contact
  const [currentContact, setCurrentContact] = useState<Partial<Contact>>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    job_title: "",
    company_id: companyIdParam || null,
    is_primary: false,
    notes: "",
  });

  // Contact to delete
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  // Check if user has permission based on role
  const hasPermission = (action: "create" | "read" | "update" | "delete") => {
    if (!userRole) return false;

    switch (action) {
      case "create":
        // All roles can create contacts
        return true;
      case "read":
        // All roles can read contacts
        return true;
      case "update":
      case "delete":
        // Only admin and manager can update/delete
        return userRole === "admin" || userRole === "manager";
      default:
        return false;
    }
  };

  // Fetch user role, contacts, and companies
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

          // Create a map of company IDs to names for easier lookup
          const companyMapping: Record<string, string> = {};
          (companiesData || []).forEach((company) => {
            companyMapping[company.company_id] = company.name;
          });
          setCompanyMap(companyMapping);
        }

        // Fetch contacts (optionally filtered by company)
        await fetchContacts();

        // If there's a company_id in the URL, open add dialog
        if (
          companyIdParam &&
          companyIdParam.length > 0 &&
          !isNaN(Number(companyIdParam))
        ) {
          setCurrentContact({
            ...currentContact,
            company_id: companyIdParam,
          });
          setIsAddDialogOpen(true);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, companyIdParam]);

  // Fetch contacts from the database
  const fetchContacts = async () => {
    try {
      let query = supabase
        .from(`org_${orgId}.contacts`)
        .select("*")
        .order("first_name");

      // Apply company filter if set
      if (companyFilter) {
        query = query.eq("company_id", companyFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
    }
  };

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((contact) => {
    return (
      searchQuery === "" ||
      `${contact.first_name} ${contact.last_name || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (contact.email &&
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.job_title &&
        contact.job_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.phone_number && contact.phone_number.includes(searchQuery)) ||
      (contact.company_id &&
        companyMap[contact.company_id] &&
        companyMap[contact.company_id]
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
    );
  });

  // Handle add/edit contact form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentContact.first_name) {
      toast.error("First name is required");
      return;
    }

    if (currentContact.email && !isValidEmail(currentContact.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setProcessing(true);

    try {
      if (currentContact.contact_id) {
        // Update existing contact
        const { error } = await supabase
          .from(`org_${orgId}.contacts`)
          .update({
            first_name: currentContact.first_name,
            last_name: currentContact.last_name || null,
            email: currentContact.email || null,
            phone_number: currentContact.phone_number || null,
            job_title: currentContact.job_title || null,
            company_id: currentContact.company_id || null,
            is_primary: currentContact.is_primary || false,
            notes: currentContact.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("contact_id", currentContact.contact_id);

        if (error) throw error;

        toast.success("Contact updated successfully");
        setIsEditDialogOpen(false);
      } else {
        // Add new contact
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error } = await supabase.from(`org_${orgId}.contacts`).insert({
          first_name: currentContact.first_name,
          last_name: currentContact.last_name || null,
          email: currentContact.email || null,
          phone_number: currentContact.phone_number || null,
          job_title: currentContact.job_title || null,
          company_id: currentContact.company_id || null,
          is_primary: currentContact.is_primary || false,
          notes: currentContact.notes || null,
          created_by: user?.id,
        });

        if (error) throw error;

        toast.success("Contact added successfully");
        setIsAddDialogOpen(false);
      }

      // Refresh contacts list
      await fetchContacts();

      // Reset form
      setCurrentContact({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        job_title: "",
        company_id: companyFilter || null,
        is_primary: false,
        notes: "",
      });
    } catch (error: any) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete contact
  const handleDelete = async () => {
    if (!contactToDelete) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from(`org_${orgId}.contacts`)
        .delete()
        .eq("contact_id", contactToDelete);

      if (error) throw error;

      toast.success("Contact deleted successfully");

      // Refresh contacts list
      await fetchContacts();

      // Reset state
      setContactToDelete(null);
      setIsDeleteAlertOpen(false);
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    } finally {
      setProcessing(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (contact: Contact) => {
    setCurrentContact(contact);
    setIsEditDialogOpen(true);
  };

  // Contact Form component to avoid duplication
  const ContactForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? "edit-" : ""}first-name`}>
            First Name *
          </Label>
          <Input
            id={`${isEdit ? "edit-" : ""}first-name`}
            value={currentContact.first_name}
            onChange={(e) =>
              setCurrentContact({
                ...currentContact,
                first_name: e.target.value,
              })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? "edit-" : ""}last-name`}>Last Name</Label>
          <Input
            id={`${isEdit ? "edit-" : ""}last-name`}
            value={currentContact.last_name || ""}
            onChange={(e) =>
              setCurrentContact({
                ...currentContact,
                last_name: e.target.value,
              })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? "edit-" : ""}email`}>Email</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}email`}
          type="email"
          value={currentContact.email || ""}
          onChange={(e) =>
            setCurrentContact({ ...currentContact, email: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? "edit-" : ""}phone`}>Phone Number</Label>
        <Input
          id={`${isEdit ? "edit-" : ""}phone`}
          value={currentContact.phone_number || ""}
          onChange={(e) =>
            setCurrentContact({
              ...currentContact,
              phone_number: e.target.value,
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? "edit-" : ""}job-title`}>Job Title</Label>
          <Input
            id={`${isEdit ? "edit-" : ""}job-title`}
            value={currentContact.job_title || ""}
            onChange={(e) =>
              setCurrentContact({
                ...currentContact,
                job_title: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? "edit-" : ""}company`}>Company</Label>
          <Select
            value={currentContact.company_id || ""}
            onValueChange={(value) =>
              setCurrentContact({
                ...currentContact,
                company_id: value === "" ? null : value,
              })
            }
          >
            <SelectTrigger id={`${isEdit ? "edit-" : ""}company`}>
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Company</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.company_id} value={company.company_id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id={`${isEdit ? "edit-" : ""}is-primary`}
          checked={currentContact.is_primary}
          onCheckedChange={(checked) =>
            setCurrentContact({
              ...currentContact,
              is_primary: checked as boolean,
            })
          }
        />
        <Label
          htmlFor={`${isEdit ? "edit-" : ""}is-primary`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Primary contact for company
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? "edit-" : ""}notes`}>Notes</Label>
        <Textarea
          id={`${isEdit ? "edit-" : ""}notes`}
          value={currentContact.notes || ""}
          onChange={(e) =>
            setCurrentContact({ ...currentContact, notes: e.target.value })
          }
          rows={3}
        />
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
                  <User className="mr-2 h-4 w-4" />
                  Add Contact
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
        <h1 className="text-3xl font-bold">Contacts</h1>

        {hasPermission("create") && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Fill in the details to add a new contact to your organization.
                </DialogDescription>
              </DialogHeader>

              <ContactForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
          <CardDescription>
            Manage your contact database and their company associations
          </CardDescription>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-64">
              <Select
                value={companyFilter || ""}
                onValueChange={(value) => {
                  setCompanyFilter(value === "" ? null : value);
                  // Update the filter and refetch contacts
                  setTimeout(() => fetchContacts(), 0);
                }}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by company" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Companies</SelectItem>
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
          </div>
        </CardHeader>

        <CardContent>
          {filteredContacts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Job Title</TableHead>
                    {hasPermission("update") && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.contact_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {contact.is_primary && (
                            <Star className="h-4 w-4 text-yellow-500 mr-1.5" />
                          )}
                          <Link
                            href={`/orgs/${orgId}/contacts/${contact.contact_id}`}
                            className="hover:underline text-blue-600 hover:text-blue-800"
                          >
                            {contact.first_name} {contact.last_name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          {contact.email && (
                            <div className="flex items-center py-0.5">
                              <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="hover:underline text-blue-600 hover:text-blue-800"
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone_number && (
                            <div className="flex items-center py-0.5">
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                              <a
                                href={`tel:${contact.phone_number}`}
                                className="hover:underline text-blue-600 hover:text-blue-800"
                              >
                                {formatPhoneNumber(contact.phone_number)}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.company_id ? (
                          <Link
                            href={`/orgs/${orgId}/companies/${contact.company_id}`}
                            className="inline-flex items-center hover:underline text-sm"
                          >
                            <Building className="mr-1 h-3.5 w-3.5" />
                            {companyMap[contact.company_id] ||
                              "Unknown Company"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{contact.job_title || "—"}</TableCell>

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
                                  onClick={() => handleEditClick(contact)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Contact</DialogTitle>
                                  <DialogDescription>
                                    Update the contact information
                                  </DialogDescription>
                                </DialogHeader>

                                <ContactForm isEdit />
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
                                      setContactToDelete(contact.contact_id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Contact
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this
                                      contact? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      onClick={() => setContactToDelete(null)}
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
                No contacts found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || companyFilter
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by adding your first contact"}
              </p>

              {hasPermission("create") && !(searchQuery || companyFilter) && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Contact
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
