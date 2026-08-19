"use client";
import { getErrorMessage } from "@/lib/errors";

import * as React from "react";
import { Button } from "./button";
import type { CloudinaryImage } from "@/lib/schemas";
import type { CloudinaryFolder } from "@/lib/cloudinary";

interface ImageUploadProps {
  value?: string | CloudinaryImage;
  label?: string;
  folder: CloudinaryFolder;
  onUpload: (image: CloudinaryImage) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

function getPreviewUrl(value?: string | CloudinaryImage): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return (
    value.secureUrl ||
    value.url ||
    value.transformations?.card ||
    value.transformations?.thumbnail ||
    ""
  );
}

export function ImageUpload({
  value,
  label = "Upload image",
  folder,
  onUpload,
  onError,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [previewError, setPreviewError] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Compute previewUrl during render - no useMemo with setState
  const previewUrl = getPreviewUrl(value);

  const showError = (text: string) => {
    setMessage(text);
    onError?.(text);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("alt", file.name);
    formData.append("folder", folder);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        showError(result?.error || "Failed to upload image");
        return;
      }

      onUpload(result.data);
    } catch (error: unknown) {
      showError(getErrorMessage(error) || "Failed to upload image");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? "Uploading..." : label}
        </Button>

        {previewUrl && !previewError ? (
          <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <img
              src={previewUrl}
              alt="Image preview"
              className="h-full w-full object-cover"
              onError={() => setPreviewError(true)}
            />
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {message ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{message}</p>
      ) : null}
    </div>
  );
}