"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { apiGet } from "@/lib/api";

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
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-600",
};

const typeLabels: Record<string, string> = {
  season_pass: "Season Pass",
  farm_friend: "Farm Friend",
  try_a_month: "Try a Month",
  community_partner: "Community Partner",
};

const windowLabels: Record<string, string> = {
  founding: "Founding",
  early_bird: "Early Bird",
  regular: "Regular",
};

export default function AdminMembershipsPage() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMemberships();
  }, []);

  async function loadMemberships() {
    setLoading(true);
    try {
      const data = await apiGet<any[]>("/memberships");
      setMemberships(data);
    } catch {
      setError("Failed to load memberships. Check your admin password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-soil">Members</h1>
        <span className="text-sm text-charcoal/50">
          {memberships.length} total
        </span>
      </div>

      {loading && (
        <div className="text-center py-20 text-charcoal/50">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && memberships.length === 0 && (
        <div className="text-center py-20 text-charcoal/50">
          No members yet.
        </div>
      )}

      {memberships.length > 0 && (
        <div className="bg-white rounded-2xl border border-linen overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linen bg-linen/50">
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">
                  Member
                </th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden sm:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden md:table-cell">
                  Window
                </th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden lg:table-cell">
                  Joined
                </th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => {
                const profile = m.profiles as any;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-soil leading-snug">
                        {profile?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-charcoal/50 mt-0.5 font-mono">
                        {m.user_id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-4 py-3 text-charcoal/70 hidden sm:table-cell">
                      {typeLabels[m.membership_type] ?? m.membership_type}
                    </td>
                    <td className="px-4 py-3 text-charcoal/70 hidden md:table-cell">
                      {m.price_window ? windowLabels[m.price_window] ?? m.price_window : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[m.status] ?? "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal/70 hidden lg:table-cell">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/memberships/${m.id}`}
                          className="text-xs text-clay hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
