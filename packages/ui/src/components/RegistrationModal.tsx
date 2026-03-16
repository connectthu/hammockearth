"use client";

import { useState, useCallback } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CalendarExportButton } from "./CalendarExportButton";

const API_URL =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth")
    : "https://api.hammock.earth";

// Initialise Stripe outside component to avoid re-creating on each render
let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    stripePromise = loadStripe(pk);
  }
  return stripePromise;
}

interface EventSummary {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string;
  description: string | null;
  price_cents: number;
}

type Step = "details" | "payment" | "confirmation" | "waitlisted";

interface RegistrationModalProps {
  event: EventSummary;
  spotsRemaining?: number | null;
  onClose: () => void;
}

// ─── Inner payment form (needs Stripe context) ────────────────────────────────
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
        {paying
          ? "Processing…"
          : `Pay $${(amountCents / 100).toFixed(2)} CAD`}
      </button>
    </form>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function RegistrationModal({ event, spotsRemaining, onClose }: RegistrationModalProps) {
  const [step, setStep] = useState<Step>("details");
  const [clientSecret, setClientSecret] = useState("");
  const [amountCents, setAmountCents] = useState(event.price_cents);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const maxQuantity = spotsRemaining != null ? Math.min(spotsRemaining, 10) : 10;
  const [quantity, setQuantity] = useState(1);
  const [discountInput, setDiscountInput] = useState("");
  const [discountCode, setDiscountCode] = useState<{
    code: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const baseTotal = event.price_cents * quantity;
  const discountAmount = discountCode
    ? discountCode.discount_type === "percent"
      ? Math.round((baseTotal * discountCode.discount_value) / 100)
      : Math.min(discountCode.discount_value, baseTotal)
    : 0;
  const total = Math.max(0, baseTotal - discountAmount);

  const applyDiscount = useCallback(async () => {
    if (!discountInput.trim()) return;
    setApplyingCode(true);
    setDiscountError(null);
    try {
      const res = await fetch(`${API_URL}/discount-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountInput.trim(), quantity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDiscountError(data.message ?? "Invalid discount code");
      } else {
        const data = await res.json();
        setDiscountCode(data.discountCode);
      }
    } catch {
      setDiscountError("Could not validate code. Please try again.");
    } finally {
      setApplyingCode(false);
    }
  }, [discountInput, quantity]);

  const continueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`${API_URL}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: event.slug,
          guestName: name,
          guestEmail: email,
          quantity,
          discountCode: discountCode?.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.status === "waitlisted") {
        setStep("waitlisted");
        return;
      }

      if (data.status === "confirmed") {
        setStep("confirmation");
        return;
      }

      setClientSecret(data.clientSecret);
      setAmountCents(data.amountCents);
      setStep("payment");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-soil/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-linen">
          <div>
            <h2 className="font-serif text-xl text-soil">{event.title}</h2>
            <p className="text-sm text-charcoal/60 mt-1">
              {new Date(event.start_at).toLocaleDateString("en-CA", {
                weekday: "short",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {event.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-charcoal/40 hover:text-charcoal transition-colors ml-4 mt-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* ── Step 1: Details ── */}
          {step === "details" && (
            <form onSubmit={continueToPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-moss uppercase tracking-wide mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-moss uppercase tracking-wide mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-moss uppercase tracking-wide mb-2">
                  Tickets
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setQuantity(q => Math.max(1, q - 1)); setDiscountCode(null); }}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-xl border border-linen text-charcoal/60 text-lg font-medium hover:border-clay/40 disabled:opacity-30 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1));
                      setQuantity(v);
                      setDiscountCode(null);
                    }}
                    className="w-16 text-center border border-linen rounded-xl py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-clay/30"
                  />
                  <button
                    type="button"
                    onClick={() => { setQuantity(q => Math.min(maxQuantity, q + 1)); setDiscountCode(null); }}
                    disabled={quantity >= maxQuantity}
                    className="w-10 h-10 rounded-xl border border-linen text-charcoal/60 text-lg font-medium hover:border-clay/40 disabled:opacity-30 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-sm text-charcoal/50">
                    ticket{quantity > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {event.price_cents > 0 && (
              <div>
                <label className="block text-xs font-medium text-moss uppercase tracking-wide mb-1">
                  Discount code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value.toUpperCase());
                      setDiscountCode(null);
                      setDiscountError(null);
                    }}
                    className="flex-1 border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 uppercase"
                    placeholder="WELCOME10"
                  />
                  <button
                    type="button"
                    onClick={applyDiscount}
                    disabled={!discountInput.trim() || applyingCode}
                    className="px-4 py-2.5 rounded-xl border border-clay/40 text-clay text-sm font-medium hover:bg-clay/5 disabled:opacity-40 transition-colors"
                  >
                    {applyingCode ? "…" : "Apply"}
                  </button>
                </div>
                {discountError && (
                  <p className="text-xs text-red-500 mt-1">{discountError}</p>
                )}
                {discountCode && (
                  <p className="text-xs text-moss mt-1">
                    Code applied ✓
                  </p>
                )}
              </div>
              )}

              {/* Price breakdown */}
              <div className="bg-linen rounded-xl p-4 space-y-1 text-sm">
                {event.price_cents === 0 ? (
                  <div className="flex justify-between font-semibold text-soil">
                    <span>Total</span>
                    <span>Free</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-charcoal/70">
                      <span>
                        ${(event.price_cents / 100).toFixed(2)} × {quantity}
                      </span>
                      <span>${(baseTotal / 100).toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-moss">
                        <span>Discount</span>
                        <span>−${(discountAmount / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-soil border-t border-linen/80 pt-1 mt-1">
                      <span>Total</span>
                      <span>${(total / 100).toFixed(2)} CAD</span>
                    </div>
                  </>
                )}
              </div>

              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Loading…" : total === 0 ? "Register for free" : "Continue to payment"}
              </button>
            </form>
          )}

          {/* ── Step 2: Payment ── */}
          {step === "payment" && clientSecret && (
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
                onSuccess={() => setStep("confirmation")}
              />
            </Elements>
          )}

          {/* ── Step 3: Confirmation ── */}
          {step === "confirmation" && (
            <div className="text-center space-y-4">
              <div className="text-4xl">🌿</div>
              <h3 className="font-serif text-xl text-soil">
                You're registered!
              </h3>
              <p className="text-sm text-charcoal/70">
                A confirmation email with your .ics file is on its way
                to <strong>{email}</strong>.
              </p>
              <div className="bg-linen rounded-xl p-4 text-left text-sm space-y-1">
                <p className="font-medium text-soil">{event.title}</p>
                <p className="text-charcoal/60">
                  {new Date(event.start_at).toLocaleDateString("en-CA", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-charcoal/60">{event.location}</p>
              </div>
              <CalendarExportButton event={event} />
              <button
                onClick={onClose}
                className="w-full border border-linen text-charcoal/70 font-medium py-2.5 px-6 rounded-full hover:border-clay/40 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          )}

          {/* ── Waitlisted ── */}
          {step === "waitlisted" && (
            <div className="text-center space-y-4">
              <div className="text-4xl">🕊️</div>
              <h3 className="font-serif text-xl text-soil">
                You're on the waitlist
              </h3>
              <p className="text-sm text-charcoal/70">
                This event is full, but we've added you to the waitlist.
                We'll email <strong>{email}</strong> if a spot opens up.
              </p>
              <button
                onClick={onClose}
                className="w-full border border-linen text-charcoal/70 font-medium py-2.5 px-6 rounded-full hover:border-clay/40 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
