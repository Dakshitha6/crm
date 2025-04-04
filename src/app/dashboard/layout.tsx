"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useAuthStore } from "@/state/auth";

// Icons
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Building,
  Settings,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  currentPath: string;
  onClick?: () => void;
}

const NavLink = ({ href, label, icon, currentPath, onClick }: NavLinkProps) => {
  const isActive = currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        isActive
          ? "bg-gray-100 text-blue-600"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`;
    } else if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 w-64 h-full bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            Swift CRM
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="px-4 py-6 space-y-1">
          <NavLink
            href="/dashboard"
            label="Dashboard"
            icon={<LayoutDashboard className="h-5 w-5" />}
            currentPath={pathname}
            onClick={closeSidebar}
          />
          <NavLink
            href="/dashboard/orgs"
            label="Organizations"
            icon={<Building className="h-5 w-5" />}
            currentPath={pathname}
            onClick={closeSidebar}
          />
          <NavLink
            href="/dashboard/users"
            label="Users"
            icon={<Users className="h-5 w-5" />}
            currentPath={pathname}
            onClick={closeSidebar}
          />
          <NavLink
            href="/dashboard/settings"
            label="Settings"
            icon={<Settings className="h-5 w-5" />}
            currentPath={pathname}
            onClick={closeSidebar}
          />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <SignOutButton variant="outline" className="w-full" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 border-b bg-white">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center ml-auto space-x-4">
            <div className="text-sm text-right mr-2">
              <div className="font-medium">
                {profile?.first_name
                  ? `${profile.first_name} ${profile.last_name || ""}`
                  : user?.email}
              </div>
              <div className="text-gray-500 text-xs">
                {profile?.job_title || "User"}
              </div>
            </div>

            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}
