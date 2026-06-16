import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { ArticleForm } from "@/components/admin/article-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface EditArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const authCheck = await requireRole(["ADMIN", "OWNER"]);
  if (!authCheck.authorized) {
    redirect("/admin/login");
  }

  const article = await prisma.article.findUnique({
    where: { id },
  });

  if (!article) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
          Edit Article
        </h1>
        <p className="text-heuse-muted mt-1">
          {article.title}
        </p>
      </div>

      <div className="bg-heuse-dark border border-heuse-border rounded-sm p-6">
        <ArticleForm article={article} />
      </div>
    </div>
  );
}
