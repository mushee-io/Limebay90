import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nosh — NFT Marketplace on Ultra",
  description: "Discover and own Ultra Uniqs through Nosh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
