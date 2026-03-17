"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
    );
  }
  return stripePromise;
}

const TIER_LABELS: Record<string, string> = {
  founding: "Founding",
  early_bird: "Early Bird",
  regular: "Regular",
};

const TIER_PRICES: Record<string, number> = {
  founding: 80000,
  early_bird: 108000,
  regular: 135000,
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString("en-CA")} CAD`;
}

// ── Inner payment form ────────────────────────────────────────────────────────
function PaymentForm({
  amountCents,
  onSuccess,
}: {
  amountCents: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const { error: confirmError, paymentIntent } =
      await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== "undefined" ? window.location.href : "",
        },
        redirect: "if_required",
      });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      setError("Something went wrong. Please try again.");
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
      >
        {paying ? "Processing…" : `Pay ${formatPrice(amountCents)}`}
      </button>
    </form>
  );
}

// ── Main checkout page ────────────────────────────────────────────────────────
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tier = searchParams.get("tier") ?? "season_pass"; // 'season_pass' | 'farm_friend'
  const window = searchParams.get("window") ?? "founding"; // price window slug

  const [step, setStep] = useState<"details" | "payment" | "success">("details");
  const [clientSecret, setClientSecret] = useState("");
  const [amountCents, setAmountCents] = useState(
    tier === "farm_friend" ? 1000 : TIER_PRICES[window] ?? 80000
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from Supabase auth session
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
      if (user?.user_metadata?.full_name) setName(user.user_metadata.full_name);
    });
  }, []);

  const tierLabel =
    tier === "farm_friend"
      ? "Farm Friend"
      : `${TIER_LABELS[window] ?? "Season Pass"} — Season Pass`;

  const priceDisplay =
    tier === "farm_friend" ? "$10/month" : formatPrice(amountCents);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push(`/members/login?next=/members/checkout?tier=${tier}&window=${window}`);
        return;
      }

      const body: Record<string, string> = {
        membershipType: tier,
        name,
        email,
      };
      if (tier === "season_pass") {
        body.priceWindowSlug = window;
      }

      const res = await fetch(`${API_URL}/memberships/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      setClientSecret(data.clientSecret);
      setAmountCents(data.amountCents);
      setStep("payment");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="pt-16 min-h-screen bg-cream">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <p className="section-label mb-2">Join Hammock Earth</p>
            <h1 className="font-serif text-3xl text-soil">{tierLabel}</h1>
            <p className="text-xl font-serif text-clay mt-2">{priceDisplay}</p>
          </div>

          <div className="bg-white rounded-2xl border border-linen p-8 shadow-sm">
            {step === "details" && (
              <form onSubmit={handleContinue} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-moss uppercase tracking-wide mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full border border-linen rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-moss uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-linen rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                  />
                </div>

                {/* Price summary */}
                <div className="bg-linen rounded-xl p-4 text-sm">
                  <div className="flex justify-between font-semibold text-soil">
                    <span>{tierLabel}</span>
                    <span>{priceDisplay}</span>
                  </div>
                  {tier === "farm_friend" && (
                    <p className="text-charcoal/50 text-xs mt-1">
                      Billed monthly · Cancel anytime
                    </p>
                  )}
                  {tier === "season_pass" && (
                    <p className="text-charcoal/50 text-xs mt-1">
                      One-time · Valid through December 31, 2026
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading…" : "Continue to Payment"}
                </button>
              </form>
            )}

            {step === "payment" && clientSecret && (
              <div className="space-y-4">
                <div className="bg-linen rounded-xl p-4 text-sm flex justify-between">
                  <span className="text-charcoal/70">{tierLabel}</span>
                  <span className="font-semibold text-soil">
                    {formatPrice(amountCents)}
                  </span>
                </div>
                <Elements
                  stripe={getStripe()}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: { colorPrimary: "#C4845A" },
                    },
                  }}
                >
                  <PaymentForm
                    amountCents={amountCents}
                    onSuccess={() => setStep("success")}
                  />
                </Elements>
              </div>
            )}

            {step === "success" && (
              <div className="text-center space-y-5">
                <div className="text-5xl">🌿</div>
                <h2 className="font-serif text-2xl text-soil">
                  Welcome to Hammock Earth!
                </h2>
                <p className="text-sm text-charcoal/70">
                  Your membership is active. A welcome email is on its way to{" "}
                  <strong>{email}</strong>.
                </p>
                <a
                  href="/members/dashboard"
                  className="inline-block w-full text-center bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors"
                >
                  Go to Dashboard
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function MembersCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutContent />
    </Suspense>
  );
}
