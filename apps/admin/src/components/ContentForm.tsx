"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImageUpload } from "@/components/ImageUpload";
import { getAuthHeader } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

const CONTENT_TYPES = [
  { value: "blog_post", label: "Blog Post" },
  { value: "meditation", label: "Meditation" },
  { value: "video", label: "Video" },
  { value: "recipe", label: "Recipe" },
  { value: "reflection", label: "Reflection" },
  { value: "guide", label: "Guide" },
  { value: "audio", label: "Audio" },
  { value: "link", label: "Link" },
];

const TOPICS = [
  { value: "nervous_system", label: "Nervous System" },
  { value: "homesteading", label: "Homesteading" },
  { value: "nature_immersion", label: "Nature Immersion" },
  { value: "community_building", label: "Community Building" },
  { value: "wellness", label: "Wellness" },
  { value: "cooking", label: "Cooking" },
  { value: "permaculture", label: "Permaculture" },
  { value: "creative_expression", label: "Creative Expression" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", description: "Anyone" },
  { value: "registered", label: "Registered", description: "Logged-in users" },
  { value: "member", label: "Member", description: "Paying members" },
  { value: "collaborator", label: "Collaborator", description: "Collaborators & admins" },
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export interface ContentFormValues {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  cover_image_url: string;
  content_type: string;
  media_url: string;
  media_kind: string;
  external_url: string;
  topics: string[];
  visible_to: string[];
  is_featured: boolean;
  read_time_minutes: string;
  watch_listen_minutes: string;
  published_at: string;
}

interface ContentFormProps {
  initialValues?: Partial<ContentFormValues>;
  mode: "create" | "edit";
}

export function ContentForm({ initialValues, mode }: ContentFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ContentFormValues>({
    title: "",
    slug: "",
    summary: "",
    body: "",
    cover_image_url: "",
    content_type: "blog_post",
    media_url: "",
    media_kind: "",
    external_url: "",
    topics: [],
    visible_to: ["public"],
    is_featured: false,
    read_time_minutes: "",
    watch_listen_minutes: "",
    published_at: mode === "create" ? new Date().toISOString().slice(0, 16) : "",
    ...initialValues,
  });

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);

  function set<K extends keyof ContentFormValues>(key: K, val: ContentFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handleTitleChange(title: string) {
    setValues((prev) => ({
      ...prev,
      title,
      slug: mode === "create" ? slugify(title) : prev.slug,
    }));
  }

  function toggleTopic(topic: string) {
    setValues((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  }

  function toggleVisibility(vis: string) {
    setValues((prev) => ({
      ...prev,
      visible_to: prev.visible_to.includes(vis)
        ? prev.visible_to.filter((v) => v !== vis)
        : [...prev.visible_to, vis],
    }));
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/upload/content-media`, {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url, kind } = await res.json();
      setValues((prev) => ({ ...prev, media_url: url, media_kind: kind }));
    } catch (err) {
      setBanner({ type: "error", message: "Media upload failed" });
    } finally {
      setMediaUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title || !values.slug || !values.content_type) {
      setBanner({ type: "error", message: "Title, slug, and content type are required" });
      return;
    }
    if (values.visible_to.length === 0) {
      setBanner({ type: "error", message: "Select at least one visibility level" });
      return;
    }

    setSaving(true);
    setBanner(null);

    const payload = {
      title: values.title,
      slug: values.slug,
      summary: values.summary || undefined,
      body: values.body || undefined,
      cover_image_url: values.cover_image_url || undefined,
      content_type: values.content_type,
      media_url: values.media_url || undefined,
      media_kind: values.media_kind || undefined,
      external_url: values.external_url || undefined,
      topics: values.topics,
      visible_to: values.visible_to,
      is_featured: values.is_featured,
      read_time_minutes: values.read_time_minutes ? Number(values.read_time_minutes) : undefined,
      watch_listen_minutes: values.watch_listen_minutes ? Number(values.watch_listen_minutes) : undefined,
      published_at: values.published_at || undefined,
    };

    try {
      const url = mode === "create"
        ? `${API_URL}/content`
        : `${API_URL}/content/${values.id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `API error ${res.status}`);
      }

      setBanner({ type: "success", message: mode === "create" ? "Content created!" : "Saved." });

      if (mode === "create") {
        const created = await res.json();
        router.push(`/content/${(created as any).id}/edit`);
      }
    } catch (err: any) {
      setBanner({ type: "error", message: err.message ?? "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {banner && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            banner.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-soil mb-1">Title *</label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
          placeholder="Enter title…"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-soil mb-1">Slug *</label>
        <input
          type="text"
          value={values.slug}
          onChange={(e) => set("slug", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-linen text-sm font-mono focus:outline-none focus:ring-2 focus:ring-clay/30"
          placeholder="url-slug"
        />
      </div>

      {/* Summary */}
      <div>
        <label className="block text-sm font-medium text-soil mb-1">Summary</label>
        <textarea
          value={values.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-linen text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay/30"
          placeholder="Short description shown in cards and previews…"
        />
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-sm font-medium text-soil mb-2">Cover Image</label>
        <ImageUpload
          value={values.cover_image_url}
          onChange={(url) => set("cover_image_url", url)}
          uploadEndpoint="/upload/content-cover"
        />
      </div>

      {/* Content type */}
      <div>
        <label className="block text-sm font-medium text-soil mb-2">Content Type *</label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("content_type", t.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                values.content_type === t.value
                  ? "bg-clay text-white border-clay"
                  : "bg-white border-linen text-soil/60 hover:border-clay/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div>
        <label className="block text-sm font-medium text-soil mb-2">Topics</label>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleTopic(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                values.topics.includes(t.value)
                  ? "bg-moss text-white border-moss"
                  : "bg-white border-linen text-soil/60 hover:border-moss/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-soil mb-2">Visible to *</label>
        <div className="flex flex-wrap gap-2">
          {VISIBILITY_OPTIONS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => toggleVisibility(v.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                values.visible_to.includes(v.value)
                  ? "bg-soil text-cream border-soil"
                  : "bg-white border-linen text-soil/60 hover:border-soil/30"
              }`}
            >
              {v.label}
              <span className="ml-1 opacity-60 text-xs">— {v.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Read / watch time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-soil mb-1">Read time (min)</label>
          <input
            type="number"
            min="0"
            value={values.read_time_minutes}
            onChange={(e) => set("read_time_minutes", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
            placeholder="e.g. 5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-soil mb-1">Watch/listen time (min)</label>
          <input
            type="number"
            min="0"
            value={values.watch_listen_minutes}
            onChange={(e) => set("watch_listen_minutes", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
            placeholder="e.g. 20"
          />
        </div>
      </div>

      {/* Published at */}
      <div className="grid grid-cols-2 gap-4 items-start">
        <div>
          <label className="block text-sm font-medium text-soil mb-1">Publish date</label>
          <input
            type="datetime-local"
            value={values.published_at ? values.published_at.slice(0, 16) : ""}
            onChange={(e) =>
              set("published_at", e.target.value ? new Date(e.target.value).toISOString() : "")
            }
            className="w-full px-4 py-2.5 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
          />
          <p className="text-xs text-soil/40 mt-1">Leave empty to keep as draft</p>
        </div>
        <div className="pt-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={values.is_featured}
              onChange={(e) => set("is_featured", e.target.checked)}
              className="w-4 h-4 accent-clay"
            />
            <div>
              <span className="text-sm font-medium text-soil">Featured (hero post)</span>
              <p className="text-xs text-soil/40">Sets as the hero on /library. Unsets any previous featured item.</p>
            </div>
          </label>
        </div>
      </div>

      {/* Media upload */}
      <div>
        <label className="block text-sm font-medium text-soil mb-2">Media (video / audio / PDF)</label>
        {values.media_url ? (
          <div className="flex items-center gap-3 p-3 bg-linen rounded-xl">
            <span className="text-sm text-soil/70 flex-1 truncate">{values.media_url}</span>
            <button
              type="button"
              onClick={() => setValues((p) => ({ ...p, media_url: "", media_kind: "" }))}
              className="text-xs text-soil/40 hover:text-red-500"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="block border-2 border-dashed border-linen rounded-xl p-6 text-center cursor-pointer hover:border-clay/40 transition-colors">
            <input
              type="file"
              accept="video/*,audio/*,application/pdf"
              className="hidden"
              onChange={handleMediaUpload}
              disabled={mediaUploading}
            />
            {mediaUploading ? (
              <p className="text-sm text-soil/50">Uploading…</p>
            ) : (
              <>
                <p className="text-sm text-soil/50">
                  Drop a file or <span className="text-clay">click to upload</span>
                </p>
                <p className="text-xs text-soil/30 mt-1">MP4, MOV, MP3, WAV, PDF · Max 200MB</p>
              </>
            )}
          </label>
        )}
      </div>

      {/* External URL */}
      <div>
        <label className="block text-sm font-medium text-soil mb-1">External URL</label>
        <input
          type="url"
          value={values.external_url}
          onChange={(e) => set("external_url", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
          placeholder="https://…"
        />
        <p className="text-xs text-soil/40 mt-1">For Link type: shown as a visit card or embedded player (YouTube/Vimeo)</p>
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-soil mb-2">Body</label>
        <div className="rounded-xl border border-linen overflow-hidden">
          <RichTextEditor value={values.body} onChange={(html) => set("body", html)} />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-clay text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : mode === "create" ? "Create" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/content")}
          className="text-sm text-soil/50 hover:text-soil px-4 py-2.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
