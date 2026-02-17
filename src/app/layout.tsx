import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutWithNav from "@/components/LayoutWithNav";
import { LiveProvider } from "@/contexts/LiveContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UsageProvider } from "@/contexts/UsageContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pinoy SG Billiards - Tournament Management",
  description: "Tournament management system for billiards competitions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body
        className={`${inter.variable} antialiased`}
      >
        <AuthProvider>
          <UsageProvider>
            <LiveProvider>
              <LayoutWithNav>{children}</LayoutWithNav>
            </LiveProvider>
          </UsageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
