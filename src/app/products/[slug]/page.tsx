import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct, getRelatedProducts } from "@/lib/data";
import { discountPercent, formatINR, FREE_SHIPPING_FROM, GST_RATE, gstFor, productImage } from "@/lib/format";
import { JsonLd } from "@/components/JsonLd";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pcbdukaan.com";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductRow, SectionHeading } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { Tabs } from "@/components/Tabs";
import { ProductReviews } from "@/components/ProductReviews";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButtons } from "@/components/ShareButtons";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Stars } from "@/components/Stars";

export async function generateMetadata(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  const image = productImage(product);
  const description = product.short_description ?? product.description?.slice(0, 155) ?? undefined;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: "website", title: product.name, description, url: `/products/${product.slug}`, images: image ? [image] : [{ url: "/og.png", width: 1200, height: 630 }] },
  };
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Suspense fallback={<div className="h-[480px] animate-pulse rounded-md bg-slate-100" />}>
        <ProductDetail params={props.params} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product, 10);
  const off = discountPercent(product.price, product.mrp);
  const specs = Object.entries(product.specs ?? {});
  const images = [...product.images, ...(product.image_url && !product.images.includes(product.image_url) ? [product.image_url] : [])];
  const icon = product.category?.icon ?? "chip";

  const tabs = [
    {
      id: "description",
      label: "Description",
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-700">
          <p className="whitespace-pre-line">{product.description || product.short_description || "No description yet."}</p>
          {specs.length > 0 && (
            <div>
              <p className="mb-2 font-semibold text-slate-900">Key features</p>
              <ul className="list-disc space-y-1 pl-5">
                {specs.slice(0, 6).map(([k, v]) => <li key={k}><span className="font-medium">{k}:</span> {String(v)}</li>)}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    ...(specs.length
      ? [{
          id: "specs",
          label: "Specifications",
          content: (
            <table className="w-full max-w-2xl text-sm">
              <tbody>
                {specs.map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="w-2/5 bg-slate-50 px-4 py-2 text-left font-medium text-slate-600">{k}</th>
                    <td className="px-4 py-2">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ),
        }]
      : []),
    ...(product.documents.length
      ? [{
          id: "docs",
          label: "Downloads",
          content: (
            <ul className="space-y-2 text-sm">
              {product.documents.map((d) => (
                <li key={d.url}>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline">
                    📄 {d.name}
                  </a>
                </li>
              ))}
            </ul>
          ),
        }]
      : []),
    ...(product.faqs.length
      ? [{
          id: "faqs",
          label: "FAQs",
          content: (
            <div className="space-y-2">
              {product.faqs.map((f, i) => (
                <details key={i} className="rounded border border-slate-200 p-3 text-sm">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2 text-slate-700">{f.a}</p>
                </details>
              ))}
            </div>
          ),
        }]
      : []),
    {
      id: "reviews",
      label: `Reviews (${product.rating_count})`,
      content: <ProductReviews productId={product.id} slug={product.slug} />,
    },
  ];

  const priceWithGst = Math.round((product.price + gstFor(product.price)) * 100) / 100;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.short_description ?? product.description ?? undefined,
    ...(images.length ? { image: images } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(product.category ? { category: product.category.name } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE}/products/${product.slug}`,
      priceCurrency: "INR",
      price: priceWithGst.toFixed(2),
      priceSpecification: { "@type": "UnitPriceSpecification", price: priceWithGst.toFixed(2), priceCurrency: "INR", valueAddedTaxIncluded: true },
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "PCBDukaan" },
    },
    ...(product.rating_count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating_avg.toFixed(1), reviewCount: product.rating_count } } : {}),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE}/products` },
      ...(product.category ? [{ "@type": "ListItem", position: 3, name: product.category.name, item: `${SITE}/category/${product.category.slug}` }] : []),
      { "@type": "ListItem", position: product.category ? 4 : 3, name: product.name, item: `${SITE}/products/${product.slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={schema} />
      <JsonLd data={breadcrumbs} />
      <Breadcrumbs
        items={[
          { label: "Shop", href: "/products" },
          ...(product.category ? [{ label: product.category.name, href: `/category/${product.category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 rounded-md bg-white p-4 ring-1 ring-slate-200 sm:p-6 lg:grid-cols-2">
        <ProductGallery images={images} videos={product.videos} icon={icon} name={product.name} />

        <div>
          <h1 className="text-2xl font-bold leading-snug text-slate-900">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {product.rating_count > 0 && <Stars value={product.rating_avg} count={product.rating_count} />}
            <span>SKU: <span className="text-slate-700">{product.sku}</span></span>
            {(product.hsn_code || product.category?.hsn_code) && <span>HSN: <span className="text-slate-700">{product.hsn_code || product.category?.hsn_code}</span></span>}
            {product.brand && <span>Brand: <span className="text-slate-700">{product.brand}</span></span>}
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-3 border-y border-slate-100 py-4">
            <span className="text-3xl font-extrabold text-brand-700">{formatINR(product.price)}</span>
            {product.mrp && product.mrp > product.price && (
              <>
                <span className="text-lg text-slate-500 line-through">{formatINR(product.mrp)}</span>
                <span className="rounded bg-red-600 px-2 py-0.5 text-sm font-bold text-white">{off}% OFF</span>
              </>
            )}
            <span className="w-full text-xs text-slate-500">
              Price excludes GST · <span className="font-semibold text-slate-700">{formatINR(product.price + gstFor(product.price))}</span> incl. {GST_RATE}% GST
            </span>
          </div>

          {product.short_description && <p className="mt-4 text-slate-700">{product.short_description}</p>}

          <ul className="mt-4 space-y-1 text-sm">
            <li className={product.stock > 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
              {product.stock > 10 ? "✓ In stock" : product.stock > 0 ? `⚠ Only ${product.stock} left in stock` : "✕ Out of stock"}
            </li>
            {product.stock > 0 && product.ready_to_dispatch && <li className="text-slate-600">⚡ Ready to dispatch — ships within 24 hours</li>}
            {product.warranty_months > 0 && <li className="text-slate-600">🛡 {product.warranty_months}-month warranty</li>}
          </ul>

          <div className="mt-5">
            <AddToCartButton product={product} withQuantity buyNow />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <WishlistButton productId={product.id} variant="full" />
            <ShareButtons name={product.name} path={`/products/${product.slug}`} />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-3 text-center text-xs text-slate-600">
            <div><p className="text-lg">🚚</p>Free shipping over {formatINR(FREE_SHIPPING_FROM)}</div>
            <div><p className="text-lg">💵</p>Cash on delivery</div>
            <div><p className="text-lg">🔁</p>7-day replacement</div>
          </div>

          {product.category && (
            <p className="mt-4 text-sm text-slate-500">
              Category: <Link href={`/category/${product.category.slug}`} className="text-brand-700 hover:underline">{product.category.name}</Link>
            </p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Tabs tabs={tabs} />
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <SectionHeading title="Related products" href={product.category ? `/category/${product.category.slug}` : undefined} />
          <ProductRow products={related} />
        </section>
      )}
    </>
  );
}
