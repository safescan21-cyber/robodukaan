import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "RoboDukaan – Robotics & Electronics Store India",
    template: "%s | RoboDukaan",
  },
  description:
    "Buy development boards, sensors, motors, drone parts, batteries and DIY robotics kits online in India. Cash on delivery available.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
