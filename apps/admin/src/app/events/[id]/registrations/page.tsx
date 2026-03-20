"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { apiGet } from "@/lib/api";
import type { Event } from "@hammock/database";

interface Registration {
  id: string;
  guest_name: string;
  guest_email: string;
  quantity: number;
  status: "pending" | "confirmed" | "waitlisted" | "cancelled";
  amount_paid_cents: number;
  notes: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  waitlisted: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

function exportCsv(event: Event, registrations: Registration[]) {
  const headers = ["Name", "Email", "Tickets", "Amount Paid", "Status", "Notes", "Registered At"];
  const rows = registrations.map((r) => [
    r.guest_name,
    r.guest_email,
    r.quantity,
    r.amount_paid_cents > 0 ? `$${(r.amount_paid_cents / 100).toFixed(2)}` : "Free",
    r.status,
    r.notes ?? "",
    new Date(r.created_at).toLocaleString("en-CA"),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registrations-${event.slug}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventRegistrationsPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const events = await apiGet<Event[]>("/events/admin");
        const found = events.find((e) => e.id === id || e.slug === id);
        setEvent(found ?? null);
        if (found) {
          const regs = await apiGet<Registration[]>(`/registrations/admin?eventId=${found.id}`);
          setRegistrations(regs);
        }
      } catch (err) {
        setError("Failed to load registrations.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const waitlisted = registrations.filter((r) => r.status === "waitlisted");
  const totalTickets = confirmed.reduce((sum, r) => sum + r.quantity, 0);
  const totalRevenue = confirmed.reduce((sum, r) => sum + r.amount_paid_cents, 0);

  return (
    <AdminShell>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href="/events" className="text-sm text-charcoal/50 hover:text-charcoal">
              ← Events
            </a>
            <h1 className="font-serif text-2xl text-soil">
              {loading ? "Loading…" : (event?.title ?? "Event not found")}
            </h1>
          </div>
          {event && registrations.length > 0 && (
            <button
              onClick={() => exportCsv(event, registrations)}
              className="text-sm bg-soil text-cream px-4 py-2 rounded-full hover:bg-soil/80 transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>

        {loading && (
          <p className="text-charcoal/50 text-sm">Loading…</p>
        )}

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {!loading && !error && event && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Confirmed", value: confirmed.length },
                { label: "Tickets sold", value: totalTickets },
                { label: "Waitlisted", value: waitlisted.length },
                { label: "Revenue", value: totalRevenue > 0 ? `$${(totalRevenue / 100).toFixed(2)}` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-linen rounded-2xl p-4">
                  <p className="text-xs text-charcoal/50 uppercase tracking-wide mb-1">{label}</p>
                  <p className="font-serif text-2xl text-soil">{value}</p>
                </div>
              ))}
            </div>

            {registrations.length === 0 ? (
              <div className="bg-linen rounded-2xl p-8 text-center text-charcoal/60">
                No registrations yet.
              </div>
            ) : (
              <div className="rounded-2xl border border-linen overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-linen/50 border-b border-linen">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-charcoal/60">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden sm:table-cell">Email</th>
                      <th className="text-center px-4 py-3 font-medium text-charcoal/60">Tickets</th>
                      <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden md:table-cell">Notes</th>
                      <th className="text-center px-4 py-3 font-medium text-charcoal/60">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-charcoal/60 hidden sm:table-cell">Paid</th>
                      <th className="text-right px-4 py-3 font-medium text-charcoal/60 hidden lg:table-cell">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((r) => (
                      <tr key={r.id} className="border-t border-linen hover:bg-linen/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-soil">{r.guest_name}</td>
                        <td className="px-4 py-3 text-charcoal/70 hidden sm:table-cell">{r.guest_email}</td>
                        <td className="px-4 py-3 text-center text-charcoal/70">{r.quantity}</td>
                        <td className="px-4 py-3 text-charcoal/60 hidden md:table-cell max-w-xs truncate">
                          {r.notes ?? <span className="text-charcoal/30">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] ?? ""}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-charcoal/70 hidden sm:table-cell">
                          {r.amount_paid_cents > 0 ? `$${(r.amount_paid_cents / 100).toFixed(2)}` : "Free"}
                        </td>
                        <td className="px-4 py-3 text-right text-charcoal/50 hidden lg:table-cell">
                          {new Date(r.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
