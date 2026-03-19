import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { MemberSidebar } from "@/components/MemberSidebar";
import DashboardProgramsClient from "../dashboard/DashboardProgramsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Programs — Hammock Earth",
};

export const revalidate = 0;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Toronto",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/Toronto",
  });
}

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `CA$${(cents / 100).toFixed(2)}`;
}

export default async function MemberProgramsPage() {
  const authSupabase = createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/members/login?next=/members/programs");
  }

  const db = createServerClient();

  // Fetch programs (full_series registrations + access grants)
  const { data: regRows } = await db
    .from("event_registrations")
    .select("series_id")
    .eq("user_id", user.id)
    .eq("registration_type", "full_series" as any)
    .eq("status", "confirmed");

  const { data: grantRows } = await db
    .from("series_video_access_grants" as any)
    .select("series_id")
    .eq("user_id", user.id);

  const seriesIds = [
    ...new Set([
      ...((regRows as any[]) ?? []).map((r: any) => r.series_id).filter(Boolean),
      ...((grantRows as any[]) ?? []).map((r: any) => r.series_id).filter(Boolean),
    ]),
  ];

  const { data: myProgramsRaw } =
    seriesIds.length > 0
      ? await db
          .from("event_series")
          .select(
            `id, title, slug, cover_image_url, status,
            event_series_sessions (
              id, session_number, title, start_at, end_at, status,
              session_videos (id, title, video_type, bunny_url, duration_minutes, display_order, is_published)
            )`
          )
          .in("id", seriesIds)
      : { data: [] };

  const myPrograms = (myProgramsRaw as any[]) ?? [];

  // Fetch upcoming published events
  const { data: eventsData } = await db
    .from("events")
    .select("id, slug, title, start_at, end_at, location, price_cents, member_price_cents, visibility, cover_image_url")
    .eq("status", "published")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(20);
  const events = (eventsData as any[]) ?? [];

  return (
    <>
      <Nav />
      <div className="pt-16 min-h-screen bg-cream flex">
        <MemberSidebar />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

            {/* Programs section */}
            {myPrograms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-linen p-10 text-center mb-8">
                <div className="text-3xl mb-3">🎥</div>
                <h2 className="font-serif text-xl text-soil mb-2">Your Programs</h2>
                <p className="text-charcoal/60 mb-4">
                  You're not enrolled in any programs yet.
                </p>
                <Link href="/series" className="text-sm font-medium text-clay hover:underline">
                  Browse upcoming series →
                </Link>
              </div>
            ) : (
              <div className="mb-8">
                <DashboardProgramsClient myPrograms={myPrograms} />
              </div>
            )}

            {/* Upcoming Events */}
            <div>
              <h2 className="font-serif text-xl text-soil mb-4">Upcoming Events</h2>

              {events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-linen p-8 text-center text-charcoal/50">
                  No upcoming events right now. Check back soon.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event: any) => {
                    const isMembersOnly = event.visibility === "members_only";
                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.slug}`}
                        className="block bg-white rounded-2xl border border-linen p-5 hover:border-clay/30 transition-colors group"
                      >
                        <div className="flex gap-4">
                          {event.cover_image_url ? (
                            <img
                              src={event.cover_image_url}
                              alt={event.title}
                              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-linen flex items-center justify-center flex-shrink-0 text-2xl">
                              🌿
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-medium text-soil group-hover:text-clay transition-colors leading-snug">
                                {event.title}
                              </h3>
                              {isMembersOnly && (
                                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-clay/10 text-clay border border-clay/20">
                                  Members Only
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-charcoal/50 mb-1">
                              {formatDate(event.start_at)} · {formatTime(event.start_at)}
                            </p>
                            <p className="text-xs text-charcoal/50 mb-2">
                              {event.location}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-soil">
                                {formatPrice(event.price_cents)}
                              </span>
                              {event.member_price_cents !== null &&
                                event.member_price_cents < event.price_cents && (
                                  <span className="text-xs text-moss font-medium">
                                    Members: {formatPrice(event.member_price_cents)}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
