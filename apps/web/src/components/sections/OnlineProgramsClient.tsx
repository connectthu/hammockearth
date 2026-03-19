"use client";

import { useState } from "react";
import { EventCard, SeriesCard } from "@hammock/ui";

const programs = [
  {
    emoji: "🌿",
    title: "Ecological Belonging",
    description:
      "An immersive journey into what it means to live in relationship with land, seasons, and community. Practices, stories, and a framework for reconnection.",
  },
  {
    emoji: "🌱",
    title: "Regenerative Food Culture",
    description:
      "Exploring the people, farms, and practices behind a generous Canadian food culture — and how we each play a role in making it real.",
  },
  {
    emoji: "✨",
    title: "Embodied Creation in the Age of AI",
    description:
      "How do we create our dreams with AI without losing our humanity? How do we build our businesses, communities and organizations with presence, embodiment and values? A 6-week Embodied Creator Lab exploring Inner technology and Outer technology.",
  },
  {
    emoji: "🌸",
    title: "Embodiment Circle Fall 2026",
    description:
      "The Safety, Freedom & Joy of Being Your True Self. A 12-week journey and celebration of your becoming — rooted in safety, creativity, courage, and lived wisdom, guided by a diverse circle of facilitators who share the practices that shaped their own becoming.",
  },
];

function WaitlistForm({ program }: { program: string }) {
  const [email, setEmail] = useState("");
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
          body: JSON.stringify({ email, source: `online_programs_${program}` }),
        }
      );
      if (!res.ok && res.status !== 409) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-moss mt-2">You're on the list!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 text-sm px-4 py-2 rounded-full border border-linen bg-white focus:outline-none focus:ring-2 focus:ring-clay/30"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="text-sm bg-clay text-white px-5 py-2 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
      >
        {status === "loading" ? "..." : "Join waitlist"}
      </button>
    </form>
  );
}

type Event = {
  id: string;
  title: string;
  slug: string;
  event_type: string | null;
  start_at: string;
  location: string;
  price_cents: number;
  member_price_cents: number;
  cover_image_url: string | null;
  is_online: boolean;
  registration_url: string | null;
  registration_note: string | null;
  tags: string[] | null;
};

type SeriesItem = {
  id: string;
  title: string;
  slug: string;
  duration_weeks: number;
  session_count: number;
  price_cents: number;
  member_price_cents: number;
  drop_in_enabled: boolean;
  drop_in_price_cents: number | null;
  cover_image_url: string | null;
  is_online: boolean;
  tags: string[] | null;
  event_series_sessions: { start_at: string; session_number: number }[] | null;
};

export function OnlineProgramsClient({ events, seriesList = [] }: { events: Event[]; seriesList?: SeriesItem[] }) {
  const hasLiveContent = events.length > 0 || seriesList.length > 0;
  return (
    <section id="programs" className="py-24 bg-soil">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="section-label text-moss mb-4">Online</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-cream mb-4">
            Programs
          </h2>
          <p className="text-cream/70 max-w-2xl mx-auto">
            Can't make it to the land? Our online offerings bring the spirit of
            Hammock Earth into homes and hearts wherever you are in the world.
          </p>
        </div>

        {hasLiveContent && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {events.slice(0, 3).map((event) => (
                <EventCard
                  key={event.id}
                  title={event.title}
                  slug={event.slug}
                  eventType={event.event_type}
                  startAt={event.start_at}
                  location={event.location}
                  priceCents={event.price_cents}
                  memberPriceCents={event.member_price_cents}
                  coverImageUrl={event.cover_image_url}
                  isOnline={event.is_online}
                  registrationUrl={event.registration_url}
                  registrationNote={event.registration_note}
                  tags={event.tags ?? []}
                />
              ))}
              {seriesList.slice(0, Math.max(0, 3 - Math.min(events.length, 3))).map((s) => {
                const firstSession = [...(s.event_series_sessions ?? [])]
                  .sort((a, b) => a.session_number - b.session_number)[0];
                return (
                  <SeriesCard
                    key={s.id}
                    title={s.title}
                    slug={s.slug}
                    startAt={firstSession?.start_at ?? new Date().toISOString()}
                    durationWeeks={s.duration_weeks}
                    sessionCount={s.session_count}
                    priceCents={s.price_cents}
                    memberPriceCents={s.member_price_cents}
                    dropInEnabled={s.drop_in_enabled}
                    dropInPriceCents={s.drop_in_price_cents}
                    coverImageUrl={s.cover_image_url}
                    isOnline={s.is_online}
                    tags={s.tags ?? []}
                  />
                );
              })}
            </div>
            <div className="text-center mb-6">
              <a
                href="/events?type=online"
                className="inline-flex items-center gap-2 text-clay font-medium hover:text-clay/80 transition-colors"
              >
                View all programs →
              </a>
            </div>
            <div className="border-t border-cream/10 my-12" />
          </>
        )}

        <div className="mb-8">
          <h3 className="font-serif text-2xl text-cream mb-1">Coming Soon</h3>
          <p className="text-cream/50 text-sm">Join the waitlist to be notified when these programs open.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {programs.map((p) => (
            <div
              key={p.title}
              className="bg-cream/5 backdrop-blur border border-cream/10 rounded-2xl p-8"
            >
              <div className="text-3xl mb-4">{p.emoji}</div>
              <h3 className="font-serif text-xl text-cream mb-3">{p.title}</h3>
              <p className="text-cream/70 text-sm leading-relaxed mb-4">
                {p.description}
              </p>
              <WaitlistForm program={p.title.toLowerCase().replace(/\s+/g, "_")} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
