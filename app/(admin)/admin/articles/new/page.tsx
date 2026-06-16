import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { ArticleForm } from "@/components/admin/article-form";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const authCheck = await requireRole(["ADMIN", "OWNER"]);
  if (!authCheck.authorized) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
          New Article
        </h1>
        <p className="text-heuse-muted mt-1">
          Create a new journal article
        </p>
      </div>

      <div className="bg-heuse-dark border border-heuse-border rounded-sm p-6">
        <ArticleForm />
      </div>
    </div>
  );
}
