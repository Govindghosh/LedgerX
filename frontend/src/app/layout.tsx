import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SocketProvider } from "@/contexts/SocketContext";
import { CallProvider } from '@/contexts/CallContext';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LedgerX - Business Admin & Wallet Dashboard",
  description: "Production-grade business admin dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          <SocketProvider>
            <CallProvider>
              {children}
              <Toaster richColors position="top-right" />
            </CallProvider>
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
