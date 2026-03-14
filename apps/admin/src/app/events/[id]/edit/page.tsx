"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { EventForm } from "@/components/EventForm";
import { apiGet, apiPatch } from "@/lib/api";
import type { Event } from "@hammock/database";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // id could be slug or UUID — try slug first via admin listing
    apiGet<Event[]>("/events/admin")
      .then((events) => {
        const found = events.find((e) => e.id === id || e.slug === id);
        if (!found) throw new Error("Event not found");
        setEvent(found);
      })
      .catch(() => setError("Event not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    if (!event) return;
    await apiPatch(`/events/${event.slug}`, data);
    router.push("/events");
  }

  return (
    <AdminShell>
      <div className="max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <a href="/events" className="text-sm text-charcoal/50 hover:text-charcoal">
            ← Events
          </a>
          <h1 className="font-serif text-2xl text-soil">Edit Event</h1>
        </div>

        {loading && (
          <div className="text-center py-20 text-charcoal/50">Loading...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {event && (
          <div className="bg-white rounded-2xl border border-linen p-8">
            <EventForm
              initialData={event}
              onSubmit={handleSubmit}
              submitLabel="Update Event"
            />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
