import { prisma } from "@/lib/prisma";
import { formatMoney, computeProductAvailability } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collection",
  description: "Browse the HEUSE collection of limited-edition luxury menswear.",
};

interface Props {
  searchParams: Promise<{ category?: string; drop?: string; sort?: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { category, drop, sort = "newest" } = params;

  // Build where clause
  const where: any = { status: "PUBLISHED" };
  if (category) where.category = { slug: category };
  if (drop) where.drop = { slug: drop };

  // Build orderBy
  let orderBy: any = { createdAt: "desc" };
  if (sort === "price-asc") orderBy = { price: "asc" };
  if (sort === "price-desc") orderBy = { price: "desc" };
  if (sort === "featured") orderBy = { featured: "desc" };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { select: { stock: true } },
      units: { where: { status: "AVAILABLE" }, select: { status: true } },
      category: true,
      drop: true,
    },
  });

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const drops = await prisma.drop.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <section className="py-16 bg-heuse-dark border-b border-heuse-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-5xl md:text-6xl font-light text-center">Collection</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters - Using forms for progressive enhancement */}
        <form className="flex flex-wrap gap-4 mb-12">
          <div>
            <label htmlFor="category" className="sr-only">Category</label>
            <select
              id="category"
              name="category"
              className="bg-heuse-dark border border-heuse-border text-heuse-text px-4 py-2 text-sm focus:outline-none focus:border-heuse-gold"
              defaultValue={category || ""}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="drop" className="sr-only">Drop</label>
            <select
              id="drop"
              name="drop"
              className="bg-heuse-dark border border-heuse-border text-heuse-text px-4 py-2 text-sm focus:outline-none focus:border-heuse-gold"
              defaultValue={drop || ""}
            >
              <option value="">All Drops</option>
              {drops.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sort" className="sr-only">Sort</label>
            <select
              id="sort"
              name="sort"
              className="bg-heuse-dark border border-heuse-border text-heuse-text px-4 py-2 text-sm focus:outline-none focus:border-heuse-gold"
              defaultValue={sort}
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="featured">Featured</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-heuse-gold text-heuse-black px-4 py-2 text-sm uppercase tracking-wider hover:bg-[#e8c97a] transition-colors"
          >
            Filter
          </button>
        </form>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="text-center py-24">
            <h2 className="font-heading text-3xl mb-4">The next HEUSE drop is being tailored</h2>
            <p className="text-heuse-muted mb-8">Join the waitlist to be notified when new pieces are available.</p>
            <Link
              href="/contact"
              className="inline-block bg-heuse-gold text-heuse-black px-8 py-3 text-sm uppercase tracking-wider hover:bg-[#e8c97a] transition-colors"
            >
              Join Waitlist
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => {
              const availability = computeProductAvailability(
                product.variants,
                product.units,
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