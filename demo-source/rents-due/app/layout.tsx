import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rents Due (demo)",
  description: "Track which apartment rents are paid and which are due.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browsers add their own attributes to <html> and <body> before React loads (Chrome on iPhone adds
    // __gcrremoteframetoken), so ignore attribute mismatches on these two elements only, not their children.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
