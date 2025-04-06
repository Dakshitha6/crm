import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Authentication - CRM",
  description: "Authentication pages for the CRM application",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Auth form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={48}
              height={48}
              className="h-12 w-auto"
            />
          </div>
          {children}
        </div>
      </div>

      {/* Right side - Background image */}
      <div className="hidden lg:block relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40" />
        <Image
          src="/auth-bg.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
