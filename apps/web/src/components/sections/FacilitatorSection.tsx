"use client";

import { useState } from "react";

export function FacilitatorSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth"}/facilitator-inquiries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="facilitator" className="py-24 bg-linen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="section-label mb-4">Space & Facilitation</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-soil mb-4">
            🔑 Facilitator / Space Rental
          </h2>
          <p className="text-charcoal/70 leading-relaxed">
            Are you a facilitator or community member interested in renting
            Hammock Hills for your own events? We'd love to hear from you.
          </p>
        </div>

        {status === "done" ? (
          <div className="bg-moss/10 rounded-2xl p-8 border border-moss/20 text-center">
            <div className="text-3xl mb-3">✓</div>
            <p className="font-serif text-xl text-soil mb-2">
              Inquiry received.
            </p>
            <p className="text-charcoal/70 text-sm">
              We'll be in touch at {form.email} shortly.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-8 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-soil mb-1">
                Your name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-linen focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-soil mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-linen focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-soil mb-1">
                Tell us about your vision
              </label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="What kind of event are you envisioning? What dates? How many people?"
                className="w-full px-4 py-3 rounded-xl border border-linen focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-clay text-white font-medium py-3 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors text-sm"
            >
              {status === "loading" ? "Sending..." : "Send Inquiry"}
            </button>

            {status === "error" && (
              <p className="text-sm text-red-600 text-center">
                Something went wrong. Please email us at{" "}
                <a href="mailto:hello@hammock.earth" className="underline">
                  hello@hammock.earth
                </a>
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
