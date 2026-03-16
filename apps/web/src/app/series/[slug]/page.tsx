import { createServerClient } from "@hammock/database";
import sanitizeHtml from "sanitize-html";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SeriesRegisterButton } from "@/components/SeriesRegisterButton";
import { EventDateTime } from "@/components/EventDateTime";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("event_series")
    .select("title, description")
    .eq("slug", params.slug)
    .single();

  if (!data) return { title: "Program — Hammock Earth" };

  return {
    title: `${data.title} — Hammock Earth`,
    description: data.description ?? undefined,
  };
}

export const revalidate = 0;

export default async function SeriesDetailPage({ params }: PageProps) {
  const supabase = createServerClient();

  const { data: series } = await supabase
    .from("event_series")
    .select("*, event_series_sessions(*)")
    .eq("slug", params.slug)
    .eq("status", "published")
    .single();

  if (!series) notFound();

  const sessions = [...(series.event_series_sessions ?? [])].sort(
    (a: any, b: any) => a.session_number - b.session_number
  );

  const sanitizedDescription = series.description
    ? sanitizeHtml(series.description, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, "*": ["class"] },
      })
    : null;

  const firstSession = sessions[0];

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(0)}`;
  }

  return (
    <>
      <Nav />
      <main className="pt-16">
        {/* Cover */}
        {series.cover_image_url ? (
          <div className="w-full h-64 sm:h-80 overflow-hidden">
            <img
              src={series.cover_image_url}
              alt={series.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-linen flex items-center justify-center">
            <span className="text-6xl">🌿</span>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#7BA7BC]/10 text-[#5a8da3] uppercase tracking-wide">
                  Online Program
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl text-soil mb-4 leading-snug">
                {series.title}
              </h1>

              {sanitizedDescription && (
                <div
                  className="prose prose-stone max-w-none mb-10"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              )}

              {/* Session schedule */}
              {sessions.length > 0 && (
                <div className="mb-10">
                  <h2 className="font-serif text-2xl text-soil mb-4">
                    Session Schedule
                  </h2>
                  <div className="space-y-3">
                    {sessions.map((session: any) => (
                      <div
                        key={session.id}
                        className="flex items-start gap-4 p-4 bg-linen rounded-xl"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#7BA7BC]/10 text-[#5a8da3] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {session.session_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          {session.title && (
                            <p className="font-medium text-soil text-sm mb-0.5">
                              {session.title}
                            </p>
                          )}
                          <EventDateTime
                            startAt={session.start_at}
                            endAt={session.end_at}
                          />
                          <p className="text-xs text-charcoal/40 mt-0.5">
                            {session.meeting_url
                              ? "Meeting link available"
                              : "Link shared upon registration"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-linen rounded-2xl p-6 sticky top-24">
                <div className="mb-4 pb-4 border-b border-linen/80">
                  <p className="text-xs text-charcoal/50 uppercase tracking-wide mb-1">
                    Duration
                  </p>
                  <p className="font-medium text-soil">
                    {series.duration_weeks} weeks · {series.session_count} sessions
                  </p>
                  {firstSession && (
                    <p className="text-sm text-charcoal/60 mt-1">
                      Starts{" "}
                      <EventDateTime startAt={firstSession.start_at} />
                    </p>
                  )}
                </div>

                <div className="mb-6 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-charcoal/60">Full series</span>
                    <span className="text-xl font-semibold text-soil">
                      {formatPrice(series.price_cents)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-charcoal/60">Members</span>
                    <span className="text-sm font-medium text-moss">
                      {formatPrice(series.member_price_cents)}
                    </span>
                  </div>
                  {series.drop_in_enabled && series.drop_in_price_cents != null && (
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-sm text-charcoal/60">Drop-in / session</span>
                      <span className="text-sm text-charcoal/60">
                        {formatPrice(series.drop_in_price_cents)}
                      </span>
                    </div>
                  )}
                </div>

                <SeriesRegisterButton
                  series={{
                    id: series.id,
                    slug: series.slug,
                    title: series.title,
                    price_cents: series.price_cents,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
