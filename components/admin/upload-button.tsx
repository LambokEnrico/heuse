"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadthingClient } from "@/lib/uploadthing";
import { toast } from "@/components/ui/toast";

interface UploadButtonProps {
  onUploadComplete: (urls: string[]) => void;
  className?: string;
  maxFiles?: number;
}

export function UploadButton({
  onUploadComplete,
  className,
  maxFiles = 10,
}: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileArray = Array.from(files).slice(0, maxFiles);

      const results = await uploadthingClient.uploadFiles("productImage", {
        files: fileArray,
      });

      const urls = results
        .filter((r) => r !== undefined)
        .map((r) => r.url);

      if (urls.length > 0) {
        onUploadComplete(urls);
        toast({
          title: "Upload Complete",
          description: `${urls.length} image(s) uploaded successfully`,
        });
      }
    } catch (error) {
      console.error("[UploadButton]", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed border-heuse-border rounded-sm p-6 text-center transition-colors",
        dragOver && "border-heuse-gold bg-heuse-gold/5",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
        id="file-upload"
        disabled={uploading}
      />
      <label
        htmlFor="file-upload"
        className={cn(
          "flex flex-col items-center gap-3 cursor-pointer",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        {uploading ? (
          <div className="animate-spin">
            <Upload className="h-8 w-8 text-heuse-muted" />
          </div>
        ) : (
          <Upload className="h-8 w-8 text-heuse-muted" />
        )}
        <div>
          <p className="text-sm text-heuse-text font-medium">
            {uploading ? "Uploading..." : "Click to upload or drag & drop"}
          </p>
          <p className="text-xs text-heuse-muted mt-1">
            PNG, JPG, WEBP up to 4MB (max {maxFiles} files)
          </p>
        </div>
      </label>
    </div>
  );
}

interface ImagePreviewProps {
  urls: string[];
  onRemove: (index: number) => void;
}

export function ImagePreview({ urls, onRemove }: ImagePreviewProps) {
  if (urls.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {urls.map((url, index) => (
        <div key={index} className="relative group">
          <img
            src={url}
            alt={`Preview ${index + 1}`}
            className="w-full h-32 object-cover rounded-sm border border-heuse-border"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute -top-2 -right-2 p-1 bg-heuse-crimson rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
          <span className="absolute bottom-2 left-2 text-xs bg-heuse-black/70 text-white px-2 py-0.5 rounded">
            {index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}