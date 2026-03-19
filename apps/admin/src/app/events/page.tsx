"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { Event } from "@hammock/database";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const data = await apiGet<Event[]>("/events/admin");
      setEvents(data);
    } catch (e) {
      setError("Failed to load events. Check your admin password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(slug: string) {
    setDuplicating(slug);
    try {
      const created = await apiPost<Event>(`/events/${slug}/duplicate`, {});
      router.push(`/events/${created.id}/edit`);
    } catch {
      alert("Failed to duplicate event.");
    } finally {
      setDuplicating(null);
    }
  }

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Cancel "${title}"? This will soft-delete the event.`)) return;
    setDeleting(slug);
    try {
      await apiDelete(`/events/${slug}`);
      await loadEvents();
    } catch {
      alert("Failed to cancel event.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-soil">Events</h1>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 bg-clay text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-clay/90 transition-colors"
        >
          + New Event
        </Link>
      </div>

      {loading && (
        <div className="text-center py-20 text-charcoal/50">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-20 text-charcoal/50">
          <p className="text-lg mb-4">No events yet.</p>
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 bg-clay text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-clay/90 transition-colors"
          >
            Create your first event
          </Link>
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-white rounded-2xl border border-linen overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linen bg-linen/50">
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">
                  Event
                </th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden sm:table-cell">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden md:table-cell">
                  Price
                </th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">
                  Status
                </th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-soil leading-snug">
                        {event.title}
                      </p>
                      <a
                        href={`${process.env.NEXT_PUBLIC_WEB_URL ?? "https://hammock.earth"}/events/${event.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-charcoal/50 hover:text-clay mt-0.5 inline-block"
                      >
                        {event.slug} ↗
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-charcoal/70 hidden sm:table-cell">
                    {formatDate(event.start_at)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-charcoal/70">{formatPrice(event.price_cents)}</span>
                    {event.member_price_cents > 0 && event.member_price_cents < event.price_cents && (
                      <span className="text-moss text-xs ml-1.5">· Members {formatPrice(event.member_price_cents)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[event.status] ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/events/${event.id}/edit`}
                        className="text-xs text-clay hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/events/${event.id}/registrations`}
                        className="text-xs text-moss hover:underline"
                      >
                        Registrations
                      </Link>
                      <button
                        onClick={() => handleDuplicate(event.slug)}
                        disabled={duplicating === event.slug}
                        className="text-xs text-charcoal/60 hover:underline disabled:opacity-50"
                      >
                        {duplicating === event.slug ? "Duplicating…" : "Duplicate"}
                      </button>
                      {event.status !== "cancelled" && (
                        <button
                          onClick={() => handleDelete(event.slug, event.title)}
                          disabled={deleting === event.slug}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          {deleting === event.slug ? "..." : "Cancel"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
