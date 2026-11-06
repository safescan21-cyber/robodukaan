import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xl font-extrabold text-white">
            Robo<span className="text-accent-400">Dukaan</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Robotics parts, electronic components and DIY kits for makers, students and engineers across India.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/category/development-boards" className="hover:text-white">Development boards</Link></li>
            <li><Link href="/category/sensors" className="hover:text-white">Sensors</Link></li>
            <li><Link href="/category/drone-parts" className="hover:text-white">Drone parts</Link></li>
            <li><Link href="/category/diy-kits" className="hover:text-white">DIY kits</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Help</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/track" className="hover:text-white">Track your order</Link></li>
            <li><Link href="/cart" className="hover:text-white">Your cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Why RoboDukaan</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>✓ Cash on delivery</li>
            <li>✓ Free shipping over ₹499</li>
            <li>✓ Tested, genuine parts</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-400">
        © RoboDukaan. All rights reserved.
      </div>
    </footer>
  );
}
