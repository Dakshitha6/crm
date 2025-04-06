import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/verify-email",
  "/reset-password",
  "/forgot-password",
];

const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.some((route) => path.startsWith(route));
};

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Refresh session if exists
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Handle auth state
  if (!session && !isPublicRoute(request.nextUrl.pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (session) {
    // Check if email is verified for protected routes
    if (
      !session.user.email_verified &&
      !isPublicRoute(request.nextUrl.pathname)
    ) {
      return NextResponse.redirect(new URL("/verify-email", request.url));
    }

    // Redirect logged in users away from auth pages
    if (isPublicRoute(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/dashboard/orgs", request.url));
    }

    // Check organization access for org-specific routes
    if (request.nextUrl.pathname.includes("/orgs/")) {
      const orgId = request.nextUrl.pathname.split("/orgs/")[1]?.split("/")[0];
      if (orgId) {
        const { data: userOrg } = await supabase
          .from("user_organizations")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("organization_id", orgId)
          .single();

        if (!userOrg) {
          return NextResponse.redirect(new URL("/dashboard/orgs", request.url));
        }
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
