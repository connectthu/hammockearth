"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
  }
  return stripePromise;
}

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function PaymentForm({ amountCents, onSuccess }: { amountCents: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: typeof window !== "undefined" ? window.location.href : "" },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setPaying(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      setError("Something went wrong. Please try again.");
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50 text-sm"
      >
        {paying ? "Processing…" : `Pay $${(amountCents / 100).toFixed(2)} CAD`}
      </button>
    </form>
  );
}

interface Props {
  billingType: "one_time" | "monthly";
  validUntil: string | null;
}

export default function TryAMonthClient({ billingType, validUntil }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<"renew" | "auto-renew" | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const isAutoRenew = billingType === "monthly";
  const expiryDate = validUntil
    ? new Date(validUntil).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })
    : null;

  async function openRenewModal() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/memberships/try-a-month/renew`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setAmountCents(data.amountCents);
      setModal("renew");
    } catch {
      setError("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function openAutoRenewModal() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();

      const res = await fetch(`${API_URL}/memberships/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipType: "try_a_month",
          billingMode: "recurring",
          name: user.user_metadata?.full_name ?? "",
          email: user.email ?? "",
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setAmountCents(data.amountCents);
      setModal("auto-renew");
    } catch {
      setError("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelAutoRenew() {
    if (!confirm("Cancel auto-renew? Your membership will remain active until " + (expiryDate ?? "the end of your current period") + ".")) return;
    setCancelLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/memberships/try-a-month/auto-renew`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Failed to cancel. Please contact us.");
    } finally {
      setCancelLoading(false);
    }
  }

  function onPaymentSuccess() {
    setModal(null);
    setClientSecret(null);
    router.refresh();
  }

  return (
    <>
      {/* Expiry info */}
      {expiryDate && (
        <p className="text-xs text-charcoal/50 mt-1">
          {isAutoRenew ? "Renews" : "Expires"} {expiryDate}
        </p>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="mt-4 pt-4 border-t border-linen space-y-2">
        {!isAutoRenew && (
          <>
            <button
              onClick={openRenewModal}
              disabled={loading}
              className="w-full text-sm font-medium text-clay border border-clay/30 rounded-full py-2 hover:bg-clay/5 transition-colors disabled:opacity-50"
            >
              {loading && modal === null ? "Loading…" : "Buy another month ($150)"}
            </button>
            <button
              onClick={openAutoRenewModal}
              disabled={loading}
              className="w-full text-sm text-charcoal/50 hover:text-soil transition-colors py-1 disabled:opacity-50"
            >
              Switch to monthly ($140/mo)
            </button>
          </>
        )}

        {isAutoRenew && (
          <button
            onClick={cancelAutoRenew}
            disabled={cancelLoading}
            className="w-full text-xs text-charcoal/40 hover:text-red-500 transition-colors py-1 disabled:opacity-50"
          >
            {cancelLoading ? "Cancelling…" : "Cancel auto-renew"}
          </button>
        )}
      </div>

      {/* Payment modal */}
      {modal && clientSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-soil/40 backdrop-blur-sm" onClick={() => { setModal(null); setClientSecret(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-serif text-xl text-soil">
                  {modal === "renew" ? "Buy another month" : "Monthly membership"}
                </h2>
                <p className="text-sm text-charcoal/60 mt-1">
                  {modal === "renew" ? "30 days from your current expiry · $150 CAD" : "$140 CAD/month · cancel anytime"}
                </p>
              </div>
              <button onClick={() => { setModal(null); setClientSecret(null); }} className="text-charcoal/40 hover:text-charcoal ml-4">✕</button>
            </div>
            <Elements
              stripe={getStripe()}
              options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#C4845A" } } }}
            >
              <PaymentForm amountCents={amountCents} onSuccess={onPaymentSuccess} />
            </Elements>
          </div>
        </div>
      )}
    </>
  );
}
