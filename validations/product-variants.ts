import { z } from "zod";

export const createProductVariantSchema = z.object({
  productId: z.string().cuid(),
  size: z.enum(["XS", "S", "M", "L", "XL", "XXL", "CUSTOM"]),
  stock: z.coerce.number().int().min(0),
});

export const updateProductVariantSchema = createProductVariantSchema.extend({
  id: z.string().cuid(),
});

export const deleteProductVariantSchema = z.object({
  id: z.string().cuid(),
});

export const createEditionUnitsSchema = z
  .object({
    productId: z.string().cuid(),
    variantId: z.string().cuid().optional(),
    startSerial: z.coerce.number().int().min(1),
    endSerial: z.coerce.number().int().min(1),
  })
  .refine((data) => data.endSerial >= data.startSerial, {
    message: "End serial must be greater than or equal to start serial.",
    path: ["endSerial"],
  });

export const addProductImageSchema = z.object({
  productId: z.string().cuid(),
  url: z.string().url(),
  alt: z.string().max(160).optional(),
  sortOrder: z.coerce.number().int().min(0),
});

export const deleteProductImageSchema = z.object({
  id: z.string().cuid(),
});

export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
export type DeleteProductVariantInput = z.infer<typeof deleteProductVariantSchema>;
export type CreateEditionUnitsInput = z.infer<typeof createEditionUnitsSchema>;
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;
export type DeleteProductImageInput = z.infer<typeof deleteProductImageSchema>;