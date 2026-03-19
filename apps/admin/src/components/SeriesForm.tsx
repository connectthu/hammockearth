"use client";

import { useState } from "react";
import { RichTextEditor } from "./RichTextEditor";
import { ImageUpload } from "./ImageUpload";
import { DateTimePicker } from "./DateTimePicker";
import { torontoNaiveToUTC } from "@/lib/dateUtils";

type SeriesFormData = {
  title: string;
  slug: string;
  description: string;
  cover_image_url: string;
  is_online: boolean;
  location: string;
  duration_weeks: string;
  session_count: string;
  first_session_at: string;
  session_frequency: "weekly" | "biweekly" | "monthly";
  session_duration_minutes: string;
  price_cents: string;
  member_price_cents: string;
  drop_in_enabled: boolean;
  drop_in_price_cents: string;
  drop_in_member_price_cents: string;
  visibility: "public" | "members_only";
  status: "draft" | "published" | "cancelled";
  tags: string;
};

type InitialSeries = Partial<{
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  is_online: boolean;
  location: string | null;
  duration_weeks: number;
  session_count: number;
  price_cents: number;
  member_price_cents: number;
  drop_in_enabled: boolean;
  drop_in_price_cents: number | null;
  drop_in_member_price_cents: number | null;
  visibility: "public" | "members_only";
  status: "draft" | "published" | "cancelled";
  tags: string[];
}>;

function toFormData(s?: InitialSeries): SeriesFormData {
  return {
    title: s?.title ?? "",
    slug: s?.slug ?? "",
    description: s?.description ?? "",
    cover_image_url: s?.cover_image_url ?? "",
    is_online: s?.is_online ?? true,
    location: s?.location ?? "",
    duration_weeks: s?.duration_weeks?.toString() ?? "",
    session_count: s?.session_count?.toString() ?? "",
    first_session_at: "",
    session_frequency: "weekly",
    session_duration_minutes: "90",
    price_cents: s?.price_cents ? (s.price_cents / 100).toString() : "",
    member_price_cents: s?.member_price_cents ? (s.member_price_cents / 100).toString() : "",
    drop_in_enabled: s?.drop_in_enabled ?? false,
    drop_in_price_cents: s?.drop_in_price_cents ? (s.drop_in_price_cents / 100).toString() : "",
    drop_in_member_price_cents: s?.drop_in_member_price_cents ? (s.drop_in_member_price_cents / 100).toString() : "",
    visibility: s?.visibility ?? "public",
    status: s?.status ?? "draft",
    tags: s?.tags?.join(", ") ?? "",
  };
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface SeriesFormProps {
  initialData?: InitialSeries;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  isEdit?: boolean;
}

export function SeriesForm({ initialData, onSubmit, submitLabel = "Save Series", isEdit = false }: SeriesFormProps) {
  const [form, setForm] = useState<SeriesFormData>(toFormData(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof SeriesFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleTitleChange(title: string) {
    set("title", title);
    if (!initialData?.slug) set("slug", slugify(title));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        slug: form.slug,
        description: form.description || undefined,
        coverImageUrl: form.cover_image_url || undefined,
        isOnline: form.is_online,
        location: form.location || undefined,
        priceCents: form.price_cents ? Math.round(parseFloat(form.price_cents) * 100) : 0,
        memberPriceCents: form.member_price_cents ? Math.round(parseFloat(form.member_price_cents) * 100) : 0,
        dropInEnabled: form.drop_in_enabled,
        dropInPriceCents: form.drop_in_enabled && form.drop_in_price_cents
          ? Math.round(parseFloat(form.drop_in_price_cents) * 100)
          : undefined,
        dropInMemberPriceCents: form.drop_in_enabled && form.drop_in_member_price_cents
          ? Math.round(parseFloat(form.drop_in_member_price_cents) * 100)
          : undefined,
        visibility: form.visibility,
        status: form.status,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

      if (!isEdit) {
        payload.durationWeeks = parseInt(form.duration_weeks) || 1;
        payload.sessionCount = parseInt(form.session_count) || 1;
        payload.firstSessionAt = form.first_session_at
          ? torontoNaiveToUTC(form.first_session_at)
          : undefined;
        payload.sessionFrequency = form.session_frequency;
        payload.sessionDurationMinutes = parseInt(form.session_duration_minutes) || 90;
      }

      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-linen bg-white focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm";
  const labelClass = "block text-sm font-medium text-soil mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClass}>Title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Slug *</label>
          <input
            type="text"
            required
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            className={inputClass}
            pattern="[a-z0-9-]+"
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as SeriesFormData["status"])}
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Duration (weeks) *</label>
          <input
            type="number"
            required
            min="1"
            value={form.duration_weeks}
            onChange={(e) => set("duration_weeks", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Number of sessions *</label>
          <input
            type="number"
            required
            min="1"
            value={form.session_count}
            onChange={(e) => set("session_count", e.target.value)}
            className={inputClass}
          />
        </div>

        {!isEdit && (
          <>
            <div>
              <label className={labelClass}>First session date & time *</label>
              <DateTimePicker
                value={form.first_session_at}
                onChange={(v) => set("first_session_at", v)}
                required={!isEdit}
              />
            </div>

            <div>
              <label className={labelClass}>Session frequency</label>
              <select
                value={form.session_frequency}
                onChange={(e) => set("session_frequency", e.target.value as SeriesFormData["session_frequency"])}
                className={inputClass}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly (every 2 weeks)</option>
                <option value="monthly">Monthly (every 4 weeks)</option>
              </select>
              <p className="text-xs text-charcoal/40 mt-1">Exact dates can be adjusted per session after creation.</p>
            </div>

            <div>
              <label className={labelClass}>Session duration (minutes)</label>
              <input
                type="number"
                min="30"
                value={form.session_duration_minutes}
                onChange={(e) => set("session_duration_minutes", e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div>
          <label className={labelClass}>Full series price (CAD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price_cents}
            onChange={(e) => set("price_cents", e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Member price (CAD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.member_price_cents}
            onChange={(e) => set("member_price_cents", e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Visibility</label>
          <select
            value={form.visibility}
            onChange={(e) => set("visibility", e.target.value as SeriesFormData["visibility"])}
            className={inputClass}
          >
            <option value="public">Public</option>
            <option value="members_only">Members only</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => set("is_online", !form.is_online)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_online ? "bg-moss" : "bg-linen border border-charcoal/20"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_online ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <label className="text-sm text-charcoal">Online series</label>
        </div>

        {!form.is_online && (
          <div className="sm:col-span-2">
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Drop-in toggle */}
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => set("drop_in_enabled", !form.drop_in_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.drop_in_enabled ? "bg-moss" : "bg-linen border border-charcoal/20"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.drop_in_enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <label className="text-sm text-charcoal">Enable drop-in per session</label>
        </div>

        {form.drop_in_enabled && (
          <>
            <div>
              <label className={labelClass}>Drop-in price (CAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.drop_in_price_cents}
                onChange={(e) => set("drop_in_price_cents", e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Drop-in member price (CAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.drop_in_member_price_cents}
                onChange={(e) => set("drop_in_member_price_cents", e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className={labelClass}>Description</label>
          <RichTextEditor
            value={form.description}
            onChange={(html) => set("description", html)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Cover image</label>
          <ImageUpload
            value={form.cover_image_url}
            onChange={(url) => set("cover_image_url", url)}
          />
        </div>

        <div>
          <label className={labelClass}>Tags (comma-separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="embodiment, online, community"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-4 border-t border-linen">
        <a href="/series" className="text-sm text-charcoal/60 hover:text-charcoal">
          Cancel
        </a>
        <button
          type="submit"
          disabled={loading}
          className="bg-clay text-white text-sm font-medium px-8 py-2.5 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
