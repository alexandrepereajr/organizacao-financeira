import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from 'react'
import { AccountBar } from '@/components/AccountBar'
import { AppNav } from '@/components/AppNav'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Organização Financeira",
    template: "%s · Organização Financeira",
  },
  description: "Compras, cartões, faturas e entradas organizados mês a mês.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171a20" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AppNav />
        <Suspense fallback={null}>
          <AccountBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
