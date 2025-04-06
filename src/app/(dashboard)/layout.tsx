"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useAuthStore } from "@/state/auth";
import { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useAuth } from "@/hooks/useAuth";

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

export const metadata: Metadata = {
  title: "Dashboard - CRM",
  description: "Dashboard for the CRM application",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize auth hook
  useAuth();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
