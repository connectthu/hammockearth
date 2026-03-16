"use client";

import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { EventForm } from "@/components/EventForm";
import { apiPost } from "@/lib/api";

export default function NewEventPage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    await apiPost("/events", data);
    router.push("/events");
  }

  return (
    <AdminShell>
      <div className="max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <a href="/events" className="text-sm text-charcoal/50 hover:text-charcoal">
            ← Events
          </a>
          <h1 className="font-serif text-2xl text-soil">New Event</h1>
        </div>

        <div className="bg-white rounded-2xl border border-linen p-8">
          <EventForm onSubmit={handleSubmit} submitLabel="Create Event" />
        </div>
      </div>
    </AdminShell>
  );
}
