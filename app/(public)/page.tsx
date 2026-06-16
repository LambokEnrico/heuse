import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featuredProducts = await prisma.product.findMany({
    where: { status: "PUBLISHED", featured: true },
    take: 3,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      drop: true,
    },
  });

  const activeDrop = await prisma.drop.findFirst({
    where: { published: true },
    include: {
      products: {
        where: { status: "PUBLISHED" },
        take: 4,
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-heuse-black overflow-hidden">
        {/* Background texture/pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a24d' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <p className="text-heuse-gold text-sm uppercase tracking-[0.3em] mb-6 animate-fade-in">
            Limited Edition Menswear
          </p>
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-light text-heuse-text mb-6 leading-tight">
            True Self,<br />
            <span className="italic text-gradient-gold">Tailored.</span>
          </h1>
          <p className="text-heuse-muted text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Handmade jacquard jackets and bombers. Each piece numbered, each drop limited.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/products">
              <Button className="btn-gold text-lg px-10 py-4">
                Explore Collection
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="outline" className="btn-ghost text-lg px-10 py-4">
                Our Story
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border border-heuse-muted rounded-full flex justify-center">
            <div className="w-1 h-2 bg-heuse-muted rounded-full mt-2" />
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-24 bg-heuse-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <p className="text-heuse-gold text-sm uppercase tracking-[0.2em] mb-2">Curated</p>
                <h2 className="font-heading text-4xl md:text-5xl font-light">Featured Pieces</h2>
              </div>
              <Link href="/products" className="hidden md:flex items-center text-sm uppercase tracking-widest text-heuse-muted hover:text-heuse-gold transition-colors">
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`} className="group">
                  <div className="relative aspect-[3/4] bg-heuse-dark overflow-hidden mb-4">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-heuse-muted">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-heuse-gold text-heuse-black text-xs px-3 py-1 uppercase tracking-wider">
                      Limited to {product.editionLimit}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {product.drop && (
                      <p className="text-heuse-gold text-xs uppercase tracking-widest">{product.drop.name}</p>
                    )}
                    <h3 className="font-heading text-xl">{product.name}</h3>
                    <p className="text-heuse-text font-medium">{formatMoney(Number(product.price))}</p>
                  </div>
                </Link>
              ))}
            </div>

            <Link href="/products" className="md:hidden flex items-center justify-center mt-8 text-sm uppercase tracking-widest text-heuse-muted hover:text-heuse-gold transition-colors">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </section>
      )}

      {/* Active Drop */}
      {activeDrop && (
        <section className="py-24 bg-heuse-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-heuse-crimson text-sm uppercase tracking-[0.2em] mb-4">Now Available</p>
              <h2 className="font-heading text-4xl md:text-6xl font-light mb-4">{activeDrop.name}</h2>
              {activeDrop.description && (
                <p className="text-heuse-muted max-w-2xl mx-auto">{activeDrop.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {activeDrop.products.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`} className="group">
                  <div className="relative aspect-[3/4] bg-heuse-black overflow-hidden mb-3">
                    {product.images[0] && (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    )}
                  </div>
                  <h3 className="font-heading text-sm">{product.name}</h3>
                  <p className="text-heuse-text text-sm">{formatMoney(Number(product.price))}</p>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href={`/drops/${activeDrop.slug}`}>
                <Button variant="outline" className="btn-ghost px-8">
                  View Drop <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Brand Statement */}
      <section className="py-24 bg-heuse-cream text-heuse-text-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-4xl md:text-6xl font-light mb-8 leading-tight">
            Not just fashion.<br />
            <span className="italic">Identity.</span>
          </h2>
          <p className="text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            HEUSE creates pieces for men who understand that what you wear is an extension 
            of who you are. Each jacquard texture tells a story. Each limited drop is a statement.
          </p>
          <Link href="/about">
            <Button className="bg-heuse-black text-heuse-text hover:bg-heuse-dark px-8 py-4">
              Our Philosophy
            </Button>
          </Link>
        </div>
      </section>

      {/* No active drop fallback */}
      {!activeDrop && (
        <section className="py-24 bg-heuse-dark text-center">
          <div className="max-w-2xl mx-auto px-4">
            <p className="text-heuse-gold text-sm uppercase tracking-[0.2em] mb-4">Coming Soon</p>
            <h2 className="font-heading text-4xl md:text-5xl font-light mb-6">
              The Next Drop is Being Tailored
            </h2>
            <p className="text-heuse-muted mb-8">
              Join our circle to be the first to know when a new collection drops.
            </p>
            <Link href="/waitlist">
              <Button variant="outline" className="btn-ghost px-8">
                Join the Waitlist
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}