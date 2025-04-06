"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatDate, retryOperation, ensureUserRecord } from "@/lib/utils";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Search } from "lucide-react";

// Types
type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type Company = {
  company_id: string;
  name: string;
};

type Contact = {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_id: string;
};

type ContactProject = {
  contact_id: string;
  project_id: string;
  role: string;
  contact?: Contact;
};

type Project = {
  project_id: string;
  name: string;
  description: string;
  company_id: string;
  status: "Planning" | "In Progress" | "On Hold" | "Completed";
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string;
  assigned_user_name?: string;
};

type ProjectFormData = {
  name: string;
  description: string;
  company_id: string;
  status: "Planning" | "In Progress" | "On Hold" | "Completed";
  start_date: string;
  end_date: string;
  assigned_to: string;
};

type StatusCounts = {
  Planning: number;
  "In Progress": number;
  "On Hold": number;
  Completed: number;
};

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    Planning: 0,
    "In Progress": 0,
    "On Hold": 0,
    Completed: 0,
  });

  // State for modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formProcessing, setFormProcessing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectContacts, setProjectContacts] = useState<ContactProject[]>([]);

  // State for form
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    company_id: "",
    status: "Planning",
    start_date: "",
    end_date: "",
    assigned_to: "",
  });

  // Handlers for project actions
  const handleViewProject = async (project: Project) => {
    setSelectedProject(project);
    await fetchProjectContacts(project.project_id);
    setIsViewOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      company_id: project.company_id || "",
      status: project.status,
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      assigned_to: project.assigned_to || "",
    });
    setIsEditOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteOpen(true);
  };

  const handleAddNewClick = () => {
    setFormData({
      name: "",
      description: "",
      company_id: "",
      status: "Planning",
      start_date: "",
      end_date: "",
      assigned_to: "",
    });
    setIsAddOpen(true);
  };

  // Fetch project contacts
  const fetchProjectContacts = async (projectId: string) => {
    const { data, error } = await supabase
      .from("contact_projects")
      .select(
        `
        *,
        contacts:contact_id (
          contact_id,
          first_name,
          last_name,
          email,
          company_id
        )
      `
      )
      .eq("project_id", projectId);

    if (error) {
      console.error("Error fetching project contacts:", error);
      toast.error("Failed to load project contacts");
      return;
    }

    setProjectContacts(data);
  };

  // Fetch projects and related data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user role for permission checks
        await fetchUserRole();

        // Fetch projects, companies, and users
        await Promise.all([fetchProjects(), fetchCompanies(), fetchUsers()]);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load projects data");
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId]);

  // Fetch user role with error handling
  const fetchUserRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Use retry operation for network resilience
      await retryOperation(async () => {
        // First ensure the user record exists
        const userRecordExists = await ensureUserRecord(
          supabase,
          user.id,
          user.email as string,
          !!user.email_confirmed_at
        );

        if (!userRecordExists) {
          toast.error(
            "Error accessing your user profile. Please try refreshing the page."
          );
          return;
        }

        // Now get the user role
        const { data, error } = await supabase
          .from("user_organizations")
          .select("role")
          .eq("user_id", user.id)
          .eq("organization_id", orgId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // User doesn't have access to this org
            toast.error("You don't have access to this organization", {
              action: {
                label: "Go to Dashboard",
                onClick: () => router.push("/orgs"),
              },
            });
            return;
          }
          throw error;
        }

        setUserRole(data.role);
      });
    } catch (error) {
      console.error("Error fetching user role:", error);
      toast.error("Error checking your permissions. Please try again.");
    }
  };

  // Fetch projects with retry mechanism
  const fetchProjects = async () => {
    try {
      // Use retryOperation for network resilience
      const data = await retryOperation(async () => {
        // Query organization-specific schema for projects with joins to get company name and assigned user
        const { data, error } = await supabase
          .from(`projects`)
          .select(
            `
            *,
            companies!projects_company_id_fkey (name),
            users!projects_assigned_to_fkey (first_name, last_name)
          `
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data;
      });

      // Transform the data to fit our Project type
      const transformedProjects = data.map((project) => ({
        ...project,
        company_name: project.companies ? project.companies.name : "N/A",
        assigned_user_name: project.users
          ? `${project.users.first_name} ${project.users.last_name}`
          : "Unassigned",
      }));

      setProjects(transformedProjects);
      calculateStatusCounts(transformedProjects);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects", {
        action: {
          label: "Retry",
          onClick: () => fetchProjects(),
        },
      });
    }
  };

  // Fetch companies
  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from(`companies`)
      .select("company_id, name")
      .order("name");

    if (error) {
      console.error("Error fetching companies:", error);
      toast.error("Failed to load companies");
      return;
    }

    setCompanies(data);
  };

  // Fetch users
  const fetchUsers = async () => {
    // Get all users who are members of this organization
    const { data, error } = await supabase
      .from("user_organizations")
      .select(
        `
        user_id,
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `
      )
      .eq("organization_id", orgId);

    if (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load organization users");
      return;
    }

    // Transform data to get just the user info
    const transformedUsers = data.map((item) => item.users);
    setUsers(transformedUsers);
  };

  // Count projects by status
  const calculateStatusCounts = (projectsData: Project[]) => {
    const counts = {
      Planning: 0,
      "In Progress": 0,
      "On Hold": 0,
      Completed: 0,
    };

    projectsData.forEach((project) => {
      if (project.status in counts) {
        counts[project.status]++;
      }
    });

    setStatusCounts(counts);
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description &&
        project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Add new project
  const handleAddProject = async () => {
    try {
      // Validate form data
      if (!formData.name.trim()) {
        toast.error("Project name is required");
        return;
      }

      // If start date and end date are provided, validate end date is after start date
      if (
        formData.start_date &&
        formData.end_date &&
        new Date(formData.start_date) > new Date(formData.end_date)
      ) {
        toast.error("End date must be after start date");
        return;
      }

      setFormProcessing(true);

      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add a project");
        setFormProcessing(false);
        return;
      }

      // Insert project into the projects table
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: formData.name,
          description: formData.description,
          company_id: formData.company_id || null,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          assigned_to: formData.assigned_to || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding project:", error);
        toast.error("Failed to add project");
        setFormProcessing(false);
        return;
      }

      toast.success("Project added successfully");
      setIsAddOpen(false);
      setFormProcessing(false);

      // Refresh the projects list
      fetchProjects();
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error("Failed to add project");
      setFormProcessing(false);
    }
  };

  // Update existing project
  const handleUpdateProject = async () => {
    try {
      // Validate form data
      if (!formData.name.trim()) {
        toast.error("Project name is required");
        return;
      }

      // If start date and end date are provided, validate end date is after start date
      if (
        formData.start_date &&
        formData.end_date &&
        new Date(formData.start_date) > new Date(formData.end_date)
      ) {
        toast.error("End date must be after start date");
        return;
      }

      if (!selectedProject) {
        toast.error("No project selected for update");
        return;
      }

      setFormProcessing(true);

      // Update project in the projects table
      const { error } = await supabase
        .from("projects")
        .update({
          name: formData.name,
          description: formData.description,
          company_id: formData.company_id || null,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          assigned_to: formData.assigned_to || null,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", selectedProject.project_id);

      if (error) {
        console.error("Error updating project:", error);
        toast.error("Failed to update project");
        setFormProcessing(false);
        return;
      }

      toast.success("Project updated successfully");
      setIsEditOpen(false);
      setFormProcessing(false);
      setSelectedProject(null);

      // Refresh the projects list
      fetchProjects();
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
      setFormProcessing(false);
    }
  };

  // Delete project
  const handleConfirmDelete = async () => {
    if (!selectedProject) {
      toast.error("No project selected for deletion");
      return;
    }

    setFormProcessing(true);

    try {
      // Delete project from the projects table
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("project_id", selectedProject.project_id);

      if (error) {
        console.error("Error deleting project:", error);
        toast.error("Failed to delete project");
        setFormProcessing(false);
        return;
      }

      toast.success("Project deleted successfully");
      setIsDeleteOpen(false);
      setFormProcessing(false);
      setSelectedProject(null);

      // Refresh the projects list
      fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
      setFormProcessing(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planning</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.Planning}</div>
            <p className="text-xs text-muted-foreground">
              Projects in planning phase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusCounts["In Progress"]}
            </div>
            <p className="text-xs text-muted-foreground">
              Active projects currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts["On Hold"]}</div>
            <p className="text-xs text-muted-foreground">
              Projects temporarily paused
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.Completed}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <div className="rounded-md border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="h-8 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchQuery
                      ? "No projects match your search"
                      : "No projects found. Add one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.project_id}>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>
                      {project.description
                        ? project.description.length > 50
                          ? `${project.description.substring(0, 50)}...`
                          : project.description
                        : "No description"}
                    </TableCell>
                    <TableCell>{project.company_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            project.status === "Planning"
                              ? "bg-blue-500"
                              : project.status === "In Progress"
                              ? "bg-green-500"
                              : project.status === "On Hold"
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                          }`}
                        />
                        {project.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.start_date
                        ? new Date(project.start_date).toLocaleDateString()
                        : "Not set"}
                    </TableCell>
                    <TableCell>
                      {project.end_date
                        ? new Date(project.end_date).toLocaleDateString()
                        : "Not set"}
                    </TableCell>
                    <TableCell>{project.assigned_user_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProject(project)}
                        >
                          View
                        </Button>

                        {(userRole === "admin" || userRole === "manager") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProject(project)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteProject(project)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Project Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>
              Create a new project for your organization. Fill in the details
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter project description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) =>
                  handleSelectChange("company_id", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    handleSelectChange(
                      "status",
                      value as
                        | "Planning"
                        | "In Progress"
                        | "On Hold"
                        | "Completed"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) =>
                    handleSelectChange("assigned_to", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={formProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleAddProject} disabled={formProcessing}>
              {formProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the project details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                placeholder="Enter project description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-company">Company</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) =>
                  handleSelectChange("company_id", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-start_date">Start Date</Label>
                <Input
                  id="edit-start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end_date">End Date</Label>
                <Input
                  id="edit-end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    handleSelectChange(
                      "status",
                      value as
                        | "Planning"
                        | "In Progress"
                        | "On Hold"
                        | "Completed"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-assigned_to">Assigned To</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) =>
                    handleSelectChange("assigned_to", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={formProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateProject} disabled={formProcessing}>
              {formProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Update Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project
              {selectedProject ? ` "${selectedProject.name}"` : ""}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={formProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {formProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Project Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProject.name}</DialogTitle>
                <DialogDescription>
                  Project details and assigned contacts
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="contacts">Assigned Contacts</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Status
                      </h4>
                      <div className="mt-1 flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            selectedProject.status === "Planning"
                              ? "bg-blue-500"
                              : selectedProject.status === "In Progress"
                              ? "bg-green-500"
                              : selectedProject.status === "On Hold"
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                          }`}
                        />
                        {selectedProject.status}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Start Date
                      </h4>
                      <p className="mt-1">
                        {selectedProject.start_date
                          ? new Date(
                              selectedProject.start_date
                            ).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        End Date
                      </h4>
                      <p className="mt-1">
                        {selectedProject.end_date
                          ? new Date(
                              selectedProject.end_date
                            ).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Description
                    </h4>
                    <p className="mt-1">
                      {selectedProject.description || "No description provided"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Company
                      </h4>
                      <p className="mt-1">{selectedProject.company_name}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Assigned To
                      </h4>
                      <p className="mt-1">
                        {selectedProject.assigned_user_name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Created
                      </h4>
                      <p className="mt-1">
                        {new Date(selectedProject.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Last Updated
                      </h4>
                      <p className="mt-1">
                        {new Date(selectedProject.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="mt-4">
                  <ProjectContacts
                    projectId={selectedProject.project_id}
                    projectContacts={projectContacts}
                    fetchProjectContacts={fetchProjectContacts}
                    orgId={orgId}
                    userRole={userRole}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
                {(userRole === "admin" || userRole === "manager") && (
                  <Button
                    onClick={() => {
                      setIsViewOpen(false);
                      handleEditProject(selectedProject);
                    }}
                  >
                    Edit Project
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for managing contacts assigned to a project
function ProjectContacts({
  projectId,
  projectContacts,
  fetchProjectContacts,
  orgId,
  userRole,
}: {
  projectId: string;
  projectContacts: ContactProject[];
  fetchProjectContacts: (projectId: string) => Promise<void>;
  orgId: string;
  userRole: string;
}) {
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("Team Member");

  // Fetch all contacts for the organization
  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .order("first_name, last_name");

        if (error) {
          throw error;
        }

        setAvailableContacts(data || []);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        toast.error("Failed to load contacts");
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [supabase, orgId]);

  // Filter out contacts that are already assigned to the project
  const unassignedContacts = availableContacts.filter(
    (contact) =>
      !projectContacts.some((pc) => pc.contact_id === contact.contact_id)
  );

  // Handle assigning a contact to the project
  const handleAssignContact = async () => {
    if (!selectedContactId) {
      toast.error("Please select a contact");
      return;
    }

    try {
      setLoading(true);

      // Insert into the contact_projects junction table
      const { error } = await supabase.from("contact_projects").insert({
        contact_id: selectedContactId,
        project_id: projectId,
        role: selectedRole,
      });

      if (error) {
        throw error;
      }

      toast.success("Contact assigned to project");
      setSelectedContactId("");
      setSelectedRole("Team Member");

      // Refresh the contacts list
      await fetchProjectContacts(projectId);
    } catch (error) {
      console.error("Error assigning contact:", error);
      toast.error("Failed to assign contact");
    } finally {
      setLoading(false);
    }
  };

  // Handle removing a contact from the project
  const handleRemoveContact = async (contactId: string) => {
    try {
      setLoading(true);

      // Delete from the contact_projects junction table
      const { error } = await supabase
        .from("contact_projects")
        .delete()
        .eq("contact_id", contactId)
        .eq("project_id", projectId);

      if (error) {
        throw error;
      }

      toast.success("Contact removed from project");

      // Refresh the contacts list
      await fetchProjectContacts(projectId);
    } catch (error) {
      console.error("Error removing contact:", error);
      toast.error("Failed to remove contact");
    } finally {
      setLoading(false);
    }
  };

  const isEditable = userRole === "admin" || userRole === "manager";

  return (
    <div className="space-y-4">
      {isEditable && (
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
          <div className="flex-1">
            <Label htmlFor="contact">Contact</Label>
            <Select
              value={selectedContactId}
              onValueChange={setSelectedContactId}
              disabled={loading || unassignedContacts.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a contact" />
              </SelectTrigger>
              <SelectContent>
                {unassignedContacts.length === 0 ? (
                  <SelectItem value="no-contacts" disabled>
                    No available contacts
                  </SelectItem>
                ) : (
                  unassignedContacts.map((contact) => (
                    <SelectItem
                      key={contact.contact_id}
                      value={contact.contact_id}
                    >
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Project Manager">Project Manager</SelectItem>
                <SelectItem value="Developer">Developer</SelectItem>
                <SelectItem value="Designer">Designer</SelectItem>
                <SelectItem value="Business Analyst">
                  Business Analyst
                </SelectItem>
                <SelectItem value="QA Tester">QA Tester</SelectItem>
                <SelectItem value="Team Member">Team Member</SelectItem>
                <SelectItem value="Stakeholder">Stakeholder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleAssignContact}
              disabled={loading || !selectedContactId}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Assign
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {isEditable && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectContacts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isEditable ? 4 : 3}
                  className="text-center py-8 text-muted-foreground"
                >
                  No contacts assigned to this project
                </TableCell>
              </TableRow>
            ) : (
              projectContacts.map((contactProject) => (
                <TableRow key={contactProject.contact_id}>
                  <TableCell>
                    {contactProject.contact
                      ? `${contactProject.contact.first_name} ${contactProject.contact.last_name}`
                      : "Unknown Contact"}
                  </TableCell>
                  <TableCell>
                    {contactProject.contact?.email || "N/A"}
                  </TableCell>
                  <TableCell>{contactProject.role}</TableCell>
                  {isEditable && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() =>
                          handleRemoveContact(contactProject.contact_id)
                        }
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
