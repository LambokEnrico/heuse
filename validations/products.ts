import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        "Slug must be lowercase alphanumeric with dashes only",
    }),
  sku: z.string().min(2).max(64),
  shortDescription: z.string().min(10).max(240),
  description: z.string().max(5000).optional(),
  price: z.coerce.number().positive(),
  categoryId: z.string().cuid().optional(),
  dropId: z.string().cuid().optional(),
  editionLimit: z.coerce.number().int().min(1).max(999),
  featured: z.boolean(),
  published: z.boolean(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
  })).optional(),
});

export const updateProductSchema = createProductSchema.extend({
  id: z.string().cuid(),
});

export const deleteProductSchema = z.object({
  id: z.string().cuid(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;