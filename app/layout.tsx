import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HEUSE — True Self, Tailored",
    template: "%s | HEUSE",
  },
  description:
    "HEUSE is a luxury menswear brand specializing in handmade limited-edition jacquard jackets and bombers. True Self, Tailored.",
  keywords: ["luxury menswear", "limited edition", "jacquard jacket", "premium fashion", "HEUSE"],
  authors: [{ name: "HEUSE" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://heuse.com",
    siteName: "HEUSE",
    title: "HEUSE — True Self, Tailored",
    description: "Luxury menswear brand specializing in handmade limited-edition jacquard jackets and bombers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HEUSE — True Self, Tailored",
    description: "Luxury menswear brand specializing in handmade limited-edition jacquard jackets and bombers.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-heuse-black text-heuse-text antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}