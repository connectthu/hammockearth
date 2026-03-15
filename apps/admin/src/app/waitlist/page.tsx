"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiGet } from "@/lib/api";
import type { WaitlistSignup } from "@hammock/database";

export default function WaitlistPage() {
  const [signups, setSignups] = useState<WaitlistSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<WaitlistSignup[]>("/waitlist")
      .then(setSignups)
      .catch(() => setError("Failed to load. Check admin password."))
      .finally(() => setLoading(false));
  }, []);

  function downloadCsv() {
    const headers = ["email", "first_name", "source", "created_at"];
    const rows = signups.map((s) =>
      [s.email, s.first_name ?? "", s.source, s.created_at].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "waitlist-signups.csv";
    a.click();
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-soil">
          Waitlist Signups ({signups.length})
        </h1>
        {signups.length > 0 && (
          <button
            onClick={downloadCsv}
            className="text-sm text-moss hover:text-moss/80 border border-moss/30 px-4 py-2 rounded-full transition-colors"
          >
            Export CSV
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-20 text-charcoal/50">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && signups.length === 0 && !error && (
        <div className="text-center py-20 text-charcoal/50">No signups yet.</div>
      )}

      {signups.length > 0 && (
        <div className="bg-white rounded-2xl border border-linen overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linen bg-linen/50">
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">Email</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden sm:table-cell">Name</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id} className="border-b border-linen last:border-0">
                  <td className="px-4 py-3 text-soil">{s.email}</td>
                  <td className="px-4 py-3 text-charcoal/70 hidden sm:table-cell">
                    {s.first_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-charcoal/50 hidden md:table-cell text-xs">
                    {s.source}
                  </td>
                  <td className="px-4 py-3 text-charcoal/50 text-xs">
                    {new Date(s.created_at).toLocaleDateString("en-CA")}
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
