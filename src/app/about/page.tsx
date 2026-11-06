import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <InfoPage title="About PCBDukaan">
      <p>PCBDukaan supplies industrial electronics to factories, OEMs, panel builders and maintenance engineers across India. We stock control boards, SMPS and power supplies, VFD and motor-drive boards, PLC and I/O modules, load cells and weighing indicators, industrial sensors and power components — and we repair faulty industrial PCBs at component level.</p>
      <h2>Why shop with us</h2>
      <ul>
        <li>Tested parts with clear specifications and datasheets</li>
        <li>Cash on delivery across India</li>
        <li>Free shipping on orders above ₹499</li>
        <li>Component-level repair of inverter, SMPS, VFD, PLC and machine boards</li>
        <li>Help from engineers choosing the right replacement part</li>
      </ul>
    </InfoPage>
  );
}
