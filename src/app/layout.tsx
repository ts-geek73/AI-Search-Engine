import type { Metadata } from "next";
import { ToastProvider } from "@/components/ToastProvider";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: "AI Search Engine",
  description: "Upload documents and chat to search through them",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable}`}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
