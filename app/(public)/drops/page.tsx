import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drops | HEUSE",
  description: "Explore HEUSE limited edition drops and collections.",
};

export const dynamic = "force-dynamic";

export default async function DropsPage() {
  // Fetch all published drops with product count
  const drops = await prisma.drop.findMany({
    where: { published: true },
    include: {
      _count: {
        select: { products: true },
      },
      products: {
        where: { status: "PUBLISHED" },
        include: {
          images: {
            where: { sortOrder: 0 },
            take: 1,
          },
        },
        take: 4,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-heuse-gold text-sm uppercase tracking-widest mb-4">Collections</p>
        <h1 className="font-heading text-4xl md:text-5xl mb-4">Drops</h1>
        <p className="text-heuse-muted max-w-xl">
          Explore our limited edition drops. Each collection is released in limited quantities
          and will not be restocked.
        </p>
      </div>

      {/* Drops Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {drops.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-heuse-muted text-lg">No drops available at the moment.</p>
            <p className="text-heuse-muted mt-2">Check back soon for new releases.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {drops.map((drop) => (
              <section key={drop.id} className="relative">
                {/* Drop Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
                  <div>
                    <Badge variant="gold" className="mb-4">
                      {drop._count.products} Products
                    </Badge>
                    <Link href={`/drops/${drop.slug}`}>
                      <h2 className="font-heading text-3xl md:text-4xl hover:text-heuse-gold transition-colors">
                        {drop.name}
                      </h2>
                    </Link>
                    {drop.description && (
                      <p className="text-heuse-muted mt-2 max-w-xl">{drop.description}</p>
                    )}
                  </div>
                  {drop.startsAt && (
                    <p className="text-heuse-muted text-sm mt-2 md:mt-0">
                      Released {formatDate(drop.startsAt)}
                    </p>
                  )}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {drop.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className="group"
                    >
                      <div className="relative aspect-[3/4] bg-heuse-dark overflow-hidden mb-3">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-heuse-muted text-sm">
                            No Image
                          </div>
                        )}
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                      <h3 className="font-heading text-sm group-hover:text-heuse-gold transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-heuse-text text-sm mt-1">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(Number(product.price))}
                      </p>
                    </Link>
                  ))}
                </div>

                {/* View All Link */}
                <div className="mt-8 text-center">
                  <Link
                    href={`/drops/${drop.slug}`}
                    className="inline-block border border-heuse-border px-8 py-3 text-sm uppercase tracking-widest hover:border-heuse-gold hover:text-heuse-gold transition-colors"
                  >
                    View All {drop.name} Products
                  </Link>
                </div>

                {/* Separator */}
                {drops.indexOf(drop) < drops.length - 1 && (
                  <div className="mt-16 border-t border-heuse-border" />
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter CTA */}
      <div className="bg-heuse-dark py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl mb-4">Never Miss a Drop</h2>
          <p className="text-heuse-muted mb-8">
            Subscribe to get notified before everyone else.
          </p>
          <Link
            href="/#newsletter"
            className="inline-block bg-heuse-gold text-heuse-black px-8 py-3 text-sm uppercase tracking-widest hover:bg-[#c9a862] transition-colors"
          >
            Subscribe Now
          </Link>
        </div>
      </div>
    </div>
  );
}