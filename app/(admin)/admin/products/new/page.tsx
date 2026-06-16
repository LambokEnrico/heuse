import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const authCheck = await requireRole(["ADMIN", "OWNER"]);
  if (!authCheck.authorized) {
    redirect("/admin/login");
  }

  const [categories, drops] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.drop.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
          New Product
        </h1>
        <p className="text-heuse-muted mt-1">Create a new product</p>
      </div>

      <div className="bg-heuse-dark border border-heuse-border rounded-sm p-6">
        <ProductForm categories={categories} drops={drops} />
      </div>
    </div>
  );
}
