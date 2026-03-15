"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiGet } from "@/lib/api";
import type { FacilitatorInquiry } from "@hammock/database";

export default function FacilitatorInquiriesPage() {
  const [inquiries, setInquiries] = useState<FacilitatorInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<FacilitatorInquiry[]>("/facilitator-inquiries")
      .then(setInquiries)
      .catch(() => setError("Failed to load. Check admin password."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-soil">
          Facilitator Inquiries ({inquiries.length})
        </h1>
      </div>

      {loading && (
        <div className="text-center py-20 text-charcoal/50">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && inquiries.length === 0 && !error && (
        <div className="text-center py-20 text-charcoal/50">
          No inquiries yet.
        </div>
      )}

      {inquiries.length > 0 && (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              className="bg-white rounded-2xl border border-linen p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-soil">{inq.name}</p>
                  <a
                    href={`mailto:${inq.email}`}
                    className="text-sm text-clay hover:underline"
                  >
                    {inq.email}
                  </a>
                </div>
                <span className="text-xs text-charcoal/40">
                  {new Date(inq.created_at).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="text-sm text-charcoal/70 whitespace-pre-line leading-relaxed">
                {inq.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
