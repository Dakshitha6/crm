import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Swift CRM",
  description: "A modern CRM solution for growing businesses",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Toaster position="top-right" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
