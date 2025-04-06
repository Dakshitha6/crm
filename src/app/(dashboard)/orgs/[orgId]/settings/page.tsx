"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDate, isValidEmail } from "@/lib/utils";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Building2,
  Users,
  Mail,
  UserPlus,
  UserMinus,
  Loader2,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Types
interface Organization {
  org_id: string;
  name: string;
  website: string | null;
  phone_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  organization_id: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  joined_at: string;
  is_current_user: boolean;
}

export default function OrganizationSettingsPage() {
  const { orgId } = useParams();

  // State
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invitingUser, setInvitingUser] = useState(false);

  // Organization form state
  const [editedOrg, setEditedOrg] = useState<Partial<Organization>>({});
  const [savingOrg, setSavingOrg] = useState(false);

  // Fetch organization data
  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!orgId) return;

      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("Failed to get current user");
        }

        setCurrentUserId(user.id);

        // Check if user is admin of this organization
        const { data: roleData, error: roleError } = await supabase
          .from("user_organizations")
          .select("role")
          .eq("organization_id", orgId)
          .eq("user_id", user.id)
          .single();

        if (roleError) {
          toast.error("You don't have access to this organization");
          throw new Error("User is not a member of this organization");
        }

        setIsAdmin(roleData.role === "admin");

        // Get organization details
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("org_id", orgId)
          .single();

        if (orgError) throw orgError;

        setOrganization(orgData);
        setEditedOrg(orgData); // Initialize form state with current values

        // Get organization members
        const { data: membersData, error: membersError } = await supabase
          .from("user_organizations")
          .select(
            `
            id,
            user_id,
            role,
            created_at,
            users (
              email,
              first_name,
              last_name
            )
          `
          )
          .eq("organization_id", orgId);

        if (membersError) throw membersError;

        // Format member data
        const formattedMembers = membersData.map((member) => ({
          id: member.id,
          user_id: member.user_id,
          first_name: member.users.first_name,
          last_name: member.users.last_name,
          email: member.users.email,
          role: member.role,
          joined_at: member.created_at,
          is_current_user: member.user_id === user.id,
        }));

        setMembers(formattedMembers);

        // Get pending invitations
        const { data: invitationsData, error: invitationsError } =
          await supabase
            .from("invitations")
            .select("*")
            .eq("organization_id", orgId)
            .eq("status", "pending");

        if (invitationsError) throw invitationsError;

        setInvitations(invitationsData);
      } catch (error: any) {
        console.error("Error fetching organization data:", error);
        toast.error("Failed to load organization data");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationData();
  }, [orgId]);

  // Check for expired invitations when loading and displaying
  useEffect(() => {
    // Check for and handle expired invitations
    const handleExpiredInvitations = async () => {
      if (!invitations.length) return;

      const now = new Date();
      const expiredInvitations = invitations.filter((inv) => {
        return new Date(inv.expires_at) < now && inv.status === "pending";
      });

      // Auto-reject expired invitations
      if (expiredInvitations.length > 0) {
        try {
          // Update all expired invitations to 'expired' status
          const { error } = await supabase
            .from("invitations")
            .update({ status: "expired" })
            .in(
              "id",
              expiredInvitations.map((inv) => inv.id)
            );

          if (error) throw error;

          // Update the invitations list in state
          setInvitations(
            invitations.map((inv) =>
              expiredInvitations.some((expired) => expired.id === inv.id)
                ? { ...inv, status: "expired" }
                : inv
            )
          );

          // Only show notification if there are expired invitations
          if (expiredInvitations.length > 0) {
            toast.info(
              `${expiredInvitations.length} invitation(s) have expired and been automatically marked as expired.`
            );
          }
        } catch (error: any) {
          console.error("Error handling expired invitations:", error);
        }
      }
    };

    handleExpiredInvitations();
  }, [invitations, supabase]);

  // Send invitation with improved error handling
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) return;

    if (!isValidEmail(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setInvitingUser(true);

      // Check if user is already a member
      const isMember = members.some((member) => member.email === inviteEmail);

      if (isMember) {
        toast.error("This user is already a member of the organization");
        return;
      }

      // Check if invitation already exists
      const invitationExists = invitations.some(
        (inv) => inv.email === inviteEmail && inv.status === "pending"
      );

      if (invitationExists) {
        toast.error("An invitation has already been sent to this email");
        return;
      }

      // Generate a unique token
      const token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Set expiration date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation
      const { data: invitation, error } = await supabase
        .from("invitations")
        .insert({
          email: inviteEmail,
          organization_id: organization.org_id,
          invited_by: currentUserId,
          role: inviteRole,
          status: "pending",
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: In a real app, send an email to the user with the invitation link

      // Add the new invitation to the state
      setInvitations([...invitations, invitation]);

      toast.success(`Invitation sent to ${inviteEmail}`);

      // Reset form
      setInviteEmail("");
      setInviteRole("member");
    } catch (error: any) {
      console.error("Error sending invitation:", error);

      if (
        error.message.includes("duplicate key") ||
        error.message.includes("unique constraint")
      ) {
        toast.error("An invitation for this email already exists");
      } else if (
        error.message.includes("permission denied") ||
        error.message.includes("not authorized")
      ) {
        toast.error("You don't have permission to send invitations");
      } else {
        toast.error("Failed to send invitation. Please try again.");
      }
    } finally {
      setInvitingUser(false);
    }
  };

  // Revoke invitation
  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      // Update invitation status to revoked
      const { error } = await supabase
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);

      if (error) throw error;

      // Remove the invitation from the state
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));

      toast.success("Invitation revoked successfully");
    } catch (error: any) {
      console.error("Error revoking invitation:", error);
      toast.error("Failed to revoke invitation");
    }
  };

  // Update member role
  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      // Find the member
      const member = members.find((m) => m.id === memberId);

      if (!member) return;

      // Don't allow changing role of the current user if they're an admin
      if (
        member.is_current_user &&
        member.role === "admin" &&
        newRole !== "admin"
      ) {
        toast.error("You cannot demote yourself from admin role");
        return;
      }

      // Update role in database
      const { error } = await supabase
        .from("user_organizations")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      // Update state
      setMembers(
        members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );

      toast.success("Member role updated successfully");
    } catch (error: any) {
      console.error("Error updating member role:", error);
      toast.error("Failed to update member role");
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    try {
      // Find the member
      const member = members.find((m) => m.id === memberId);

      if (!member) return;

      // Don't allow removing the current user if they're an admin
      if (member.is_current_user) {
        toast.error("You cannot remove yourself from the organization");
        return;
      }

      // Remove from database
      const { error } = await supabase
        .from("user_organizations")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      // Update state
      setMembers(members.filter((m) => m.id !== memberId));

      toast.success("Member removed successfully");
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  // Update organization details
  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) return;

    try {
      setSavingOrg(true);

      // Update organization in database
      const { error } = await supabase
        .from("organizations")
        .update({
          name: editedOrg.name,
          website: editedOrg.website,
          phone_number: editedOrg.phone_number,
          address: editedOrg.address,
          city: editedOrg.city,
          state: editedOrg.state,
          zip: editedOrg.zip,
          country: editedOrg.country,
        })
        .eq("org_id", organization.org_id);

      if (error) throw error;

      // Update state
      setOrganization({
        ...organization,
        ...editedOrg,
      });

      toast.success("Organization updated successfully");
    } catch (error: any) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization");
    } finally {
      setSavingOrg(false);
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

  if (!organization) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Organization Not Found</h1>
          <p>
            The organization you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-full">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">{organization.name} Settings</h1>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="mb-6">
          <TabsTrigger value="members" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Members & Invitations</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>General Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          {/* Invite Members Form */}
          {isAdmin && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Invite Members</CardTitle>
                <CardDescription>
                  Invite team members to join your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleInvite}
                  className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4"
                >
                  <div className="flex-1">
                    <Label htmlFor="email" className="sr-only">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <Label htmlFor="role" className="sr-only">
                      Role
                    </Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={invitingUser}
                    className="md:w-auto"
                  >
                    {invitingUser ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Pending Invitations</CardTitle>
                <CardDescription>
                  People who have been invited but haven't joined yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited On</TableHead>
                      <TableHead>Expires On</TableHead>
                      {isAdmin && (
                        <TableHead className="text-right">Action</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{invitation.email}</span>
                        </TableCell>
                        <TableCell className="capitalize">
                          {invitation.role}
                        </TableCell>
                        <TableCell>
                          {formatDate(invitation.created_at)}
                        </TableCell>
                        <TableCell>
                          {formatDate(invitation.expires_at)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRevokeInvitation(invitation.id)
                              }
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Members</CardTitle>
              <CardDescription>
                People who have access to this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined On</TableHead>
                    {isAdmin && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        {member.first_name && member.last_name
                          ? `${member.first_name} ${member.last_name}`
                          : "No name"}
                        {member.is_current_user && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {isAdmin && !member.is_current_user ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleUpdateMemberRole(member.id, value)
                            }
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="capitalize">{member.role}</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(member.joined_at)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {!member.is_current_user && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <UserMinus className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove Team Member
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove{" "}
                                    {member.email} from the organization? This
                                    action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleRemoveMember(member.id)
                                    }
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Details</CardTitle>
              <CardDescription>
                Manage your organization information
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateOrganization}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={editedOrg.name || ""}
                    onChange={(e) =>
                      setEditedOrg({ ...editedOrg, name: e.target.value })
                    }
                    placeholder="Organization name"
                    required
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={editedOrg.website || ""}
                    onChange={(e) =>
                      setEditedOrg({ ...editedOrg, website: e.target.value })
                    }
                    placeholder="https://www.example.com"
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={editedOrg.phone_number || ""}
                    onChange={(e) =>
                      setEditedOrg({
                        ...editedOrg,
                        phone_number: e.target.value,
                      })
                    }
                    placeholder="+1 (555) 123-4567"
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={editedOrg.address || ""}
                    onChange={(e) =>
                      setEditedOrg({ ...editedOrg, address: e.target.value })
                    }
                    placeholder="123 Main St"
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={editedOrg.city || ""}
                      onChange={(e) =>
                        setEditedOrg({ ...editedOrg, city: e.target.value })
                      }
                      placeholder="City"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={editedOrg.state || ""}
                      onChange={(e) =>
                        setEditedOrg({ ...editedOrg, state: e.target.value })
                      }
                      placeholder="State/Province"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP/Postal Code</Label>
                    <Input
                      id="zip"
                      value={editedOrg.zip || ""}
                      onChange={(e) =>
                        setEditedOrg({ ...editedOrg, zip: e.target.value })
                      }
                      placeholder="ZIP/Postal Code"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={editedOrg.country || ""}
                      onChange={(e) =>
                        setEditedOrg({ ...editedOrg, country: e.target.value })
                      }
                      placeholder="Country"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                {!isAdmin && (
                  <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                      <div>
                        <h4 className="font-medium text-yellow-800">
                          Admin privileges required
                        </h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          You need to be an admin to edit organization details.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              {isAdmin && (
                <CardFooter className="flex justify-end border-t pt-6">
                  <Button type="submit" disabled={savingOrg}>
                    {savingOrg ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
