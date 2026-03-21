"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor").then((m) => ({ default: m.RichTextEditor })),
  { ssr: false }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Toronto",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/Toronto",
  });
}

export default function CollaboratorEventsClient({
  assignedEvents,
}: {
  assignedEvents: any[];
}) {
  const [events, setEvents] = useState<any[]>(assignedEvents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editConfirmationDetails, setEditConfirmationDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(event: any) {
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description ?? "");
    setEditConfirmationDetails(event.confirmation_details ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit(event: any) {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_URL}/events/${event.slug}/collaborator`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editTitle, description: editDescription, confirmationDetails: editConfirmationDetails }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Error ${res.status}`);
      }

      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? { ...e, title: editTitle, description: editDescription, confirmation_details: editConfirmationDetails }
            : e
        )
      );
      setEditingId(null);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="font-serif text-xl text-soil mb-4">Your Events</h2>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-linen p-8 text-center text-charcoal/50">
          No events assigned yet. An admin will link events to your account.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl border border-linen p-5"
            >
              <div className="flex gap-4">
                {event.cover_image_url ? (
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-linen flex items-center justify-center flex-shrink-0 text-2xl">
                    🌿
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-soil leading-snug">
                      {event.title}
                    </h3>
                    <span
                      className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        event.status === "published"
                          ? "bg-green-50 text-green-700"
                          : "bg-linen text-charcoal/50"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal/50 mb-0.5">
                    {formatDate(event.start_at)} · {formatTime(event.start_at)}
                  </p>
                  <p className="text-xs text-charcoal/50 mb-3">{event.location}</p>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/events/${event.slug}`}
                      className="text-xs font-medium text-charcoal/50 hover:text-soil transition-colors"
                    >
                      View →
                    </a>
                    <button
                      onClick={() => startEdit(event)}
                      className="text-xs font-medium text-clay hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {editingId === event.id && (
                <div className="mt-4 pt-4 border-t border-linen space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-charcoal/60 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-linen bg-cream px-3 py-2 text-sm text-soil focus:outline-none focus:ring-2 focus:ring-clay/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal/60 mb-1.5">
                      Description
                    </label>
                    <RichTextEditor value={editDescription} onChange={setEditDescription} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal/60 mb-1">
                      Confirmation details
                    </label>
                    <p className="text-xs text-charcoal/40 mb-1.5">
                      Included in the booking confirmation email (e.g. Zoom link, what to bring, etc.)
                    </p>
                    <RichTextEditor value={editConfirmationDetails} onChange={setEditConfirmationDetails} />
                  </div>
                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => saveEdit(event)}
                      disabled={saving}
                      className="text-sm font-medium text-white bg-clay rounded-lg px-4 py-2 hover:bg-clay/90 disabled:opacity-60 transition-colors"
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-sm text-charcoal/50 hover:text-soil transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
