import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "PCBDukaan – Industrial PCBs, Electronics & PCB Repair India",
    template: "%s | PCBDukaan",
  },
  description:
    "Industrial control boards, SMPS, VFD and motor-drive boards, PLC modules, load cells, sensors and power components — plus PCB repair. Shipped across India.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900 antialiased">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
