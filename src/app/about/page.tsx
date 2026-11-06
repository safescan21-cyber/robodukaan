import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <InfoPage title="About RoboDukaan">
      <p>RoboDukaan is an online store for makers, students, hobbyists and engineers across India. We stock development boards, sensors, motors, drone parts, batteries, tools and DIY kits — everything you need to bring your project to life.</p>
      <h2>Why shop with us</h2>
      <ul>
        <li>Tested parts with clear specifications and datasheets</li>
        <li>Cash on delivery across India</li>
        <li>Free shipping on orders above ₹499</li>
        <li>Friendly help choosing the right components</li>
      </ul>
    </InfoPage>
  );
}
