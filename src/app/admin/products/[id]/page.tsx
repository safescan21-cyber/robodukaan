"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/types";

function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    getSupabase().from("products").select("*").eq("id", id).maybeSingle().then(({ data }) =>
      setProduct(data ? ({ ...data, price: Number(data.price), mrp: data.mrp == null ? null : Number(data.mrp) } as Product) : null),
    );
  }, [id]);

  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm font-semibold text-brand-700 hover:underline">← Products</Link>
      {product === undefined ? (
        <div className="h-96 animate-pulse rounded-md bg-slate-100" />
      ) : product === null ? (
        <p>Product not found.</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Edit: {product.name}</h1>
          <ProductForm product={product} />
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-slate-100" />}>
      <EditProductPage />
    </Suspense>
  );
}
