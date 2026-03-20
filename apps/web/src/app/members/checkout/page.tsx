"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
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
  regular: 120000,
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
  const tier = searchParams.get("tier") ?? "season_pass"; // 'season_pass' | 'farm_friend' | 'try_a_month'
  const window = searchParams.get("window") ?? "founding"; // price window slug
  const isTryAMonth = tier === "try_a_month";

  const [billingMode, setBillingMode] = useState<"one_time" | "recurring">("one_time");
  const [step, setStep] = useState<"details" | "payment" | "success">("details");
  const [clientSecret, setClientSecret] = useState("");
  const [amountCents, setAmountCents] = useState(
    tier === "farm_friend" ? 1000 : isTryAMonth ? 15000 : TIER_PRICES[window] ?? 80000
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    discountCents: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const tierLabel =
    tier === "farm_friend"
      ? "Farm Friend"
      : isTryAMonth
      ? "Try a Month"
      : `${TIER_LABELS[window] ?? "Seasons Pass"} — Seasons Pass`;

  const priceDisplay =
    tier === "farm_friend"
      ? "$10/month"
      : isTryAMonth
      ? billingMode === "recurring" ? "$140/month" : "$150 CAD"
      : formatPrice(amountCents);

  const basePrice = tier === "farm_friend" ? 1000 : isTryAMonth ? (billingMode === "recurring" ? 14000 : 15000) : TIER_PRICES[window] ?? 80000;
  const discountedPrice = appliedCoupon
    ? Math.max(0, basePrice - appliedCoupon.discountCents)
    : basePrice;

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch(`${API_URL}/discount-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.message ?? "Invalid coupon code.");
        setAppliedCoupon(null);
        return;
      }
      const dc = data.discountCode;
      const discountCents =
        dc.discount_type === "percent"
          ? Math.round((basePrice * dc.discount_value) / 100)
          : Math.min(dc.discount_value, basePrice);
      setAppliedCoupon({
        code: dc.code,
        discountType: dc.discount_type,
        discountValue: dc.discount_value,
        discountCents,
      });
      setCouponInput("");
    } catch {
      setCouponError("Network error. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, string> = {
        membershipType: tier,
        name,
        email,
      };
      if (tier === "season_pass") {
        body.priceWindowSlug = window;
      }
      if (isTryAMonth) {
        body.billingMode = billingMode;
      }
      if (appliedCoupon) {
        body.discountCode = appliedCoupon.code;
      }

      const res = await fetch(`${API_URL}/memberships/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.free) {
        setStep("success");
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

                {/* Billing mode toggle — try_a_month only */}
                {isTryAMonth && (
                  <div>
                    <label className="block text-xs font-medium text-moss uppercase tracking-wide mb-2">
                      Billing
                    </label>
                    <div className="flex rounded-xl border border-linen overflow-hidden text-sm">
                      <button
                        type="button"
                        onClick={() => setBillingMode("one_time")}
                        className={`flex-1 py-2.5 px-4 text-center transition-colors ${billingMode === "one_time" ? "bg-soil text-cream font-medium" : "text-charcoal/60 hover:bg-linen"}`}
                      >
                        One-time · $150
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingMode("recurring")}
                        className={`flex-1 py-2.5 px-4 text-center transition-colors ${billingMode === "recurring" ? "bg-soil text-cream font-medium" : "text-charcoal/60 hover:bg-linen"}`}
                      >
                        Monthly · $140/mo
                      </button>
                    </div>
                  </div>
                )}

                {/* Coupon code — season pass only */}
                {tier === "season_pass" && (
                  <div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-moss/10 border border-moss/20 rounded-xl px-4 py-3 text-sm">
                        <span className="text-moss font-medium">
                          {appliedCoupon.code} —{" "}
                          {appliedCoupon.discountType === "percent"
                            ? `${appliedCoupon.discountValue}% off`
                            : `${formatPrice(appliedCoupon.discountCents)} off`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppliedCoupon(null)}
                          className="text-xs text-charcoal/50 hover:text-charcoal ml-3"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value); setCouponError(null); }}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                          placeholder="Coupon code"
                          className="flex-1 border border-linen rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="px-4 py-3 rounded-xl border border-linen text-sm font-medium text-moss hover:bg-linen transition-colors disabled:opacity-50"
                        >
                          {couponLoading ? "…" : "Apply"}
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-xs text-red-600 mt-1.5">{couponError}</p>
                    )}
                  </div>
                )}

                {/* Price summary */}
                <div className="bg-linen rounded-xl p-4 text-sm">
                  <div className="flex justify-between font-semibold text-soil">
                    <span>{tierLabel}</span>
                    <span>{priceDisplay}</span>
                  </div>
                  {appliedCoupon && (
                    <>
                      <div className="flex justify-between text-moss mt-1">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>−{formatPrice(appliedCoupon.discountCents)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-soil border-t border-linen mt-2 pt-2">
                        <span>Total</span>
                        <span>{formatPrice(discountedPrice)}</span>
                      </div>
                    </>
                  )}
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
                  {isTryAMonth && (
                    <p className="text-charcoal/50 text-xs mt-1">
                      {billingMode === "recurring" ? "Billed monthly · Cancel anytime" : "One-time · 30 days of full membership access"}
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
                  Check your email — we&apos;ve sent a welcome message and a link to
                  activate your account to <strong>{email}</strong>.
                </p>
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
