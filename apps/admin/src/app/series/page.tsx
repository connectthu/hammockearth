"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiDelete } from "@/lib/api";

type Series = {
  id: string;
  title: string;
  slug: string;
  status: string;
  duration_weeks: number;
  session_count: number;
  price_cents: number;
  created_at: string;
};

const statusColors: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminSeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    setLoading(true);
    try {
      const data = await apiGet<Series[]>("/series?admin=true");
      setSeriesList(data);
    } catch {
      setError("Failed to load series.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Cancel "${title}"?`)) return;
    setDeleting(id);
    try {
      await apiDelete(`/series/${id}`);
      await loadSeries();
    } catch {
      alert("Failed to cancel series.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-soil">Series</h1>
        <Link
          href="/series/new"
          className="inline-flex items-center gap-2 bg-clay text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-clay/90 transition-colors"
        >
          + New Series
        </Link>
      </div>

      {loading && <div className="text-center py-20 text-charcoal/50">Loading...</div>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && seriesList.length === 0 && (
        <div className="text-center py-20 text-charcoal/50">
          <p className="text-lg mb-4">No series yet.</p>
          <Link
            href="/series/new"
            className="inline-flex items-center gap-2 bg-clay text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-clay/90 transition-colors"
          >
            Create your first series
          </Link>
        </div>
      )}

      {seriesList.length > 0 && (
        <div className="bg-white rounded-2xl border border-linen overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linen bg-linen/50">
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">Title</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden sm:table-cell">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden md:table-cell">Price</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">Status</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {seriesList.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-soil leading-snug">{s.title}</p>
                    <p className="text-xs text-charcoal/50 mt-0.5">{s.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-charcoal/70 hidden sm:table-cell">
                    {s.duration_weeks}w · {s.session_count} sessions
                  </td>
                  <td className="px-4 py-3 text-charcoal/70 hidden md:table-cell">
                    ${(s.price_cents / 100).toFixed(0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/series/${s.id}/edit`} className="text-xs text-clay hover:underline">
                        Edit
                      </Link>
                      <Link href={`/series/${s.id}/sessions`} className="text-xs text-moss hover:underline">
                        Sessions
                      </Link>
                      <Link href={`/series/${s.id}/access-grants`} className="text-xs text-charcoal/50 hover:underline">
                        Grants
                      </Link>
                      {s.status !== "cancelled" && (
                        <button
                          onClick={() => handleDelete(s.id, s.title)}
                          disabled={deleting === s.id}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          {deleting === s.id ? "..." : "Cancel"}
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
