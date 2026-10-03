import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Polaris — GPS for your money",
  description:
    "Voice-guided financial navigation for college students. Nessie + Grok Voice + constellation goals.",
  openGraph: {
    title: "Polaris — A GPS for your money",
    description: "Voice-guided savings routes for students.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-night font-sans text-ink">
        <Providers>{children}</Providers>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
