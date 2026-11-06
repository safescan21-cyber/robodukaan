"use client";

import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm font-semibold text-brand-700 hover:underline">← Products</Link>
      <h1 className="text-2xl font-bold">Add product</h1>
      <ProductForm />
    </div>
  );
}
