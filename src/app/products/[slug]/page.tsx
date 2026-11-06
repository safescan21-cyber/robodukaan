import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct, getRelatedProducts } from "@/lib/data";
import { discountPercent, formatINR, FREE_SHIPPING_FROM } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGrid } from "@/components/ProductCard";

export async function generateMetadata(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  return product
    ? { title: product.name, description: product.short_description ?? undefined }
    : { title: "Product not found" };
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-slate-100" />}>
        <ProductDetail params={props.params} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product);
  const off = discountPercent(product.price, product.mrp);
  const specs = Object.entries(product.specs ?? {});

  return (
    <>
      <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        {product.category && (
          <>
            {" / "}
            <Link href={`/category/${product.category.slug}`} className="hover:text-brand-700">{product.category.name}</Link>
          </>
        )}
        {" / "}
        <span className="text-slate-700">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <ProductImage imageUrl={product.image_url} icon={product.category?.icon ?? "chip"} name={product.name} size="lg" />
        </div>

        <div>
          {product.brand && <p className="text-sm font-medium text-brand-700">{product.brand}</p>}
          <h1 className="mt-1 text-3xl font-bold leading-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-500">SKU: {product.sku}</p>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold">{formatINR(product.price)}</span>
            {product.mrp && product.mrp > product.price && (
              <>
                <span className="text-lg text-slate-400 line-through">{formatINR(product.mrp)}</span>
                <span className="rounded-md bg-accent-50 px-2 py-0.5 text-sm font-bold text-accent-600">{off}% off</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">Inclusive of all taxes</p>

          <p className={`mt-4 text-sm font-semibold ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
            {product.stock > 10 ? "In stock" : product.stock > 0 ? `Only ${product.stock} left` : "Out of stock"}
          </p>

          {product.short_description && <p className="mt-4 text-slate-700">{product.short_description}</p>}

          <div className="mt-6">
            <AddToCartButton product={product} withQuantity buyNow />
          </div>

          <ul className="mt-6 space-y-1.5 rounded-xl bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            <li>🚚 Free shipping on orders above {formatINR(FREE_SHIPPING_FROM)}</li>
            <li>💵 Cash on delivery available</li>
            <li>📦 Dispatched within 1–2 business days</li>
          </ul>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        {product.description && (
          <section className="lg:col-span-2">
            <h2 className="text-xl font-bold">Description</h2>
            <p className="mt-3 leading-relaxed text-slate-700">{product.description}</p>
          </section>
        )}
        {specs.length > 0 && (
          <section>
            <h2 className="text-xl font-bold">Specifications</h2>
            <table className="mt-3 w-full overflow-hidden rounded-xl bg-white text-sm ring-1 ring-slate-200">
              <tbody>
                {specs.map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="w-2/5 bg-slate-50 px-4 py-2 text-left font-medium text-slate-600">{k}</th>
                    <td className="px-4 py-2 text-slate-900">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-xl font-bold">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
