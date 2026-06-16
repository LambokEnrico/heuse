"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createArticle, updateArticle } from "@/app/actions";
import { slugify } from "@/lib/utils";
import { UploadButton, ImagePreview } from "@/components/admin/upload-button";

const articleSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  excerpt: z.string().max(500, "Excerpt must be 500 characters or less").optional().nullable(),
  content: z.string().min(10, "Content must be at least 10 characters"),
  coverImage: z.string().optional().nullable(),
  authorName: z.string().max(100, "Author name must be 100 characters or less").optional().nullable(),
  featured: z.boolean(),
  published: z.boolean(),
  seoTitle: z.string().max(70, "SEO title must be 70 characters or less").optional().nullable(),
  seoDescription: z.string().max(160, "SEO description must be 160 characters or less").optional().nullable(),
});

type ArticleFormData = z.output<typeof articleSchema>;

interface ArticleFormProps {
  article?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    coverImage: string | null;
    authorName: string | null;
    published: boolean;
    featured: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
  };
}

export function ArticleForm({ article }: ArticleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<string>(article?.coverImage || "");

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema) as any,
    defaultValues: {
      title: article?.title || "",
      slug: article?.slug || "",
      excerpt: article?.excerpt || "",
      content: article?.content || "",
      coverImage: article?.coverImage || "",
      authorName: article?.authorName || "",
      featured: article?.featured || false,
      published: article?.published || false,
      seoTitle: article?.seoTitle || "",
      seoDescription: article?.seoDescription || "",
    },
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    form.setValue("title", title);
    if (!article) {
      form.setValue("slug", slugify(title));
    }
  };

  const onSubmit = async (data: ArticleFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        coverImage: coverImage || null,
        excerpt: data.excerpt || null,
        authorName: data.authorName || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      };

      const result = article
        ? await updateArticle({ ...payload, id: article.id })
        : await createArticle(payload);

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: article
          ? "Article updated successfully"
          : "Article created successfully",
      });

      router.push("/admin/articles");
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-heuse-cream">
          Basic Information
        </h3>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...form.register("title")}
            onChange={handleTitleChange}
            placeholder="The Art of Jacquard Weaving"
          />
          {form.formState.errors.title && (
            <p className="text-xs text-heuse-crimson">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            {...form.register("slug")}
            placeholder="art-of-jacquard-weaving"
          />
          {form.formState.errors.slug && (
            <p className="text-xs text-heuse-crimson">
              {form.formState.errors.slug.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="authorName">Author Name</Label>
          <Input
            id="authorName"
            {...form.register("authorName")}
            placeholder="HEUSE Editorial"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            {...form.register("excerpt")}
            placeholder="A brief summary for article cards..."
            rows={3}
          />
          {form.formState.errors.excerpt && (
            <p className="text-xs text-heuse-crimson">
              {form.formState.errors.excerpt.message}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-heuse-cream">
          Content
        </h3>
        <div className="space-y-2">
          <Label htmlFor="content">Article Content (HTML allowed)</Label>
          <Textarea
            id="content"
            {...form.register("content")}
            placeholder="<p>Your article content here...</p>"
            rows={12}
            className="font-mono text-sm"
          />
          {form.formState.errors.content && (
            <p className="text-xs text-heuse-crimson">
              {form.formState.errors.content.message}
            </p>
          )}
        </div>
      </div>

      {/* Cover Image */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-heuse-cream">
          Cover Image
        </h3>
        <UploadButton
          onUploadComplete={(urls) => setCoverImage(urls[0] || "")}
          maxFiles={1}
        />
        {coverImage && (
          <div className="relative w-full max-w-md aspect-video bg-heuse-dark rounded-sm overflow-hidden">
            <img
              src={coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setCoverImage("")}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* SEO */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-heuse-cream">
          SEO
        </h3>
        <div className="space-y-2">
          <Label htmlFor="seoTitle">SEO Title</Label>
          <Input
            id="seoTitle"
            {...form.register("seoTitle")}
            placeholder="The Art of Jacquard Weaving | HEUSE"
          />
          <p className="text-xs text-heuse-muted">
            {form.watch("seoTitle")?.length || 0}/70 characters
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="seoDescription">SEO Description</Label>
          <Textarea
            id="seoDescription"
            {...form.register("seoDescription")}
            placeholder="Discover the intricate craft behind HEUSE's limited edition jacquard jackets..."
            rows={2}
          />
          <p className="text-xs text-heuse-muted">
            {form.watch("seoDescription")?.length || 0}/160 characters
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-heuse-cream">
          Status
        </h3>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...form.register("featured")}
              className="w-4 h-4 rounded border-heuse-border bg-heuse-dark text-heuse-gold focus:ring-heuse-gold"
            />
            <span className="text-sm text-heuse-text">Featured</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...form.register("published")}
              className="w-4 h-4 rounded border-heuse-border bg-heuse-dark text-heuse-gold focus:ring-heuse-gold"
            />
            <span className="text-sm text-heuse-text">Published</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : article ? "Update Article" : "Create Article"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
