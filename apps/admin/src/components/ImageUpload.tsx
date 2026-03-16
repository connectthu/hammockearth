"use client";

import { useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function getAuthHeader(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("admin_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/upload/event-cover`, {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Upload failed");
      }

      const { url } = await res.json();
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-linen rounded-xl p-6 text-center cursor-pointer hover:border-clay/40 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <p className="text-sm text-charcoal/60">Uploading…</p>
        ) : (
          <>
            <p className="text-sm text-charcoal/60">
              Drop an image here or{" "}
              <span className="text-clay">click to upload</span>
            </p>
            <p className="text-xs text-charcoal/40 mt-1">
              JPG, PNG, WebP · Max 5MB
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {value && (
        <div className="relative rounded-xl overflow-hidden aspect-[16/9]">
          <img
            src={value}
            alt="Cover preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-soil/70 text-cream text-xs px-2.5 py-1 rounded-full hover:bg-soil transition-colors"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
