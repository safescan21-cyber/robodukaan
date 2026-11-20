// Repair promises and review details you set in Admin → Repair promises (site_content key "repair_terms").
// Every field is empty by default and then simply not shown – the site never claims anything you didn't enter.
export type RepairExtras = {
  turnaround: string;        // e.g. "3–7 working days for most boards"
  evaluation: "" | "free" | "charged";
  evaluationCharge: string;  // e.g. "₹500, adjusted in the repair bill" (when evaluation = "charged")
  noFixNoFee: boolean;       // "No fix, no repair charge"
  pickup: string;            // e.g. "Courier pickup arranged anywhere in India"
  urgent: string;            // e.g. "Urgent repair in 24–48 hours (extra charge)"
  googleReviewUrl: string;   // the "write a review" link of your Google Business profile
  googleRating: string;      // e.g. "4.8" – exactly as shown on Google
  googleReviewCount: string; // e.g. "37"
};

export const EMPTY_EXTRAS: RepairExtras = {
  turnaround: "", evaluation: "", evaluationCharge: "", noFixNoFee: false, pickup: "", urgent: "",
  googleReviewUrl: "", googleRating: "", googleReviewCount: "",
};

const str = (v: unknown, max = 160) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function mergeExtras(v: Partial<RepairExtras> | null | undefined): RepairExtras {
  const x = v ?? {};
  const url = str(x.googleReviewUrl, 300);
  const rating = str(x.googleRating, 4);
  const count = str(x.googleReviewCount, 7);
  return {
    turnaround: str(x.turnaround),
    evaluation: x.evaluation === "free" || x.evaluation === "charged" ? x.evaluation : "",
    evaluationCharge: str(x.evaluationCharge),
    noFixNoFee: x.noFixNoFee === true,
    pickup: str(x.pickup),
    urgent: str(x.urgent),
    googleReviewUrl: /^https:\/\/(g\.page|maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|search\.google\.com)\//.test(url) ? url : "",
    googleRating: /^[1-5](\.\d)?$/.test(rating) ? rating : "",
    googleReviewCount: /^\d{1,6}$/.test(count) ? count : "",
  };
}
