import type { Metadata } from "next";
import {
  Titillium_Web,
  Source_Code_Pro,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import { Providers } from "@/providers";
import { ToastContainer } from "@/components/data-terminal";
import "./globals.css";

const titilliumWeb = Titillium_Web({
  variable: "--font-titillium",
  subsets: ["latin"],
  weight: ["200", "300", "400", "600", "700"],
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const headingFont = Inter({
  variable: "--font-rigid-square",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  display: "swap",
});

const fontVars = `${titilliumWeb.variable} ${sourceCodePro.variable} ${jetbrainsMono.variable} ${headingFont.variable}`;

export const metadata: Metadata = {
  title: "Aleph Cloud Console",
  description: "Deploy and manage compute resources on the Aleph network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("aleph-console-theme");if(t&&["dark","light","contrast","warm","cool"].includes(t)){document.documentElement.classList.add("theme-"+t)}else{document.documentElement.classList.add("theme-dark")}}catch(e){document.documentElement.classList.add("theme-dark")}})()`,
          }}
        />
      </head>
      <body className={fontVars}>
          <Providers>
            {children}
            <ToastContainer />
          </Providers>
        </body>
    </html>
  );
}
