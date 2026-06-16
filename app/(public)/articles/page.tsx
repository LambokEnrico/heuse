import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      authorName: true,
      publishedAt: true,
    },
  });

  const featuredArticles = articles.filter((a) => {
    // Featured articles would need to be fetched separately in real implementation
    return false;
  });

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="py-24 bg-heuse-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-heuse-gold text-sm uppercase tracking-[0.3em] mb-4">
              Journal
            </p>
            <h1 className="font-heading text-5xl md:text-7xl font-light text-heuse-text mb-6">
              The HEUSE Journal
            </h1>
            <p className="text-heuse-muted text-lg max-w-2xl mx-auto">
              Stories on craft, identity, and the art of dressing with intention.
            </p>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16 bg-heuse-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {articles.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-heuse-muted text-lg mb-4">
                No articles published yet.
              </p>
              <p className="text-heuse-muted">
                Check back soon for stories on craft and identity.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="group"
                >
                  <div className="relative aspect-[16/10] bg-heuse-black overflow-hidden mb-4">
                    {article.coverImage ? (
                      <Image
                        src={article.coverImage}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border border-heuse-border rounded-full" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {article.authorName && (
                      <p className="text-heuse-gold text-xs uppercase tracking-widest">
                        {article.authorName}
                      </p>
                    )}
                    <h2 className="font-heading text-xl md:text-2xl group-hover:text-heuse-gold transition-colors">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="text-heuse-muted text-sm line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    {article.publishedAt && (
                      <p className="text-heuse-muted text-xs">
                        {new Date(article.publishedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-24 bg-heuse-black">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-heuse-gold text-sm uppercase tracking-[0.2em] mb-4">
            Stay Connected
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-light mb-4">
            Never Miss a Story
          </h2>
          <p className="text-heuse-muted mb-8">
            Subscribe to receive new journal entries and exclusive updates.
          </p>
          <Link href="/contact">
            <Button className="btn-gold px-8">
              Subscribe <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
