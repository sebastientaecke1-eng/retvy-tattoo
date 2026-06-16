import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AppPreferencesProvider } from "@/components/providers/app-preferences-provider";
import { ThemeBootstrap } from "@/components/providers/theme-bootstrap";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Retvy — Tatouage & piercing, trouvez l'artiste idéal",
  description:
    "Marketplace de réservation pour tatoueurs et pierceurs en France. L'IA qualifie votre projet avant de vous proposer les pros adaptés.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth dark" suppressHydrationWarning>
      <head>
        <ThemeBootstrap />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-black dark:text-zinc-100`}
      >
        <AppPreferencesProvider>
          <Header />
          <main className="min-h-[calc(100vh-8rem)]">{children}</main>
          <Footer />
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
