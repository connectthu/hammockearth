import { createServerClient } from "@hammock/database";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import sanitizeHtml from "sanitize-html";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RegisterButton } from "@/components/RegisterButton";
import { WaitlistButton } from "@/components/WaitlistButton";
import { EventDetailDate } from "@/components/EventDetailDate";
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
    title: `${(data as any).title} — Hammock Earth`,
    description: (data as any).description ?? undefined,
  };
}

export const revalidate = 0;

export default async function EventDetailPage({ params }: PageProps) {
  const supabase = createServerClient();

  const [{ data: eventRaw }, { data: capacity }] = await Promise.all([
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

  if (!eventRaw) notFound();
  const event = eventRaw as any;

  const spotsRemaining = (capacity as any)?.spots_remaining ?? null;
  const isAtCapacity = spotsRemaining !== null && spotsRemaining <= 0;
  const isPast = new Date(event.start_at) < new Date();

  // Attendee count
  const { count: attendeeCount } = await supabase
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "confirmed");

  // Creator profile + collaborators (fetched in parallel)
  const [creatorResult, collaboratorsResult] = await Promise.all([
    event.created_by
      ? supabase.from("profiles").select("full_name, avatar_url").eq("id", event.created_by).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("collaborator_events")
      .select("profiles(id, full_name, avatar_url, bio, public_url)")
      .eq("event_id", event.id),
  ]);

  const creator = creatorResult.data as { full_name: string | null; avatar_url: string | null } | null;
  const collaborators = ((collaboratorsResult.data ?? []) as any[])
    .map((row) => row.profiles)
    .filter(Boolean) as { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; public_url: string | null }[];

  // Check if logged-in user has an active membership
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  let isMember = false;
  if (user) {
    const { data: membership } = await authClient
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active" as any)
      .in("membership_type", ["season_pass", "try_a_month"])
      .limit(1)
      .single();
    isMember = !!membership;
  }

  const sanitizedDescription = event.description
    ? sanitizeHtml(event.description, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h2", "h3"]),
        allowedAttributes: { a: ["href", "rel", "target"] },
      })
    : null;

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
                {event.cover_image_url ? (
                  <img
                    src={event.cover_image_url}
                    alt={event.title}
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

              {/* Collaborators */}
              {collaborators.length > 0 && (
                <div className="mt-6 pb-6 border-b border-linen">
                  <p className="text-xs text-charcoal/40 uppercase tracking-widest font-medium mb-3">
                    {collaborators.length === 1 ? "Collaborator" : "Collaborators"}
                  </p>
                  <div className="space-y-4">
                    {collaborators.map((c) => (
                      <div key={c.id} className="flex items-start gap-3">
                        {c.avatar_url ? (
                          <img
                            src={c.avatar_url}
                            alt={c.full_name ?? "Collaborator"}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-linen flex items-center justify-center flex-shrink-0 text-sm font-semibold text-charcoal/40">
                            {(c.full_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          {c.public_url ? (
                            <a
                              href={c.public_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-soil hover:text-clay transition-colors"
                            >
                              {c.full_name ?? "Collaborator"}
                            </a>
                          ) : (
                            <span className="font-medium text-soil">{c.full_name ?? "Collaborator"}</span>
                          )}
                          {c.bio && (
                            <p className="text-xs text-charcoal/50 mt-0.5 leading-relaxed">{c.bio}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendee count */}
              {(attendeeCount ?? 0) > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-medium text-charcoal/60">
                    {attendeeCount} Going
                  </p>
                </div>
              )}
            </div>

            {/* ── RIGHT column ── */}
            <div>
              {/* Title */}
              <h1 className="font-serif text-4xl sm:text-5xl text-soil leading-tight mb-6">
                {event.title}
              </h1>

              {/* Date row */}
              <EventDetailDate startAt={event.start_at} endAt={event.end_at} />

              {/* Location row */}
              <div className="flex items-center gap-4 py-5 border-b border-linen">
                <div className="w-14 h-14 flex-shrink-0 rounded-xl border border-linen bg-linen flex items-center justify-center shadow-sm">
                  {event.is_online ? (
                    <svg className="w-6 h-6 text-[#7BA7BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-soil">{event.location}</p>
                  {!event.is_online && (
                    <p className="text-xs text-charcoal/40 mt-0.5">4803 Line 2 N, Hillsdale, ON L0L 1V0</p>
                  )}
                </div>
              </div>

              {/* Registration box */}
              <div className="bg-white rounded-2xl border border-linen shadow-sm my-6 overflow-hidden">
                <div className="px-5 py-4 border-b border-linen">
                  <p className="text-sm font-medium text-charcoal/50">Get Tickets</p>
                </div>
                <div className="p-5">
                  {isPast ? (
                    <div className="flex items-center gap-4 py-2">
                      <div className="w-10 h-10 rounded-full bg-linen flex items-center justify-center text-xl flex-shrink-0">
                        📅
                      </div>
                      <div>
                        <p className="font-semibold text-soil">Past Event</p>
                        <p className="text-sm text-charcoal/50">This event has ended</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-5">
                        <p className="text-3xl font-bold text-soil">{formatPrice(event.price_cents)}</p>
                        {event.member_price_cents > 0 && event.member_price_cents < event.price_cents && (
                          <p className="text-sm text-moss font-medium mt-1">
                            Members: {formatPrice(event.member_price_cents)}
                          </p>
                        )}
                      </div>

                      {event.registration_url ? (
                        <a
                          href={event.registration_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-clay text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-clay/90 transition-colors"
                        >
                          Register Now
                        </a>
                      ) : event.registration_note ? (
                        <div className="text-center py-3 px-4 bg-linen rounded-xl">
                          <p className="text-sm text-charcoal/60 italic">{event.registration_note}</p>
                        </div>
                      ) : isAtCapacity ? (
                        <WaitlistButton event={event} />
                      ) : (
                        <RegisterButton event={event} spotsRemaining={spotsRemaining} />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* About this event */}
              {sanitizedDescription && (
                <div className="mb-8">
                  <h2 className="text-xs font-semibold text-charcoal/40 uppercase tracking-widest mb-4">
                    About this event
                  </h2>
                  <div className="border-t border-linen pt-4">
                    <div
                      className="prose prose-stone max-w-none text-charcoal/80 prose-headings:font-serif prose-headings:text-soil prose-a:text-clay prose-strong:text-soil"
                      dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                    />
                  </div>
                </div>
              )}

              {/* Confirmation details (online event instructions etc.) */}
              {event.confirmation_details && (
                <div className="mb-8 p-5 bg-linen rounded-2xl border border-linen/80">
                  <p className="text-xs font-semibold text-charcoal/40 uppercase tracking-widest mb-3">
                    What to expect
                  </p>
                  <div
                    className="prose prose-stone max-w-none text-sm prose-a:text-clay"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(event.confirmation_details, {
                        allowedTags: sanitizeHtml.defaults.allowedTags,
                        allowedAttributes: { a: ["href", "rel", "target"] },
                      }),
                    }}
                  />
                </div>
              )}

              {/* Tags */}
              {event.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string) => (
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
