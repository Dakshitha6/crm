"use client";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sign Out
    </Button>
  );
}
