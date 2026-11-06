export function SetupNotice() {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-6 text-amber-900">
      <p className="font-semibold">No products yet</p>
      <p className="mt-1 text-sm">
        The catalog is empty. Run <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code> and then{" "}
        <code className="rounded bg-amber-100 px-1">supabase/seed.sql</code> in the Supabase SQL Editor.
      </p>
    </div>
  );
}
