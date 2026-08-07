import type { Metadata } from "next";
import { Outfit, Architects_Daughter, Fredoka } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sketchFont = Architects_Daughter({
  weight: "400",
  variable: "--font-sketch",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  weight: ["600"],
  variable: "--font-bubble",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocQueue AI | Voice-First AI OPD Intake System",
  description: "Multilingual AI-Powered OPD Intake for Hospitals. Speak in Hindi, Punjabi, or English for instant symptom triaging and queue token generation.",
  keywords: ["DocQueue AI", "OPD Intake", "Voice AI Hospital", "Healthcare AI", "Token Queue", "Hindi Voice AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${sketchFont.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-neutral-900 font-sans selection:bg-red-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
