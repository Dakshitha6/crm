import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          // Update the response headers
          const response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
          return response;
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          // Update the response headers
          const response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
          return response;
        },
      },
    }
  );

  // Refresh the session if it exists
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  // Define paths that don't require authentication
  const publicPaths = ["/auth/login", "/auth/register", "/auth/verify-email"];
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname);

  // Specific paths for different auth states
  const loginPath = "/auth/login";
  const onboardingPath = "/auth/onboarding";
  const verifyEmailPath = "/auth/verify-email";
  const dashboardPath = "/dashboard/orgs";

  // Check if we have a session
  if (!session) {
    // If the user is not logged in and trying to access a protected route, redirect to login
    if (!isPublicPath) {
      const redirectUrl = new URL(loginPath, request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }
    // For public paths, allow access
    return NextResponse.next();
  }

  // User is logged in
  // Check if email is verified (for paths that require verification)
  const isEmailVerified = session.user?.email_confirmed_at;

  // If logged in and on a public path, redirect to the appropriate page
  if (isPublicPath) {
    // If email not verified, redirect to verification page
    if (!isEmailVerified && request.nextUrl.pathname !== verifyEmailPath) {
      const redirectUrl = new URL(verifyEmailPath, request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user is onboarded
    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("is_onboarded")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching user data:", error.message);
        // For database errors, we'll let the request proceed and handle errors in the UI
        return NextResponse.next();
      }

      // If user is not onboarded yet and not on the onboarding page, redirect to onboarding
      if (
        !userData?.is_onboarded &&
        request.nextUrl.pathname !== onboardingPath
      ) {
        const redirectUrl = new URL(onboardingPath, request.nextUrl.origin);
        return NextResponse.redirect(redirectUrl);
      }

      // If user is onboarded and on a public path, redirect to dashboard
      if (userData?.is_onboarded) {
        const redirectUrl = new URL(dashboardPath, request.nextUrl.origin);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error("Error in middleware:", error);
      // For unexpected errors, proceed and let the UI handle them
      return NextResponse.next();
    }
  }

  // For protected routes, check if email is verified
  if (!isEmailVerified) {
    const redirectUrl = new URL(verifyEmailPath, request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  // Check if user needs to complete onboarding
  try {
    const { data: userData, error } = await supabase
      .from("users")
      .select("is_onboarded")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching user data:", error.message);
      // For database errors, let the request proceed and handle errors in the UI
      return NextResponse.next();
    }

    // If user is not onboarded and not on the onboarding page, redirect to onboarding
    if (
      !userData?.is_onboarded &&
      request.nextUrl.pathname !== onboardingPath
    ) {
      const redirectUrl = new URL(onboardingPath, request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    // Otherwise, allow access to protected routes
    return NextResponse.next();
  } catch (error) {
    console.error("Error in middleware:", error);
    // For unexpected errors, proceed and let the UI handle them
    return NextResponse.next();
  }
}

// See https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public directory
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
