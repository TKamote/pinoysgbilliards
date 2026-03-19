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
  metadataBase: new URL("https://pbs.tournatracker.com"),
  title: "Pinoy SG Billiards (PBS Cup) - Tournament Management",
  description: "Official tournament management system for Pinoy SG Billiards (PBS Cup). Track live scores, brackets, player stats, and billiards competitions in Singapore.",
  keywords: ["Pinoy SG Billiards", "PBS Cup", "Billiards Singapore", "Pool Tournament", "Live Scores", "Tournament Bracket", "Billiards Management"],
  openGraph: {
    title: "Pinoy SG Billiards (PBS Cup)",
    description: "Live brackets, scores, and tournament management for Pinoy SG Billiards.",
    url: "https://pbs.tournatracker.com",
    siteName: "Pinoy SG Billiards",
    images: [
      {
        url: "/PSGB_Logo_New.PNG",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_SG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/PSGB_Logo_New.PNG" type="image/png" />
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
