import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { sanitizeArticleHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug, published: true },
  });

  if (!article) {
    return { title: "Article Not Found" };
  }

  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt || undefined,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug, published: true },
  });

  if (!article) {
    notFound();
  }

  // Get related articles (same author or featured)
  const relatedArticles = await prisma.article.findMany({
    where: {
      published: true,
      id: { not: article.id },
      OR: [
        { authorName: article.authorName || undefined },
        { featured: true },
      ],
    },
    take: 3,
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
    },
  });

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] bg-heuse-black">
        {article.coverImage && (
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover opacity-60"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-heuse-black via-heuse-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <Link
              href="/articles"
              className="inline-flex items-center text-sm text-heuse-muted hover:text-heuse-gold transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Journal
            </Link>
            {article.authorName && (
              <p className="text-heuse-gold text-sm uppercase tracking-[0.2em] mb-4">
                {article.authorName}
              </p>
            )}
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-light text-heuse-text mb-4">
              {article.title}
            </h1>
            {article.publishedAt && (
              <p className="text-heuse-muted text-sm">
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-16 bg-heuse-dark">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {article.excerpt && (
            <p className="text-xl text-heuse-muted font-heading italic mb-8 leading-relaxed">
              {article.excerpt}
            </p>
          )}
          <div
            className="prose prose-lg prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }}
          />
        </div>
      </section>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="py-16 bg-heuse-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl mb-8">More from the Journal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="group"
                >
                  <div className="relative aspect-[16/10] bg-heuse-dark overflow-hidden mb-4">
                    {related.coverImage ? (
                      <Image
                        src={related.coverImage}
                        alt={related.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border border-heuse-border rounded-full" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-heading text-lg group-hover:text-heuse-gold transition-colors">
                    {related.title}
                  </h3>
                  {related.publishedAt && (
                    <p className="text-heuse-muted text-xs mt-2">
                      {new Date(related.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back CTA */}
      <section className="py-16 bg-heuse-dark border-t border-heuse-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-heuse-muted mb-4">Explore our collection</p>
          <Link href="/products">
            <Button variant="outline" className="btn-ghost px-8">
              View Products
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
