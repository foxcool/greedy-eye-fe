import type { Metadata } from "next";
import {
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

// All four families load upfront; the active pair is picked by the
// data-style attribute via --ge-font-sans/--ge-font-mono in tokens.css.
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Greedy Eye",
  description: "Universal portfolio management platform",
};

// Applies the persisted UI style before first paint (same trick next-themes
// uses for the color scheme class). Runs as a blocking inline script.
const styleInitScript = `try{var s=localStorage.getItem('ge-style');if(s==='observatory'||s==='ledger'){document.documentElement.dataset.style=s}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-style="ledger"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: styleInitScript }} />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
