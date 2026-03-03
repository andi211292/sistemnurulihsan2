"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    // Exception for the login page itself
    if (pathname === "/login") {
      setIsAuthChecking(false);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login"); // Need to login
    } else {
      setIsAuthChecking(false); // Valid token exists
    }
  }, [pathname, router]);

  const isLogin = pathname === "/login";

  return (
    <html lang="id">
      <head>
        <title>Admin - Sistem Manajemen Pondok Pesantren Nurul Ihsan</title>
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 font-sans antialiased ${isLogin ? 'min-h-screen' : ''}`}>
        {isAuthChecking ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : isLogin ? (
          <>{children}</>
        ) : (
          <div className="flex min-h-screen print:block print:bg-white text-gray-900 font-sans antialiased">
            <div className="print:hidden">
              <Sidebar />
            </div>
            <div className="flex-1 ml-64 print:ml-0 flex flex-col min-h-screen print:min-h-0 pt-0">
              <div className="print:hidden">
                <Navbar />
              </div>
              <main className="p-8 print:p-0 print:m-0 flex-1 overflow-x-hidden print:overflow-visible">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
