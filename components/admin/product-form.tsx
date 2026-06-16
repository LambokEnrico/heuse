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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct, updateProduct, syncProductVariants } from "@/app/actions";
import { slugify } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { UploadButton, ImagePreview } from "@/components/admin/upload-button";

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters"),
  description: z.string().optional().nullable(),
  price: z.preprocess((val) => Number(val), z.number().min(0, "Price must be a positive number")),
  categoryId: z.string().optional().nullable(),
  dropId: z.string().optional().nullable(),
  editionLimit: z.preprocess((val) => Number(val), z.number().min(1, "Edition limit must be at least 1")),
  featured: z.boolean(),
  published: z.boolean(),
});

type ProductFormData = z.output<typeof productSchema>;

interface ProductFormProps {
  product?: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    shortDescription: string;
    description: string | null;
    price: number;
    categoryId: string | null;
    dropId: string | null;
    editionLimit: number;
    featured: boolean;
    status: string;
    images?: string[];
    variants?: { size: string; stock: number }[];
  };
  categories: { id: string; name: string }[];
  drops: { id: string; name: string }[];
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export function ProductForm({ product, categories, drops }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Load existing variants when editing; otherwise seed with default SIZES.
  // If editing a product with no variants stored, start empty (don't auto-seed).
  const [variants, setVariants] = useState<{ size: string; stock: number }[]>(
    product
      ? (product.variants ?? [])
      : SIZES.map((size) => ({ size, stock: 0 }))
  );
  // Load existing images when editing; empty array for new product.
  const [images, setImages] = useState<string[]>(product?.images ?? []);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      sku: product?.sku || "",
      shortDescription: product?.shortDescription || "",
      description: product?.description || "",
      price: product?.price || 0,
      categoryId: product?.categoryId || "",
      dropId: product?.dropId || "",
      editionLimit: product?.editionLimit || 20,
      featured: product?.featured || false,
      published: product?.status === "PUBLISHED",
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue("name", name);
    if (!product) {
      form.setValue("slug", slugify(name));
    }
  };

  const addVariant = () => {
    setVariants([...variants, { size: "M", stock: 0 }]);
  };

  const updateVariant = (index: number, field: "size" | "stock", value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const addImage = () => {
    setImages([...images, ""]);
  };

  const updateImage = (index: number, url: string) => {
    const newImages = [...images];
    newImages[index] = url;
    setImages(newImages);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      // Transform images array to expected format
      const imagesPayload = images.length > 0
        ? images.map((url, index) => ({ url, alt: `Product image ${index + 1}` }))
        : undefined;

      const payload = {
        ...data,
        categoryId: data.categoryId || null,
        dropId: data.dropId || null,
        images: imagesPayload,
      };

      const result = product
        ? await updateProduct({ ...payload, id: product.id })
        : await createProduct(payload);

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      const productId = result.data.id;

      // Sync variants atomically via server action (delete + recreate).
      // Source of truth is the form state.
      const variantResult = await syncProductVariants({
        productId,
        variants: variants
          .filter((v) => v.stock > 0)
          .map((v) => ({ size: v.size, stock: v.stock })),
      });

      if (!variantResult.success) {
        toast({
          title: "Partial success",
          description: `Product saved, but variants failed: ${variantResult.error.message}`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Success",
        description: product
          ? "Product updated successfully"
          : "Product created successfully",
      });

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      console.error("[ProductForm.submit]", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              onChange={handleNameChange}
              placeholder="Premium Jacquard Jacket"
 />
            {form.formState.errors.name && (
              <p className="text-xs text-heuse-crimson">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              {...form.register("slug")}
              placeholder="premium-jacquard-jacket"
            />
            {form.formState.errors.slug && (
              <p className="text-xs text-heuse-crimson">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              {...form.register("sku")}
              placeholder="HEUSE-001"
            />
            {form.formState.errors.sku && (
              <p className="text-xs text-heuse-crimson">
                {form.formState.errors.sku.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (IDR)</Label>
            <Input
              id="price"
              type="number"
              {...form.register("price")}
              placeholder="2500000"
            />
            {form.formState.errors.price && (
              <p className="text-xs text-heuse-crimson">
                {form.formState.errors.price.message}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shortDescription">Short Description</Label>
          <Input
            id="shortDescription"
            {...form.register("shortDescription")}
            placeholder="A brief description for product cards"
          />
          {form.formState.errors.shortDescription && (
            <p className="text-xs text-heuse-crimson">
              {form.formState.errors.shortDescription.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Full Description</Label>
          <Textarea
            id="description"
            {...form.register("description")}
            placeholder="Detailed product description..."
            rows={4}
          />
        </div>
      </div>

      {/* Category & Drop */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-heuse-cream">
          Category & Drop
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Select
              value={form.watch("categoryId") ?? undefined}
              onValueChange={(value) => form.setValue("categoryId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dropId">Drop</Label>
            <Select
              value={form.watch("dropId") ?? undefined}
              onValueChange={(value) => form.setValue("dropId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select drop" />
              </SelectTrigger>
              <SelectContent>
                {drops.map((drop) => (
                  <SelectItem key={drop.id} value={drop.id}>
                    {drop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="editionLimit">Edition Limit</Label>
            <Input
              id="editionLimit"
              type="number"
              {...form.register("editionLimit")}
              placeholder="20"
            />
            {form.formState.errors.editionLimit && (
              <p className="text-xs text-heuse-crimson">
                {form.formState.errors.editionLimit.message}
              </p>
            )}
          </div>
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

      {/* Variants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-semibold text-heuse-cream">
            Variants (Sizes)
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariant}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Size
          </Button>
        </div>
        <div className="space-y-2">
          {variants.map((variant, index) => (
            <div key={index} className="flex gap-4 items-center">
              <Select
                value={variant.size}
                onValueChange={(value) => updateVariant(index, "size", value)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={variant.stock}
                onChange={(e) =>
                  updateVariant(index, "stock", parseInt(e.target.value) || 0)
                }
                placeholder="Stock"
                className="w-24"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeVariant(index)}
              >
                <Trash2 className="h-4 w-4 text-heuse-crimson" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="space-y-4">
        <h3 className="text-lg font-heading font-semibold text-heuse-cream">
            Product Images
          </h3>
        <UploadButton
          onUploadComplete={(urls) => setImages([...images, ...urls])}
          maxFiles={10}
        />
        <ImagePreview
          urls={images}
          onRemove={(index) => {
            const newImages = images.filter((_, i) => i !== index);
            setImages(newImages);
          }}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : product ? "Update Product" : "Create Product"}
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
