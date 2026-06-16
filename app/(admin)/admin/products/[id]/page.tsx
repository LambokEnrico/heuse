import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { ProductForm } from "@/components/admin/product-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const authCheck = await requireRole(["ADMIN", "OWNER"]);
  if (!authCheck.authorized) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      drop: { select: { id: true, name: true } },
      images: true,
      variants: true,
    },
  });

  if (!product) {
    notFound();
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
          Edit Product
        </h1>
        <p className="text-heuse-muted mt-1">{product.name}</p>
      </div>

      <div className="bg-heuse-dark border border-heuse-border rounded-sm p-6">
        <ProductForm
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            shortDescription: product.shortDescription,
            description: product.description,
            price: Number(product.price),
            categoryId: product.categoryId,
            dropId: product.dropId,
            editionLimit: product.editionLimit,
            featured: product.featured,
            status: product.status,
          }}
          categories={categories}
          drops={drops}
        />
      </div>
    </div>
  );
}
