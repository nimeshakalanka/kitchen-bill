import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Priya Dream Kitchen – Billing & Invoice",
  description:
    "Professional billing and invoice system for Priya Dream Kitchen, Sri Lankan Cooking Class, Weligama, Sri Lanka.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FBF7F0]">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="py-4 text-center text-xs text-[#8D6E63] border-t border-[#1B5E20]/5 bg-white/40">
          © {new Date().getFullYear()} Priya Dream Kitchen • Weligama, Sri Lanka
        </footer>
      </body>
    </html>
  );
}
