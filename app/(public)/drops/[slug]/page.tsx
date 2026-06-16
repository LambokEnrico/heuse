import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const drop = await prisma.drop.findUnique({
    where: { slug, published: true },
  });

  if (!drop) return { title: "Drop Not Found" };

  return {
    title: `${drop.name} | HEUSE`,
    description: drop.description || `Explore the ${drop.name} limited edition collection.`,
  };
}

export default async function DropDetailPage({ params }: Props) {
  const { slug } = await params;

  const drop = await prisma.drop.findUnique({
    where: { slug, published: true },
    include: {
      products: {
        where: { status: "PUBLISHED" },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          variants: { orderBy: { size: "asc" } },
          _count: { select: { units: true, orderItems: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!drop) {
    notFound();
  }

  // Calculate total available units
  const totalAvailable = drop.products.reduce(
    (sum, p) => sum + (p._count.units - p._count.orderItems),
    0
  );

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/drops"
          className="inline-flex items-center text-sm text-heuse-muted hover:text-heuse-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          All Drops
        </Link>
      </div>

      {/* Drop Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-3xl">
          <Badge variant="gold" className="mb-4">
            Limited Edition Collection
          </Badge>
          <h1 className="font-heading text-4xl md:text-6xl mb-4">{drop.name}</h1>
          {drop.description && (
            <p className="text-heuse-muted text-lg leading-relaxed">{drop.description}</p>
          )}
          {drop.startsAt && (
            <p className="text-heuse-muted text-sm mt-4">
              Released {formatDate(drop.startsAt)}
            </p>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {drop.products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-heuse-muted text-lg">No products in this drop yet.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex items-center gap-8 mb-12 pb-8 border-b border-heuse-border">
              <div>
                <p className="text-heuse-muted text-sm">Products</p>
                <p className="font-heading text-2xl">{drop.products.length}</p>
              </div>
              <div>
                <p className="text-heuse-muted text-sm">Available Pieces</p>
                <p className="font-heading text-2xl">{totalAvailable}</p>
              </div>
              <div>
                <p className="text-heuse-muted text-sm">Edition Size</p>
                <p className="font-heading text-2xl">Max 20 each</p>
              </div>
            </div>

            {/* Products */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {drop.products.map((product) => {
                const available = product._count.units - product._count.orderItems;
                const isSoldOut = available <= 0;

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-[3/4] bg-heuse-dark overflow-hidden mb-4">
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className={`object-cover group-hover:scale-105 transition-transform duration-700 ${
                            isSoldOut ? "opacity-60" : ""
                          }`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-heuse-muted text-sm">
                          No Image
                        </div>
                      )}
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      {/* Sold Out Badge */}
                      {isSoldOut && (
                        <div className="absolute top-4 left-4">
                          <Badge variant="destructive">Sold Out</Badge>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-2">
                      <h2 className="font-heading text-lg group-hover:text-heuse-gold transition-colors">
                        {product.name}
                      </h2>
                      <p className="text-heuse-text">{formatMoney(Number(product.price))}</p>
                      <p className="text-heuse-muted text-sm">
                        {isSoldOut ? (
                          "Sold out"
                        ) : available <= 5 ? (
                          <span className="text-heuse-gold">Only {available} left</span>
                        ) : (
                          `${available} available`
                        )}
                      </p>
                      {/* Available Sizes */}
                      {!isSoldOut && product.variants.length > 0 && (
                        <div className="flex gap-1 pt-2">
                          {product.variants
                            .filter((v) => v.stock > 0)
                            .map((variant) => (
                              <span
                                key={variant.id}
                                className="text-xs px-2 py-1 border border-heuse-border"
                              >
                                {variant.size}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Drop Story (if available) */}
      {drop.description && (
        <div className="bg-heuse-dark py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl mb-6">The Story</h2>
            <p className="text-heuse-muted leading-relaxed text-lg">{drop.description}</p>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl mb-4">Interested in This Drop?</h2>
          <p className="text-heuse-muted mb-8">
            Follow us on Instagram for drop announcements and behind-the-scenes content.
          </p>
          <a
            href="https://instagram.com/heuse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-heuse-gold text-heuse-black px-8 py-3 text-sm uppercase tracking-widest hover:bg-[#c9a862] transition-colors"
          >
            Follow @heuse
          </a>
        </div>
      </div>
    </div>
  );
}