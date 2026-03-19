import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriScholar",
  description:
    "A credibility-first research assistant for verified source discovery, contradiction-aware synthesis, and Philippine-context literature work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full scroll-smooth antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
