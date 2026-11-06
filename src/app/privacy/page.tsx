import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy policy">
      <p>We collect only what we need to process and deliver your orders: your name, phone number, email and delivery address.</p>
      <h2>How we use your information</h2>
      <ul>
        <li>To deliver your order and contact you about it</li>
        <li>To show your order history when you’re logged in</li>
        <li>We never sell your personal information</li>
      </ul>
      <h2>Data storage</h2>
      <p>Your data is stored securely with our database provider. You can update your details any time from My account, or contact us to delete your account.</p>
    </InfoPage>
  );
}
