import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  metadataBase,
  ogImage,
  pageDescription,
  pageTitle,
  person,
  portfolioPdfPath,
  siteName,
} from "./seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase,
  applicationName: siteName,
  title: {
    default: pageTitle,
    template: `%s | ${siteName}`,
  },
  description: pageDescription,
  authors: [{ name: person.name }],
  creator: person.name,
  publisher: person.name,
  keywords: [
    "Lennon Lee Hartmann",
    "Lennon Lee",
    "architecture portfolio",
    "architecture dossier",
    "architect Vienna",
    "architect Lustenau",
    "adaptive reuse",
    "competition design",
    "urban planning",
    "social housing",
    "urban housing",
    "cultural space",
    "stage design",
    "spatial planning",
    "Technical University of Vienna",
    "Metrics of Affection",
    "Yellow Brick Road",
    "Viertelhaus",
    "Studio Margarita",
  ],
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
    types: {
      "application/pdf": portfolioPdfPath,
    },
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/",
    siteName,
    type: "profile",
    locale: "en_US",
    firstName: "Lennon Lee",
    lastName: "Hartmann",
    username: "lennonleeh",
    emails: person.email,
    phoneNumbers: person.phone,
    images: [
      {
        url: ogImage.path,
        width: ogImage.width,
        height: ogImage.height,
        alt: ogImage.alt,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [
      {
        url: ogImage.path,
        alt: ogImage.alt,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "architecture portfolio",
  classification: "Architecture portfolio and dossier",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#101114",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
