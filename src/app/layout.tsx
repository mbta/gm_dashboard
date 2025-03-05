import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'GM Dashboard',
  description: 'Your dashboard app with MapLibre support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
      </head>
      <body>{children}</body>
    </html>
  );
}