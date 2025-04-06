import { redirect } from "next/navigation";

export default function AuthCatchAll({
  params,
}: {
  params: { auth?: string[] };
}) {
  // Redirect to the correct auth route in the (auth) group
  const path = params.auth ? `/${params.auth.join("/")}` : "";
  redirect(`/login${path}`);
  return null; // Add explicit return to satisfy TypeScript
}
