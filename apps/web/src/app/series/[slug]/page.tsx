import { createServerClient } from "@hammock/database";
import sanitizeHtml from "sanitize-html";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SeriesRegisterButton } from "@/components/SeriesRegisterButton";
import { EventDetailDate } from "@/components/EventDetailDate";
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
    title: `${(data as any).title} — Hammock Earth`,
    description: (data as any).description ?? undefined,
  };
}

export const revalidate = 0;

export default async function SeriesDetailPage({ params }: PageProps) {
  const supabase = createServerClient();

  const { data: seriesRaw } = await supabase
    .from("event_series")
    .select("*, event_series_sessions(*)")
    .eq("slug", params.slug)
    .eq("status", "published")
    .single();

  if (!seriesRaw) notFound();
  const series = seriesRaw as any;

  const sessions = [...(series.event_series_sessions ?? [])].sort(
    (a: any, b: any) => a.session_number - b.session_number
  );
  const firstSession = sessions[0];

  // Attendee count
  const { count: attendeeCount } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("series_id", series.id)
    .eq("status", "confirmed");

  // Creator profile
  let creator: { full_name: string | null; avatar_url: string | null } | null = null;
  if (series.created_by) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", series.created_by)
      .single();
    creator = profile as any;
  }

  const sanitizedDescription = series.description
    ? sanitizeHtml(series.description, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h2", "h3"]),
        allowedAttributes: { a: ["href", "rel", "target"] },
      })
    : null;

  const isPast = firstSession
    ? new Date(firstSession.start_at) < new Date()
    : false;
  const allSessionsPast = sessions.every(
    (s: any) => new Date(s.start_at) < new Date()
  );

  function formatPrice(cents: number) {
    if (cents === 0) return "Free";
    return `CA$${(cents / 100).toFixed(2)}`;
  }

  return (
    <>
      <Nav />
      <main className="pt-16 bg-cream min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-[2fr_3fr] gap-10 lg:gap-14 items-start">

            {/* ── LEFT column ── */}
            <div>
              {/* Square cover image */}
              <div className="aspect-square w-full rounded-2xl overflow-hidden bg-linen flex items-center justify-center shadow-sm">
                {series.cover_image_url ? (
                  <img
                    src={series.cover_image_url}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-7xl">🌿</span>
                )}
              </div>

              {/* Hosted By */}
              <div className="mt-8 pb-6 border-b border-linen">
                <p className="text-xs text-charcoal/40 uppercase tracking-widest font-medium mb-3">
                  Hosted By
                </p>
                <div className="flex items-center gap-3">
                  {creator?.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.full_name ?? "Host"}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-linen flex items-center justify-center overflow-hidden border border-linen">
                      <img src="/logo.svg" alt="Hammock Earth" className="w-6 h-6 object-contain" />
                    </div>
                  )}
                  <span className="font-medium text-soil">
                    {creator?.full_name ?? "Hammock Earth"}
                  </span>
                </div>
              </div>

              {/* Attendee count */}
              {(attendeeCount ?? 0) > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-medium text-charcoal/60">
                    {attendeeCount} Registered
                  </p>
                </div>
              )}
            </div>

            {/* ── RIGHT column ── */}
            <div>
              {/* Program badge */}
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-[#7BA7BC]/10 text-[#5a8da3] uppercase tracking-wide mb-4">
                {series.duration_weeks}-week program · {series.session_count} sessions
              </span>

              {/* Title */}
              <h1 className="font-serif text-4xl sm:text-5xl text-soil leading-tight mb-6">
                {series.title}
              </h1>

              {/* First session date */}
              {firstSession && (
                <EventDetailDate startAt={firstSession.start_at} endAt={firstSession.end_at} />
              )}

              {/* Location row */}
              <div className="flex items-center gap-4 py-5 border-b border-linen">
                <div className="w-14 h-14 flex-shrink-0 rounded-xl border border-linen bg-linen flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-[#7BA7BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-soil">Online</p>
                  <p className="text-xs text-charcoal/40 mt-0.5">Meeting links shared upon registration</p>
                </div>
              </div>

              {/* Registration box */}
              <div className="bg-white rounded-2xl border border-linen shadow-sm my-6 overflow-hidden">
                <div className="px-5 py-4 border-b border-linen">
                  <p className="text-sm font-medium text-charcoal/50">Register</p>
                </div>
                <div className="p-5">
                  {allSessionsPast ? (
                    <div className="flex items-center gap-4 py-2">
                      <div className="w-10 h-10 rounded-full bg-linen flex items-center justify-center text-xl flex-shrink-0">
                        📅
                      </div>
                      <div>
                        <p className="font-semibold text-soil">Program Ended</p>
                        <p className="text-sm text-charcoal/50">This program has concluded</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-5 space-y-1.5">
                        <div>
                          <p className="text-3xl font-bold text-soil">{formatPrice(series.price_cents)}</p>
                          <p className="text-xs text-charcoal/40 mt-0.5">Full series</p>
                        </div>
                        {series.member_price_cents < series.price_cents && (
                          <p className="text-sm text-moss font-medium">
                            Members: {formatPrice(series.member_price_cents)}
                          </p>
                        )}
                        {series.drop_in_enabled && series.drop_in_price_cents != null && (
                          <p className="text-sm text-charcoal/50">
                            Drop-in per session: {formatPrice(series.drop_in_price_cents)}
                          </p>
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
                    </>
                  )}
                </div>
              </div>

              {/* About */}
              {sanitizedDescription && (
                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-charcoal/40 uppercase tracking-widest mb-4">
                    About this program
                  </h2>
                  <div className="border-t border-linen pt-4">
                    <div
                      className="prose prose-stone max-w-none text-charcoal/80 prose-headings:font-serif prose-headings:text-soil prose-a:text-clay"
                      dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                    />
                  </div>
                </div>
              )}

              {/* Session schedule */}
              {sessions.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-charcoal/40 uppercase tracking-widest mb-4">
                    Session Schedule
                  </h2>
                  <div className="border-t border-linen pt-4 space-y-3">
                    {sessions.map((session: any) => {
                      const sessionPast = new Date(session.start_at) < new Date();
                      return (
                        <div
                          key={session.id}
                          className={`flex items-start gap-4 p-4 bg-white rounded-2xl border border-linen ${sessionPast ? "opacity-50" : ""}`}
                        >
                          <div className="w-9 h-9 rounded-full bg-[#7BA7BC]/10 text-[#5a8da3] flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {session.session_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            {session.title && (
                              <p className="font-semibold text-soil text-sm mb-1">{session.title}</p>
                            )}
                            <EventDateTime startAt={session.start_at} endAt={session.end_at} />
                            <p className="text-xs text-charcoal/40 mt-1">
                              {session.meeting_url ? (
                                <span className="text-[#7BA7BC]">Link available</span>
                              ) : (
                                "Link shared upon registration"
                              )}
                            </p>
                          </div>
                          {series.drop_in_enabled && series.drop_in_price_cents != null && !sessionPast && (
                            <div className="flex-shrink-0">
                              <span className="text-xs font-medium text-charcoal/40 block text-right">Drop-in</span>
                              <span className="text-sm font-semibold text-soil">{formatPrice(series.drop_in_price_cents)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tags */}
              {series.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {series.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1.5 rounded-full border border-linen text-charcoal/50 bg-white"
                    >
                      # {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
