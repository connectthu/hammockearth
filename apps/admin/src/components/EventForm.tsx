"use client";

import { useState } from "react";
import type { Event } from "@hammock/database";

type EventFormData = {
  title: string;
  slug: string;
  description: string;
  event_type: string;
  start_at: string;
  end_at: string;
  location: string;
  is_online: boolean;
  capacity: string;
  price_cents: string;
  member_price_cents: string;
  member_ticket_allowance: string;
  visibility: "public" | "members_only";
  status: "draft" | "published" | "cancelled";
  registration_url: string;
  registration_note: string;
  tags: string;
  cover_image_url: string;
};

function toFormData(event?: Partial<Event>): EventFormData {
  const toDatetimeLocal = (iso?: string | null) => {
    if (!iso) return "";
    return new Date(iso).toISOString().slice(0, 16);
  };

  return {
    title: event?.title ?? "",
    slug: event?.slug ?? "",
    description: event?.description ?? "",
    event_type: event?.event_type ?? "",
    start_at: toDatetimeLocal(event?.start_at),
    end_at: toDatetimeLocal(event?.end_at),
    location: event?.location ?? "Hammock Hills, Hillsdale, Ontario",
    is_online: event?.is_online ?? false,
    capacity: event?.capacity?.toString() ?? "",
    price_cents: event?.price_cents ? (event.price_cents / 100).toString() : "",
    member_price_cents: event?.member_price_cents
      ? (event.member_price_cents / 100).toString()
      : "",
    member_ticket_allowance:
      event?.member_ticket_allowance?.toString() ?? "2",
    visibility: event?.visibility ?? "public",
    status: event?.status ?? "draft",
    registration_url: event?.registration_url ?? "",
    registration_note: event?.registration_note ?? "",
    tags: event?.tags?.join(", ") ?? "",
    cover_image_url: event?.cover_image_url ?? "",
  };
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface EventFormProps {
  initialData?: Partial<Event>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
}

export function EventForm({
  initialData,
  onSubmit,
  submitLabel = "Save Event",
}: EventFormProps) {
  const [form, setForm] = useState<EventFormData>(toFormData(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof EventFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleTitleChange(title: string) {
    set("title", title);
    if (!initialData?.slug) {
      set("slug", slugify(title));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onSubmit({
        title: form.title,
        slug: form.slug,
        description: form.description || undefined,
        event_type: form.event_type || undefined,
        cover_image_url: form.cover_image_url || undefined,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : undefined,
        end_at: form.end_at ? new Date(form.end_at).toISOString() : undefined,
        location: form.location,
        is_online: form.is_online,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        price_cents: form.price_cents
          ? Math.round(parseFloat(form.price_cents) * 100)
          : 0,
        member_price_cents: form.member_price_cents
          ? Math.round(parseFloat(form.member_price_cents) * 100)
          : 0,
        member_ticket_allowance: parseInt(form.member_ticket_allowance) || 2,
        visibility: form.visibility,
        status: form.status,
        registration_url: form.registration_url || undefined,
        registration_note: form.registration_note || undefined,
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-linen bg-white focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm";
  const labelClass = "block text-sm font-medium text-soil mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
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
          <label className={labelClass}>Event type</label>
          <input
            type="text"
            value={form.event_type}
            onChange={(e) => set("event_type", e.target.value)}
            placeholder="e.g. Workshop, Full Day Retreat"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Start *</label>
          <input
            type="datetime-local"
            required
            value={form.start_at}
            onChange={(e) => set("start_at", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>End</label>
          <input
            type="datetime-local"
            value={form.end_at}
            onChange={(e) => set("end_at", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Location *</label>
          <input
            type="text"
            required
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Public price (CAD)</label>
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
          <label className={labelClass}>Capacity</label>
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => set("capacity", e.target.value)}
            placeholder="Unlimited"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Member ticket allowance</label>
          <input
            type="number"
            min="1"
            max="10"
            value={form.member_ticket_allowance}
            onChange={(e) => set("member_ticket_allowance", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Visibility</label>
          <select
            value={form.visibility}
            onChange={(e) =>
              set("visibility", e.target.value as "public" | "members_only")
            }
            className={inputClass}
          >
            <option value="public">Public</option>
            <option value="members_only">Members only</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={(e) =>
              set(
                "status",
                e.target.value as "draft" | "published" | "cancelled"
              )
            }
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <input
            type="checkbox"
            id="is_online"
            checked={form.is_online}
            onChange={(e) => set("is_online", e.target.checked)}
            className="w-4 h-4 text-clay"
          />
          <label htmlFor="is_online" className="text-sm text-charcoal">
            This is an online event
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Description</label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Registration URL</label>
          <input
            type="url"
            value={form.registration_url}
            onChange={(e) => set("registration_url", e.target.value)}
            placeholder="External checkout URL (optional)"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Registration note</label>
          <input
            type="text"
            value={form.registration_note}
            onChange={(e) => set("registration_note", e.target.value)}
            placeholder="e.g. Registration opening soon"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Cover image URL</label>
          <input
            type="url"
            value={form.cover_image_url}
            onChange={(e) => set("cover_image_url", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Tags (comma-separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="workshop, garden, retreat"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pt-4 border-t border-linen">
        <a
          href="/events"
          className="text-sm text-charcoal/60 hover:text-charcoal"
        >
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
