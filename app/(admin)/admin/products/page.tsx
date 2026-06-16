import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { ProductTable } from "@/components/admin/product-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const authCheck = await requireRole(["ADMIN", "OWNER"]);
  if (!authCheck.authorized) {
    redirect("/admin/login");
  }

  const productsRaw = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      _count: { select: { units: true, orderItems: true } },
    },
  });

  // Convert Decimal to number for Client Component
  const products = productsRaw.map((p) => ({
    ...p,
    price: Number(p.price),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
            Products
          </h1>
          <p className="text-heuse-muted mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      <ProductTable products={products} />
    </div>
  );
}