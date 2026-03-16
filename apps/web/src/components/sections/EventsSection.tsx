import { createServerClient } from "@hammock/database";
import { EventCard } from "@hammock/ui";

async function getUpcomingEvents() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("visibility", "public")
      .eq("is_online", false)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(7);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function EventsSection() {
  const events = await getUpcomingEvents();

  return (
    <section id="events" className="py-24 bg-linen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="section-label mb-4">On the Land</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-soil mb-4">
            Events & Workshops
          </h2>
          <p className="text-charcoal/70 max-w-2xl mx-auto">
            Seasonal gatherings, farm tours, communal meals, and immersive
            workshops at Hammock Hills in Hillsdale, Ontario.
          </p>
        </div>

        {events.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {events.slice(0, 6).map((event) => (
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
        ) : (
          <div className="text-center py-16 text-charcoal/50">
            <p className="text-lg">New events coming soon.</p>
          </div>
        )}

        <div className="text-center">
          <a
            href="/events"
            className="inline-flex items-center gap-2 text-clay font-medium hover:text-clay/80 transition-colors"
          >
            View all events
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>

        <p className="text-center mt-6 text-sm text-charcoal/50">
          <a href="/#newsletter" className="text-moss hover:underline">
            Get notified about upcoming events →
          </a>
        </p>
      </div>
    </section>
  );
}
