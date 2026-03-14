import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hammock Earth — Cultivating Ecological Belonging",
  description:
    "A community dedicated to cultivating ecological belonging through shared experiences with land, food, and one another. Farm-to-table dinners, workshops, and retreats at Hammock Hills, Hillsdale, Ontario.",
  openGraph: {
    title: "Hammock Earth",
    description: "Cultivating fertile ground for people, land, and possibility.",
    url: "https://hammock.earth",
    siteName: "Hammock Earth",
    locale: "en_CA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
