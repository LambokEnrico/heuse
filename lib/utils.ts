import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HEUSE-${timestamp}-${random}`;
}

export function generateWhatsAppLink(
  phone: string,
  message: string
): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

export function getAvailabilityStatus(
  totalUnits: number,
  reservedUnits: number,
  soldUnits: number
): "available" | "low-stock" | "sold-out" | "reserved" {
  const available = totalUnits - reservedUnits - soldUnits;
  if (available <= 0) return "sold-out";
  if (reservedUnits > 0 && available <= Math.ceil(totalUnits * 0.2))
    return "reserved";
  if (available <= Math.ceil(totalUnits * 0.2)) return "low-stock";
  return "available";
}

export function getAvailabilityLabel(
  status: "available" | "low-stock" | "sold-out" | "reserved"
): string {
  const labels = {
    available: "Available",
    "low-stock": "Low Stock",
    "sold-out": "Sold Out",
    reserved: "Reserved",
  };
  return labels[status];
}

/**
 * Single source of truth for product availability.
 *
 * Prefers variant.stock (simple size-based inventory the admin form manages).
 * Falls back to EditionUnit count when variants haven't been created yet
 * (e.g. limited-edition serial-number flow).
 *
 * @param variants     ProductVariant[] with size + stock
 * @param units        EditionUnit[] (optional) — used only if variants is empty
 * @param editionLimit product.editionLimit — used for low-stock threshold
 */
export function computeProductAvailability(
  variants: { stock: number }[] = [],
  units: { status: string }[] = [],
  editionLimit = 0
): {
  available: number;
  total: number;
  status: "available" | "low-stock" | "sold-out";
  source: "variants" | "edition-units" | "none";
} {
  // Source 1: variants (preferred — what the admin form creates)
  const variantTotal = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  if (variantTotal > 0) {
    const lowThreshold = Math.max(3, Math.ceil(editionLimit * 0.2));
    return {
      available: variantTotal,
      total: variantTotal,
      status: variantTotal <= lowThreshold ? "low-stock" : "available",
      source: "variants",
    };
  }

  // Source 2: edition units (legacy limited-edition serial flow)
  const availableUnits = units.filter(
    (u) => u.status === "AVAILABLE"
  ).length;
  if (availableUnits > 0) {
    return {
      available: availableUnits,
      total: availableUnits,
      status: availableUnits <= 3 ? "low-stock" : "available",
      source: "edition-units",
    };
  }

  // Source 3: nothing
  return { available: 0, total: 0, status: "sold-out", source: "none" };
}