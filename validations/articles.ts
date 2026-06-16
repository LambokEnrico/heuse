import { z } from "zod";

export const createArticleSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase alphanumeric with dashes only",
    }),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(10),
  coverImage: z.string().url().optional().or(z.literal("")),
  authorName: z.string().max(100).optional(),
  published: z.boolean(),
  featured: z.boolean(),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(160).optional().or(z.literal("")),
});

export const updateArticleSchema = createArticleSchema.extend({
  id: z.string().cuid(),
});

export const deleteArticleSchema = z.object({
  id: z.string().cuid(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type DeleteArticleInput = z.infer<typeof deleteArticleSchema>;
