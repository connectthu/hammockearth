"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

export default function CancelButtonClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCancel() {
    if (
      !confirm(
        "Cancel your Farm Friend membership? Access will end at the end of your billing period."
      )
    )
      return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const res = await fetch(`${API_URL}/memberships/me`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Failed to cancel. Please contact us.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-linen">
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full text-xs text-charcoal/40 hover:text-red-500 transition-colors py-1 disabled:opacity-50"
      >
        {loading ? "Cancelling…" : "Cancel membership"}
      </button>
    </div>
  );
}
