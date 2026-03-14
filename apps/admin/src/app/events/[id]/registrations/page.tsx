"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { apiGet } from "@/lib/api";
import type { Event } from "@hammock/database";

export default function EventRegistrationsPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Event[]>("/events/admin")
      .then((events) => {
        const found = events.find((e) => e.id === id || e.slug === id);
        setEvent(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AdminShell>
      <div className="max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <a href="/events" className="text-sm text-charcoal/50 hover:text-charcoal">
            ← Events
          </a>
          <h1 className="font-serif text-2xl text-soil">
            {loading ? "Loading..." : event?.title ?? "Event not found"}
          </h1>
        </div>

        <div className="bg-linen rounded-2xl p-8 text-center text-charcoal/60">
          <p className="text-lg mb-2">Registrations</p>
          <p className="text-sm">
            Full registrations view arrives in Phase 2 (ticketing). For now,
            check your Supabase dashboard → event_registrations table.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
