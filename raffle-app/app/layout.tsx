import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Food Safety Challenge Raffle",
  description: "Enterprise raffle management for the Food Safety Challenge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="bg-gradient-to-b from-primary/10 to-secondary-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
