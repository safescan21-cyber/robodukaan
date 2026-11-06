import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Shipping & returns" };

export default function ShippingReturnsPage() {
  return (
    <InfoPage title="Shipping & returns">
      <h2>Shipping</h2>
      <ul>
        <li>Free shipping on orders of ₹499 or more; ₹49 below that.</li>
        <li>In-stock items marked “Ready to dispatch” ship within 24 hours on working days.</li>
        <li>Delivery usually takes 2–7 working days depending on your PIN code.</li>
        <li>You’ll get a courier tracking link once your order ships. You can also track it on the Track order page.</li>
      </ul>
      <h2>Returns &amp; replacements</h2>
      <ul>
        <li>If a product arrives damaged or defective, contact us within 7 days of delivery for a replacement.</li>
        <li>Please keep the original packaging and share photos or a short video of the issue.</li>
        <li>Components damaged by wrong wiring, soldering or over-voltage can’t be replaced.</li>
      </ul>
      <h2>Cancellations</h2>
      <p>You can cancel an order from <em>My account → My orders</em> until it is packed.</p>
    </InfoPage>
  );
}
