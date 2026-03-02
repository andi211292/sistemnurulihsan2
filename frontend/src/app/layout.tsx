import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin - Sistem Manajemen Pondok Pesantren Nurul Ihsan",
  description: "Dasbor Administrasi Local-First",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-gray-50 text-gray-900 font-sans antialiased`}>
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
      </body>
    </html>
  );
}
