import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to the login page in the auth route group
  redirect("/login");
  return null; // Add explicit return to satisfy TypeScript
}
