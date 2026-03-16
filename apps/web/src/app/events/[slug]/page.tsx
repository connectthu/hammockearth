import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CalendarExportButton } from "@hammock/ui";
import { RegisterButton } from "@/components/RegisterButton";
import { WaitlistButton } from "@/components/WaitlistButton";
import { EventDateTime } from "@/components/EventDateTime";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("events")
    .select("title, description")
    .eq("slug", params.slug)
    .single();

  if (!data) return { title: "Event — Hammock Earth" };

  return {
    title: `${data.title} — Hammock Earth`,
    description: data.description ?? undefined,
  };
}

export const runtime = "edge";
export const revalidate = 0;

export default async function EventDetailPage({ params }: PageProps) {
  const supabase = createServerClient();

  const [{ data: event }, { data: capacity }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .single(),
    supabase
      .from("event_capacity")
      .select("spots_remaining")
      .eq("slug", params.slug)
      .single(),
  ]);

  if (!event) notFound();

  const spotsRemaining = capacity?.spots_remaining ?? null;
  const isAtCapacity = spotsRemaining !== null && spotsRemaining <= 0;

  const formatPrice = (cents: number) =>
    `$${(cents / 100).toFixed(0)} CAD`;

  return (
    <>
      <Nav />
      <main className="pt-16">
        {/* Hero image */}
        {event.cover_image_url ? (
          <div className="w-full h-72 sm:h-96 overflow-hidden">
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-linen flex items-center justify-center">
            <span className="text-6xl">🌿</span>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                {event.event_type && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-linen text-moss uppercase tracking-wide">
                    {event.event_type}
                  </span>
                )}
                {event.is_online && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-moss/10 text-moss uppercase tracking-wide">
                    Online
                  </span>
                )}
                {event.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full border border-linen text-charcoal/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl text-soil mb-6 leading-snug">
                {event.title}
              </h1>

              {event.description && (
                <div className="prose prose-stone max-w-none">
                  <p className="text-charcoal/80 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-linen rounded-2xl p-6 sticky top-24 space-y-4">
                {/* Date & time */}
                <div>
                  <p className="text-xs uppercase tracking-wide text-moss font-medium mb-1">
                    When
                  </p>
                  <EventDateTime startAt={event.start_at} endAt={event.end_at} />
                </div>

                {/* Location */}
                <div>
                  <p className="text-xs uppercase tracking-wide text-moss font-medium mb-1">
                    Where
                  </p>
                  <p className="text-charcoal/80 text-sm">{event.location}</p>
                  {!event.is_online && (
                    <p className="text-charcoal/50 text-xs mt-1">
                      Exact address shared upon registration
                    </p>
                  )}
                </div>

                {/* Pricing */}
                <div>
                  <p className="text-xs uppercase tracking-wide text-moss font-medium mb-1">
                    Pricing
                  </p>
                  <div className="space-y-1">
                    <p className="text-soil font-semibold">
                      {formatPrice(event.price_cents)}
                    </p>
                    <p className="text-charcoal/60 text-sm">
                      Members: {formatPrice(event.member_price_cents)}
                    </p>
                  </div>
                </div>

                {/* CTA — priority order */}
                {event.registration_url ? (
                  // 1. External payment URL (Wave, Eventbrite, partner events)
                  <a
                    href={event.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors"
                  >
                    Register Now
                  </a>
                ) : event.registration_note ? (
                  // 2. Custom note (e.g. "Contact us to register")
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-sm text-charcoal/60 italic">
                      {event.registration_note}
                    </p>
                  </div>
                ) : isAtCapacity ? (
                  // 3. Waitlist (event full)
                  <WaitlistButton event={event} />
                ) : (
                  // 4. Stripe registration modal
                  <RegisterButton event={event} spotsRemaining={spotsRemaining} />
                )}

                {/* Calendar export — always shown */}
                <CalendarExportButton event={event} />

                <div className="border-t border-linen/80 pt-4">
                  <p className="text-xs text-charcoal/50 text-center">
                    Questions?{" "}
                    <a
                      href="mailto:hello@hammock.earth"
                      className="text-clay hover:underline"
                    >
                      hello@hammock.earth
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
