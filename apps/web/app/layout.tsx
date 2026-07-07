import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Nexus Career Ai Tracker — AI-Powered Internship Application Optimizer",
  description:
    "Analyze your CV against job descriptions, track applications with AI insights, and land your dream internship with Nexus Career Tracker.",
  keywords: ["internship", "AI", "CV analyzer", "ATS score", "job tracker", "career"],
  openGraph: {
    title: "Nexus Career Ai Tracker",
    description: "AI-powered internship application optimizer & tracker",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
