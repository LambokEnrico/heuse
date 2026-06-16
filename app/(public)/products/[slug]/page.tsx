import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, computeProductAvailability } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BuyNowButton } from "@/components/public/buy-now-button";
import { ProductGallery } from "@/components/public/product-gallery";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  if (!product) return { title: "Product Not Found" };

  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: `${product.name} | HEUSE`,
      description: product.shortDescription,
      images: product.images[0] ? [{ url: product.images[0].url }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { size: "asc" } },
      units: { where: { status: "AVAILABLE" } },
      drop: true,
      category: true,
    },
  });

  if (!product) notFound();

  // Calculate availability — variants.stock is the primary source
  const availabilityInfo = computeProductAvailability(
    product.variants,
    product.units,
    product.editionLimit
  );
  const availability = availabilityInfo.status;

  // Related products
  const relatedProducts = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: product.id },
      OR: [{ categoryId: product.categoryId }, { dropId: product.dropId }].filter(Boolean) as any,
    },
    take: 4,
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/products"
          className="inline-flex items-center text-sm text-heuse-muted hover:text-heuse-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collection
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Gallery */}
          <ProductGallery images={product.images} productName={product.name} />

          {/* Product Info */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-8">
            {/* Drop & Category */}
            <div className="space-y-2">
              {product.drop && (
                <Badge variant="destructive" className="text-xs">
                  {product.drop.name}
                </Badge>
              )}
              {product.category && (
                <p className="text-heuse-muted text-sm uppercase tracking-widest">
                  {product.category.name}
                </p>
              )}
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="font-heading text-4xl md:text-5xl font-light mb-4">{product.name}</h1>
              <p className="text-2xl text-heuse-text font-medium">{formatMoney(Number(product.price))}</p>
            </div>

            {/* Short Description */}
            <p className="text-heuse-muted leading-relaxed">{product.shortDescription}</p>

            {/* Edition Info */}
            <div className="flex items-center space-x-4">
              <Badge variant="gold" className="text-sm">
                Limited to {product.editionLimit} pieces
              </Badge>
              <Badge
                variant={
                  availability === "available"
                    ? "default"
                    : availability === "low-stock"
                    ? "secondary"
                    : "destructive"
                }
              >
                {availability === "available"
                  ? "Available"
                  : availability === "low-stock"
                  ? "Low Stock"
                  : "Sold Out"}
              </Badge>
            </div>

            {/* Buy Now — primary CTA. Cart still accessible via header icon. */}
            {availability === "sold-out" ? (
              <Link
                href={`/contact?product=${product.slug}&subject=Waitlist: ${product.name}`}
                className="block w-full"
              >
                <button className="w-full bg-heuse-crimson text-heuse-text py-4 text-sm uppercase tracking-widest hover:bg-[#8f2328] transition-colors">
                  Join Waitlist
                </button>
              </Link>
            ) : (
              <BuyNowButton
                productId={product.id}
                variants={product.variants}
                productSlug={product.slug}
                productName={product.name}
                productPrice={Number(product.price)}
                productImage={product.images[0]?.url}
                availability={availability}
              />
            )}

            {/* Full Description */}
            {product.description && (
              <div className="pt-8 border-t border-heuse-border">
                <h3 className="font-heading text-xl mb-4">Details</h3>
                <div className="text-heuse-muted leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-24">
            <h2 className="font-heading text-3xl mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((related) => (
                <Link key={related.id} href={`/products/${related.slug}`} className="group">
                  <div className="relative aspect-[3/4] bg-heuse-dark overflow-hidden mb-3">
                    {related.images[0] && (
                      <Image
                        src={related.images[0].url}
                        alt={related.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    )}
                  </div>
                  <h3 className="font-heading text-sm">{related.name}</h3>
                  <p className="text-heuse-text text-sm">{formatMoney(Number(related.price))}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}