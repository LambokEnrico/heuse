"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatMoney, computeProductAvailability } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProductWithMeta {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string | null;
  price: unknown;
  categoryId: string | null;
  dropId: string | null;
  editionLimit: number;
  featured: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  images: { id: string; url: string }[];
  variants?: { stock: number }[];
  units?: { status: string }[];
  category: { id: string; name: string; slug: string } | null;
  drop: { id: string; name: string; slug: string } | null;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface DropItem {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  initialProducts: ProductWithMeta[];
  categories: CategoryItem[];
  drops: DropItem[];
}

export function ProductCatalog({ initialProducts, categories, drops }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products] = useState(initialProducts);

  const category = searchParams.get("category") || "";
  const drop = searchParams.get("drop") || "";
  const sort = searchParams.get("sort") || "newest";

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <section className="py-16 bg-heuse-dark border-b border-heuse-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-5xl md:text-6xl font-light text-center">Collection</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-12">
          <select
            className="bg-heuse-dark border border-heuse-border text-heuse-text px-4 py-2 text-sm focus:outline-none focus:border-heuse-gold"
            value={category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            className="bg-heuse-dark border border-heuse-border text-heuse-text px-4 py-2 text-sm focus:outline-none focus:border-heuse-gold"
            value={drop}
            onChange={(e) => handleFilterChange("drop", e.target.value)}
          >
            <option value="">All Drops</option>
            {drops.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            className="bg-heuse-dark border border-heuse-border text-heuse-text px-4 py-2 text-sm focus:outline-none focus:border-heuse-gold"
            value={sort}
            onChange={(e) => handleFilterChange("sort", e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="featured">Featured</option>
          </select>
        </div>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="text-center py-24">
            <h2 className="font-heading text-3xl mb-4">The next HEUSE drop is being tailored</h2>
            <p className="text-heuse-muted">Join the waitlist to be notified when new pieces are available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => {
              const availability = computeProductAvailability(
                product.variants ?? [],
                product.units ?? [],
                product.editionLimit
              );
              const isSoldOut = availability.status === "sold-out";

              return (
                <Link key={product.id} href={`/products/${product.slug}`} className="group">
                  <div className="relative aspect-[3/4] bg-heuse-dark overflow-hidden mb-4">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-heuse-muted">
                        No Image
                      </div>
                    )}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-heuse-black/60 flex items-center justify-center">
                        <Badge variant="destructive" className="text-sm px-4 py-2">
                          Sold Out
                        </Badge>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge variant="gold" className="text-xs">
                        {product.editionLimit} pieces
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {product.drop && (
                      <p className="text-heuse-gold text-xs uppercase tracking-widest">
                        {product.drop.name}
                      </p>
                    )}
                    <h3 className="font-heading text-xl group-hover:text-heuse-gold transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-heuse-text">{formatMoney(Number(product.price))}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}