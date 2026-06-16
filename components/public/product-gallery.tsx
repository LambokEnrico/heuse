"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageData {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

interface Props {
  images: ImageData[];
  productName: string;
}

export function ProductGallery({ images, productName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-heuse-dark flex items-center justify-center text-heuse-muted">
        No Image Available
      </div>
    );
  }

  const selectedImage = images[selectedIndex];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-[3/4] bg-heuse-dark overflow-hidden">
        <Image
          src={selectedImage.url}
          alt={selectedImage.alt || productName}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-24 bg-heuse-dark overflow-hidden border-2 transition-colors",
                selectedIndex === index ? "border-heuse-gold" : "border-transparent hover:border-heuse-muted"
              )}
            >
              <Image
                src={image.url}
                alt={image.alt || `${productName} - Image ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}