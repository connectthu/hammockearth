"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiPatch } from "@/lib/api";

const STATUS_OPTIONS = ["active", "cancelled", "expired"];

const typeLabels: Record<string, string> = {
  season_pass: "Seasons Pass",
  farm_friend: "Farm Friend",
  try_a_month: "Try a Month",
  community_partner: "Community Partner",
};

const windowLabels: Record<string, string> = {
  founding: "Founding",
  early_bird: "Early Bird",
  regular: "Regular",
};

export default function AdminMembershipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [membership, setMembership] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    loadMembership();
  }, [id]);

  async function loadMembership() {
    setLoading(true);
    try {
      // Fetch all and find by ID (no single-endpoint)
      const data = await apiGet<any[]>("/memberships");
      const found = data.find((m) => m.id === id);
      if (!found) {
        setError("Membership not found");
        return;
      }
      setMembership(found);
      setNewStatus(found.status);
    } catch {
      setError("Failed to load membership.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate() {
    if (!membership || newStatus === membership.status) return;
    setSaving(true);
    try {
      await apiPatch(`/memberships/${id}`, { status: newStatus });
      setMembership({ ...membership, status: newStatus });
    } catch {
      alert("Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  const profile = membership?.profiles as any;

  return (
    <AdminShell>
      <div className="mb-6">
        <Link
          href="/memberships"
          className="text-sm text-charcoal/50 hover:text-clay transition-colors"
        >
          ← Back to Members
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

      {membership && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-2xl border border-linen p-6">
            <h1 className="font-serif text-2xl text-soil mb-6">
              {typeLabels[membership.membership_type] ?? membership.membership_type}
            </h1>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-charcoal/50 mb-1">Member</dt>
                <dd className="font-medium text-soil">
                  {profile?.full_name ?? "—"}
                </dd>
                <dd className="text-charcoal/50 text-xs mt-0.5 font-mono">
                  {membership.user_id}
                </dd>
              </div>

              <div>
                <dt className="text-charcoal/50 mb-1">Price Window</dt>
                <dd className="font-medium text-soil">
                  {membership.price_window
                    ? windowLabels[membership.price_window] ?? membership.price_window
                    : "—"}
                </dd>
              </div>

              <div>
                <dt className="text-charcoal/50 mb-1">Billing</dt>
                <dd className="font-medium text-soil capitalize">
                  {membership.billing_type?.replace("_", " ") ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-charcoal/50 mb-1">Joined</dt>
                <dd className="font-medium text-soil">
                  {new Date(membership.created_at).toLocaleDateString("en-CA")}
                </dd>
              </div>

              {membership.valid_until && (
                <div>
                  <dt className="text-charcoal/50 mb-1">Valid Until</dt>
                  <dd className="font-medium text-soil">
                    {new Date(membership.valid_until).toLocaleDateString("en-CA")}
                  </dd>
                </div>
              )}

              {membership.stripe_payment_id && (
                <div>
                  <dt className="text-charcoal/50 mb-1">Stripe Payment</dt>
                  <dd className="font-mono text-xs text-charcoal/70 truncate">
                    {membership.stripe_payment_id}
                  </dd>
                </div>
              )}

              {membership.stripe_subscription_id && (
                <div>
                  <dt className="text-charcoal/50 mb-1">Subscription ID</dt>
                  <dd className="font-mono text-xs text-charcoal/70 truncate">
                    {membership.stripe_subscription_id}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status update */}
          <div className="bg-white rounded-2xl border border-linen p-6">
            <h2 className="font-medium text-soil mb-4">Update Status</h2>
            <div className="flex items-center gap-3">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={saving || newStatus === membership.status}
                className="bg-clay text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Update"}
              </button>
            </div>
            {newStatus !== membership.status && (
              <p className="text-xs text-charcoal/50 mt-2">
                Current: <strong>{membership.status}</strong> → New:{" "}
                <strong>{newStatus}</strong>
              </p>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
