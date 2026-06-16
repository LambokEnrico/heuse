"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { formatMoney } from "@/lib/utils";
import { deleteProduct } from "@/app/actions";
import { toast } from "@/components/ui/toast";

interface Product {
  id: string;
  name: string;
  sku: string;
  status: string;
  price: number | { toString(): string };
  category: { name: string } | null;
  images: { url: string }[];
  _count: { units: number; orderItems: number };
}

interface ProductTableProps {
  products: Product[];
}

export function ProductTable({ products }: ProductTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (productId: string) => {
    if (!confirm("Delete this product?")) return;

    setDeletingId(productId);
    try {
      const result = await deleteProduct({ id: productId });
      if (result.success) {
        toast({ title: "Product deleted" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      key: "image",
      header: "",
      render: (product: Product) =>
        product.images[0] ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="w-12 h-12 object-cover rounded-sm"
          />
        ) : (
          <div className="w-12 h-12 bg-heuse-dark rounded-sm" />
        ),
      className: "w-16",
    },
    {
      key: "name",
      header: "Product",
      render: (product: Product) => (
        <div>
          <Link
            href={`/admin/products/${product.id}`}
            className="font-medium text-heuse-gold hover:underline"
          >
            {product.name}
          </Link>
          <p className="text-xs text-heuse-muted">{product.sku}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (product: Product) => product.category?.name || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (product: Product) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "gold"> = {
          DRAFT: "secondary",
          PUBLISHED: "default",
          ARCHIVED: "destructive",
        };
        return (
          <Badge variant={variants[product.status] || "secondary"}>
            {product.status}
          </Badge>
        );
      },
    },
    {
      key: "price",
      header: "Price",
      render: (product: Product) => formatMoney(Number(product.price)),
    },
    {
      key: "units",
      header: "Units",
      render: (product: Product) => product._count.units,
    },
    {
      key: "actions",
      header: "Actions",
      render: (product: Product) => (
        <div className="flex gap-2">
          <Link href={`/admin/products/${product.id}`}>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4 text-heuse-gold" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(product.id)}
            disabled={deletingId === product.id}
          >
            <Trash2 className="h-4 w-4 text-heuse-crimson" />
          </Button>
        </div>
      ),
      className: "w-24",
    },
  ];

  return (
    <div className="bg-heuse-dark border border-heuse-border rounded-sm">
      <DataTable
        data={products}
        columns={columns}
        keyField="id"
        emptyMessage="No products yet. Create your first product."
      />
    </div>
  );
}