import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About HEUSE",
  description: "Discover the story behind HEUSE - a contemporary fashion brand dedicated to limited edition pieces.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-heuse-gold text-sm uppercase tracking-widest mb-6">
              Our Story
            </p>
            <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl leading-none mb-8">
              Fashion for the
              <br />
              <span className="text-heuse-muted">Discerning</span>
            </h1>
            <p className="text-heuse-muted text-xl leading-relaxed max-w-xl">
              HEUSE is more than a brand. It&apos;s a movement for those who understand that true style is never mass-produced.
            </p>
          </div>
        </div>

        {/* Decorative Line */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-heuse-border" />
      </section>

      {/* Manifesto Section */}
      <section className="py-24 bg-heuse-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-heuse-gold text-sm uppercase tracking-widest mb-6">
                Our Philosophy
              </p>
              <h2 className="font-heading text-4xl md:text-5xl mb-8 leading-tight">
                Less is More.
                <br />
                Limited is Eternal.
              </h2>
              <div className="space-y-6 text-heuse-muted leading-relaxed">
                <p>
                  In a world of fast fashion and disposable trends, HEUSE stands apart. We believe that every piece
                  you wear should tell a story — your story.
                </p>
                <p>
                  Each HEUSE collection is carefully curated, with pieces limited to no more than 20 units. This
                  isn&apos;t just exclusivity for the sake of it. It&apos;s our commitment to quality, sustainability,
                  and the belief that true luxury lies in rarity.
                </p>
                <p>
                  When you wear HEUSE, you&apos;re not just wearing clothes. You&apos;re wearing a piece of
                  wearable art — something that was made with intention, crafted with care, and designed to last.
                </p>
              </div>
            </div>
            <div className="relative aspect-square bg-heuse-black">
              <div className="absolute inset-0 bg-gradient-to-br from-heuse-gold/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-heuse-black to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Craft & Quality Section */}
      <section className="py-24 bg-heuse-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-heuse-gold text-sm uppercase tracking-widest mb-6">
              The HEUSE Standard
            </p>
            <h2 className="font-heading text-4xl md:text-5xl">
              Craft & Quality
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Quality 1 */}
            <div className="p-8 border border-heuse-border">
              <div className="w-12 h-12 mb-6 bg-heuse-dark flex items-center justify-center">
                <span className="text-heuse-gold text-2xl">01</span>
              </div>
              <h3 className="font-heading text-2xl mb-4">Premium Materials</h3>
              <p className="text-heuse-muted leading-relaxed">
                Every HEUSE piece is crafted from carefully selected materials. We source only the finest fabrics,
                leather, and hardware to ensure both comfort and longevity.
              </p>
            </div>

            {/* Quality 2 */}
            <div className="p-8 border border-heuse-border">
              <div className="w-12 h-12 mb-6 bg-heuse-dark flex items-center justify-center">
                <span className="text-heuse-gold text-2xl">02</span>
              </div>
              <h3 className="font-heading text-2xl mb-4">Limited Production</h3>
              <p className="text-heuse-muted leading-relaxed">
                With a maximum of 20 pieces per design, every item receives the attention it deserves. No mass
                production, no shortcuts — just pure craftsmanship.
              </p>
            </div>

            {/* Quality 3 */}
            <div className="p-8 border border-heuse-border">
              <div className="w-12 h-12 mb-6 bg-heuse-dark flex items-center justify-center">
                <span className="text-heuse-gold text-2xl">03</span>
              </div>
              <h3 className="font-heading text-2xl mb-4">Wearable Art</h3>
              <p className="text-heuse-muted leading-relaxed">
                HEUSE pieces are designed to be noticed. Bold statements, subtle details, and unmistakable quality
                make every item a statement of personal style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-heuse-dark text-sm uppercase tracking-widest mb-6">
              What We Stand For
            </p>
            <h2 className="font-heading text-4xl md:text-5xl text-heuse-black mb-8">
              Our Values
            </h2>
            <div className="space-y-6 text-heuse-dark/80 leading-relaxed">
              <p>
                <strong className="text-heuse-black">Authenticity</strong> — We are who we are. No pretenses,
                no imitations. HEUSE is for those who know exactly what they want.
              </p>
              <p>
                <strong className="text-heuse-black">Sustainability</strong> — By limiting production, we reduce
                waste. Quality over quantity is not just a tagline — it&apos;s our practice.
              </p>
              <p>
                <strong className="text-heuse-black">Community</strong> — HEUSE is more than a brand. It&apos;s a
                community of individuals who share a vision of thoughtful, intentional style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team / Identity Section */}
      <section className="py-24 bg-heuse-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <p className="text-heuse-gold text-sm uppercase tracking-widest mb-6">
                The Identity
              </p>
              <h2 className="font-heading text-4xl md:text-5xl mb-8">
                Made for the
                <br />
                <span className="text-heuse-muted">Unconventional</span>
              </h2>
              <p className="text-heuse-muted leading-relaxed">
                HEUSE was born from a simple belief: fashion should be personal, intentional, and lasting. We
                create for those who refuse to follow the crowd, who see clothing as an extension of their
                identity, not a costume.
              </p>
              <p className="text-heuse-muted leading-relaxed mt-4">
                Every drop we release is a declaration. A statement that you are not defined by what&apos;s
                trending, but by what speaks to you.
              </p>
            </div>
            <div className="space-y-8">
              <div className="p-6 border border-heuse-border">
                <h3 className="font-heading text-xl mb-2">Founded in Indonesia</h3>
                <p className="text-heuse-muted">
                  Rooted in Indonesian craftsmanship, inspired by global aesthetics. HEUSE celebrates our heritage
                  while embracing the world.
                </p>
              </div>
              <div className="p-6 border border-heuse-border">
                <h3 className="font-heading text-xl mb-2">Edition Releases</h3>
                <p className="text-heuse-muted">
                  Our drops are strategic, not seasonal. Each collection drops when it&apos;s ready, ensuring
                  every piece meets our exacting standards.
                </p>
              </div>
              <div className="p-6 border border-heuse-border">
                <h3 className="font-heading text-xl mb-2">Direct Connection</h3>
                <p className="text-heuse-muted">
                  No middlemen, no mass retail. When you buy HEUSE, you buy directly from the source. Every order
                  handled with care, every customer treated like family.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-heuse-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            Ready to Join the Movement?
          </h2>
          <p className="text-heuse-muted text-lg mb-8 max-w-xl mx-auto">
            Explore our latest collection and find pieces that speak to who you are.
          </p>
          <a
            href="/products"
            className="inline-block bg-heuse-gold text-heuse-black px-8 py-4 text-sm uppercase tracking-widest hover:bg-[#c9a862] transition-colors"
          >
            Explore Collection
          </a>
        </div>
      </section>
    </div>
  );
}