"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createArticleSchema, updateArticleSchema, deleteArticleSchema } from "@/validations/articles";
import { requireRole } from "@/lib/permissions";
import { sanitizeArticleHtml, stripHtml } from "@/lib/sanitize";
import type { ActionResponse } from "@/types";

export async function createArticle(input: unknown): Promise<ActionResponse<{ id: string; slug: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = createArticleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { title, slug, excerpt, content, coverImage, authorName, published, featured, seoTitle, seoDescription } = parsed.data;

    // Check duplicate slug
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      return {
        success: false,
        error: { code: "DUPLICATE_SLUG", message: "An article with this slug already exists" },
      };
    }

    // Sanitize HTML BEFORE persisting (defense in depth — also sanitized on render)
    const safeContent = sanitizeArticleHtml(content);
    const safeExcerpt = excerpt ? stripHtml(excerpt) : null;

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt: safeExcerpt,
        content: safeContent,
        coverImage: coverImage || null,
        authorName,
        published,
        featured,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        publishedAt: published ? new Date() : null,
      },
    });

    revalidatePath("/articles");
    revalidatePath("/admin/articles");

    return { success: true, data: { id: article.id, slug: article.slug } };
  } catch (error) {
    console.error("[createArticle]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to create article" } };
  }
}

export async function updateArticle(input: unknown): Promise<ActionResponse<{ id: string; slug: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = updateArticleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { id, title, slug, excerpt, content, coverImage, authorName, published, featured, seoTitle, seoDescription } = parsed.data;

    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { code: "NOT_FOUND", message: "Article not found" } };
    }

    // Check slug uniqueness if changed
    if (slug !== existing.slug) {
      const slugConflict = await prisma.article.findUnique({ where: { slug } });
      if (slugConflict) {
        return { success: false, error: { code: "DUPLICATE_SLUG", message: "An article with this slug already exists" } };
      }
    }

    // Sanitize HTML BEFORE persisting (defense in depth)
    const safeContent = sanitizeArticleHtml(content);
    const safeExcerpt = excerpt ? stripHtml(excerpt) : null;

    // Set publishedAt if publishing for first time
    const shouldSetPublishedAt = published && !existing.publishedAt;

    const article = await prisma.article.update({
      where: { id },
      data: {
        title,
        slug,
        excerpt: safeExcerpt,
        content: safeContent,
        coverImage: coverImage || null,
        authorName,
        published,
        featured,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        publishedAt: shouldSetPublishedAt ? new Date() : existing.publishedAt,
      },
    });

    revalidatePath(`/articles/${article.slug}`);
    revalidatePath("/articles");
    revalidatePath("/admin/articles");

    return { success: true, data: { id: article.id, slug: article.slug } };
  } catch (error) {
    console.error("[updateArticle]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to update article" } };
  }
}

export async function deleteArticle(input: unknown): Promise<ActionResponse<{ deleted: true }>> {
  const auth = await requireRole(["OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = deleteArticleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { id } = parsed.data;

    await prisma.article.delete({ where: { id } });

    revalidatePath("/articles");
    revalidatePath("/admin/articles");

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("[deleteArticle]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete article" } };
  }
}
