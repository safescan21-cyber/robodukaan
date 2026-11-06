"use client";

export function OtpInput({ value, onChange, autoFocus = true }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      required
      minLength={6}
      maxLength={8}
      placeholder="••••••"
      aria-label="Verification code"
      className="mt-1 w-full rounded border border-slate-300 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
    />
  );
}
