"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  onChange: (url: string) => void;
}

export function AvatarUpload({ userId, currentUrl, onChange }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const resized = await resizeImage(file, 256, 256);
    const path = `avatars/${userId}/${Date.now()}.jpg`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("AvatarUpload")
      .upload(path, resized, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("AvatarUpload").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-linen hover:border-clay/40 transition-colors group"
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-linen flex items-center justify-center text-3xl">
            🌿
          </div>
        )}
        <div className="absolute inset-0 bg-soil/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-white text-xs font-medium">Change</span>
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
