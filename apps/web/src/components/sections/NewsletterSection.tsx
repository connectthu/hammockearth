"use client";

import { useState } from "react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth"}/waitlist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            first_name: firstName || undefined,
            source: "homepage",
          }),
        }
      );
      if (!res.ok && res.status !== 409) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="newsletter" className="py-24 bg-cream">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <p className="section-label mb-4">Stay Connected</p>
        <h2 className="font-serif text-3xl sm:text-4xl text-soil mb-4">
          Join the Hammock Earth community
        </h2>
        <p className="text-charcoal/70 mb-10">
          Be the first to hear about events, programs, and seasonal offerings
          from the land. No noise — just what matters.
        </p>

        {status === "done" ? (
          <div className="bg-moss/10 rounded-2xl p-8 border border-moss/20">
            <div className="text-3xl mb-3">🌿</div>
            <p className="font-serif text-xl text-soil mb-2">
              Welcome to the community.
            </p>
            <p className="text-charcoal/70 text-sm">
              We're glad you're here. Watch for seasonal updates in your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="First name (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="flex-1 px-5 py-3 rounded-full border border-linen bg-white focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm"
              />
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-3 rounded-full border border-linen bg-white focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full sm:w-auto bg-clay text-white font-medium px-10 py-3 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors text-sm"
            >
              {status === "loading" ? "Joining..." : "Join the Community"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">
                Something went wrong. Please try again.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
