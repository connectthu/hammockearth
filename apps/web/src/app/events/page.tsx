import { createServerClient } from "@hammock/database";
import { EventCard } from "@hammock/ui";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events & Workshops — Hammock Earth",
  description:
    "Seasonal gatherings, farm tours, communal meals, and immersive workshops at Hammock Hills in Hillsdale, Ontario.",
};

export const runtime = "edge";
export const revalidate = 3600;

async function getEvents(tag?: string, type?: string) {
  const supabase = createServerClient();
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("start_at", { ascending: true });

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (type === "in-person") {
    query = query.eq("is_online", false);
  } else if (type === "online") {
    query = query.eq("is_online", true);
  }

  const { data } = await query;
  return data ?? [];
}

async function getAllTags() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("events")
    .select("tags")
    .eq("status", "published")
    .eq("visibility", "public");

  const tags = new Set<string>();
  data?.forEach((e) => e.tags?.forEach((t: string) => tags.add(t)));
  return Array.from(tags).sort();
}

interface PageProps {
  searchParams: { tag?: string; type?: string };
}

export default async function EventsPage({ searchParams }: PageProps) {
  const [events, tags] = await Promise.all([
    getEvents(searchParams.tag, searchParams.type),
    getAllTags(),
  ]);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.start_at) >= now);
  const past = events.filter((e) => new Date(e.start_at) < now);

  return (
    <>
      <Nav />
      <main className="pt-16">
        {/* Header */}
        <div className="bg-linen border-b border-linen py-16 text-center">
          <p className="section-label mb-3">On the Land</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-soil mb-4">
            Events & Workshops
          </h1>
          <p className="text-charcoal/70 max-w-xl mx-auto">
            Seasonal gatherings, farm tours, communal meals, and immersive
            workshops at Hammock Hills in Hillsdale, Ontario.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Type filter tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { label: "All", value: "" },
              { label: "On the Land", value: "in-person" },
              { label: "Online", value: "online" },
            ].map(({ label, value }) => {
              const isActive = value ? searchParams.type === value : !searchParams.type;
              const href = value ? `/events?type=${value}` : "/events";
              return (
                <a
                  key={label}
                  href={href}
                  className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                    isActive
                      ? "bg-soil text-cream border-soil"
                      : "border-linen text-charcoal/60 hover:border-soil hover:text-soil"
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </div>

          {/* Tag filter */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <a
                href={searchParams.type ? `/events?type=${searchParams.type}` : "/events"}
                className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                  !searchParams.tag
                    ? "bg-soil text-cream border-soil"
                    : "border-linen text-charcoal/60 hover:border-soil hover:text-soil"
                }`}
              >
                All
              </a>
              {tags.map((tag) => {
                const tagHref = searchParams.type
                  ? `/events?type=${searchParams.type}&tag=${encodeURIComponent(tag)}`
                  : `/events?tag=${encodeURIComponent(tag)}`;
                return (
                  <a
                    key={tag}
                    href={tagHref}
                    className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                      searchParams.tag === tag
                        ? "bg-soil text-cream border-soil"
                        : "border-linen text-charcoal/60 hover:border-soil hover:text-soil"
                    }`}
                  >
                    {tag}
                  </a>
                );
              })}
            </div>
          )}

          {/* Upcoming events */}
          {upcoming.length > 0 && (
            <div className="mb-16">
              <h2 className="font-serif text-2xl text-soil mb-6">
                Upcoming Events
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcoming.map((event) => (
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
                    tags={event.tags}
                  />
                ))}
              </div>
            </div>
          )}

          {upcoming.length === 0 && (
            <div className="text-center py-20">
              <p className="text-5xl mb-6">🌿</p>
              <p className="font-serif text-xl text-soil mb-3">
                More events coming soon.
              </p>
              <p className="text-charcoal/60 mb-6">
                Sign up to be the first to hear about new events.
              </p>
              <a
                href="/#newsletter"
                className="inline-flex items-center gap-2 bg-clay text-white font-medium px-8 py-3 rounded-full hover:bg-clay/90 transition-colors text-sm"
              >
                Get notified
              </a>
            </div>
          )}

          {/* Past events */}
          {past.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl text-soil mb-6 opacity-60">
                Past Events
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                {past.map((event) => (
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
                    tags={event.tags}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
