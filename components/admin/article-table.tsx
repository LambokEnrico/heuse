"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { deleteArticle } from "@/app/actions";
import { toast } from "@/components/ui/toast";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  authorName: string | null;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

interface ArticleTableProps {
  articles: Article[];
}

export function ArticleTable({ articles }: ArticleTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (articleId: string) => {
    if (!confirm("Delete this article?")) return;

    setDeletingId(articleId);
    try {
      const result = await deleteArticle({ id: articleId });
      if (result.success) {
        toast({ title: "Article deleted" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete article", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      key: "image",
      header: "",
      render: (article: Article) =>
        article.coverImage ? (
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-12 h-12 object-cover rounded-sm"
          />
        ) : (
          <div className="w-12 h-12 bg-heuse-dark rounded-sm" />
        ),
      className: "w-16",
    },
    {
      key: "title",
      header: "Article",
      render: (article: Article) => (
        <div>
          <Link
            href={`/admin/articles/${article.id}`}
            className="font-medium text-heuse-gold hover:underline"
          >
            {article.title}
          </Link>
          {article.excerpt && (
            <p className="text-xs text-heuse-muted line-clamp-1">{article.excerpt}</p>
          )}
        </div>
      ),
    },
    {
      key: "author",
      header: "Author",
      render: (article: Article) => article.authorName || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (article: Article) => (
        <div className="flex gap-2">
          {article.published ? (
            <Badge variant="default">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
          )}
          {article.featured && (
            <Badge variant="gold">Featured</Badge>
          )}
        </div>
      ),
    },
    {
      key: "publishedAt",
      header: "Published",
      render: (article: Article) =>
        article.publishedAt
          ? new Date(article.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (article: Article) => (
        <div className="flex gap-2">
          <Link href={`/admin/articles/${article.id}`}>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4 text-heuse-gold" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(article.id)}
            disabled={deletingId === article.id}
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
        data={articles}
        columns={columns}
        keyField="id"
        emptyMessage="No articles yet. Create your first article."
      />
    </div>
  );
}
